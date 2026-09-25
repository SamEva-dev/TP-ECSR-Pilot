import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import type { WritableSignal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import type { Observable } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { SessionService } from "../../../core/session/session.service";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";
import {
  StudentProfileApiService,
  type LearnerProfileApi,
  type TopicProgressApi,
  type CompetencyProgressApi,
  type DrivingEvaluationApi,
  type WorkplacePeriodApi,
} from "../../../core/students/student-profile-api.service";

type Section = "topics" | "competencies" | "driving" | "periods";
type SectionStatus = "loading" | "ready" | "error";
const EMPTY_STATES: Record<Section, SectionStatus> = {
  topics: "loading",
  competencies: "loading",
  driving: "loading",
  periods: "loading",
};

@Component({
  selector: "app-student-detail",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./student-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(StudentProfileApiService);
  readonly session = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly requestedId = computed(() => this.routeParams().get("id") ?? "");
  readonly selfView = computed(() => this.session.role() === "stagiaire");
  readonly profile = signal<LearnerProfileApi | null>(null);
  readonly topics = signal<TopicProgressApi[]>([]);
  readonly competencies = signal<CompetencyProgressApi[]>([]);
  readonly driving = signal<DrivingEvaluationApi[]>([]);
  readonly periods = signal<WorkplacePeriodApi[]>([]);
  readonly sectionStatus = signal<Record<Section, SectionStatus>>({
    ...EMPTY_STATES,
  });
  readonly loading = signal(true);
  readonly error = signal("");
  readonly selectedTab = signal<"overview" | Section>("overview");
  readonly cohortName = computed(() => {
    const id = this.profile()?.cohortId;
    return id ? this.workspace.cohortNameByApiId(id) : null;
  });
  readonly evaluatedCompetencies = computed(
    () =>
      this.competencies().filter(
        (item) =>
          item.level.toLowerCase() !== "notassessed" &&
          item.level.toLowerCase() !== "not_assessed",
      ).length,
  );
  readonly presentedTopics = computed(
    () =>
      this.topics().filter((item) =>
        ["presented", "validated"].includes(item.status.toLowerCase()),
      ).length,
  );

  private generation = 0;
  constructor() {
    effect((onCleanup) => {
      const id = this.requestedId();
      const self = this.selfView();
      void this.load(id, self);
      onCleanup(() => this.generation++);
    });
  }

  private async load(id: string, self: boolean): Promise<void> {
    const generation = ++this.generation;
    this.profile.set(null);
    this.topics.set([]);
    this.competencies.set([]);
    this.driving.set([]);
    this.periods.set([]);
    this.sectionStatus.set({ ...EMPTY_STATES });
    this.loading.set(true);
    this.error.set("");
    if (!self && !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) {
      this.error.set("studentDetail.real.invalidId");
      this.loading.set(false);
      return;
    }
    try {
      const profile = await firstValueFrom(
        self ? this.api.self() : this.api.enrollment(id),
      );
      if (generation !== this.generation) return;
      this.profile.set(profile);
      this.loading.set(false);
      const enrollmentId = profile.enrollmentId;
      await Promise.all([
        this.loadSection(
          "topics",
          this.api.topics(enrollmentId),
          this.topics,
          generation,
        ),
        this.loadSection(
          "competencies",
          this.api.competencies(enrollmentId),
          this.competencies,
          generation,
        ),
        this.loadSection(
          "driving",
          this.api.driving(enrollmentId),
          this.driving,
          generation,
        ),
        this.loadSection(
          "periods",
          this.api.periods(enrollmentId),
          this.periods,
          generation,
        ),
      ]);
    } catch (error) {
      if (generation !== this.generation) return;
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? error.status
          : 0;
      this.error.set(
        status === 403
          ? "studentDetail.real.forbidden"
          : status === 404
            ? "studentDetail.real.notFound"
            : "studentDetail.real.failed",
      );
      this.loading.set(false);
    }
  }

  private async loadSection<T>(
    name: Section,
    query: Observable<T[]>,
    target: WritableSignal<T[]>,
    generation: number,
  ): Promise<void> {
    try {
      const rows = await firstValueFrom(query);
      if (generation !== this.generation) return;
      target.set(rows);
      this.sectionStatus.update((state) => ({ ...state, [name]: "ready" }));
    } catch {
      if (generation !== this.generation) return;
      this.sectionStatus.update((state) => ({ ...state, [name]: "error" }));
    }
  }

  initials(): string {
    const profile = this.profile();
    return profile
      ? `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase()
      : "--";
  }
  formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  }
}
