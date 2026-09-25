import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import {
  StudentProfileApiService,
  type LearnerProfileApi,
  type TopicProgressApi,
} from "../../core/students/student-profile-api.service";
import type { SheetStatus } from "../../core/models/sheets.models";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import { EvaluateSheetDrawerComponent } from "./evaluate-sheet-drawer/evaluate-sheet-drawer.component";

@Component({
  selector: "app-sheets",
  imports: [TranslatePipe, ProgressBarComponent, EvaluateSheetDrawerComponent],
  templateUrl: "./sheets.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetsComponent {
  readonly session = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  private readonly api = inject(StudentProfileApiService);
  readonly statuses: SheetStatus[] = [
    "not_started",
    "in_progress",
    "ready",
    "presented",
    "validated",
    "rework",
  ];
  readonly students = signal<LearnerProfileApi[]>([]);
  readonly selectedEnrollmentId = signal("");
  readonly selectedStudent = computed(
    () =>
      this.students().find(
        (x) => x.enrollmentId === this.selectedEnrollmentId(),
      ) ?? null,
  );
  readonly topics = signal<TopicProgressApi[]>([]);
  readonly rosterLoading = signal(false);
  readonly topicsLoading = signal(false);
  readonly rosterError = signal(false);
  readonly topicsError = signal(false);
  readonly query = signal("");
  readonly statusFilter = signal<"all" | SheetStatus>("all");
  readonly evaluationOpen = signal(false);
  readonly isStudent = computed(() => this.session.role() === "stagiaire");
  readonly canEvaluate = computed(() =>
    ["direction", "formateur"].includes(this.session.role()),
  );

  readonly filteredTopics = computed(() => {
    const term = this.query().trim().toLocaleLowerCase();
    const status = this.statusFilter();
    return this.topics().filter(
      (x) =>
        (!term ||
          x.title.toLocaleLowerCase().includes(term) ||
          x.code.toLocaleLowerCase().includes(term) ||
          String(x.number ?? "") === term) &&
        (status === "all" || x.status === status),
    );
  });
  readonly counts = computed(
    () =>
      Object.fromEntries(
        this.statuses.map((status) => [
          status,
          this.topics().filter((x) => x.status === status).length,
        ]),
      ) as Record<SheetStatus, number>,
  );
  readonly preparedCount = computed(
    () =>
      this.topics().filter(
        (x) =>
          !!x.preparationDate ||
          ["ready", "presented", "validated", "rework"].includes(x.status),
      ).length,
  );
  readonly presentedCount = computed(
    () => this.topics().filter((x) => !!x.presentationDate).length,
  );
  readonly validatedCount = computed(() => this.counts().validated);
  readonly reworkCount = computed(() => this.counts().rework);
  readonly preparedProgress = computed(() =>
    this.topics().length
      ? (100 * this.preparedCount()) / this.topics().length
      : 0,
  );

  private rosterGeneration = 0;
  private topicsGeneration = 0;

  constructor() {
    effect((onCleanup) => {
      const user = this.session.session();
      const cohort = this.workspace.cohort();
      const loaded = this.workspace.remoteWorkspaceLoaded();
      const generation = ++this.rosterGeneration;
      this.students.set([]);
      this.selectedEnrollmentId.set("");
      this.rosterLoading.set(false);
      this.rosterError.set(false);
      this.evaluationOpen.set(false);
      if (user && loaded) {
        this.rosterLoading.set(true);
        if (user.role === "stagiaire") void this.loadSelf(generation);
        else if (cohort?.apiId) void this.loadRoster(cohort.apiId, generation);
        else this.rosterLoading.set(false);
      }
      onCleanup(() => {
        this.rosterGeneration++;
      });
    });
    effect((onCleanup) => {
      const id = this.selectedEnrollmentId();
      const generation = ++this.topicsGeneration;
      this.topics.set([]);
      this.topicsError.set(false);
      this.topicsLoading.set(false);
      if (id) {
        this.topicsLoading.set(true);
        void this.loadTopics(id, generation);
      }
      onCleanup(() => {
        this.topicsGeneration++;
      });
    });
  }

  private async loadSelf(generation: number): Promise<void> {
    try {
      const student = await firstValueFrom(this.api.self());
      if (generation !== this.rosterGeneration) return;
      this.students.set([student]);
      this.selectedEnrollmentId.set(student.enrollmentId);
    } catch {
      if (generation === this.rosterGeneration) this.rosterError.set(true);
    } finally {
      if (generation === this.rosterGeneration) this.rosterLoading.set(false);
    }
  }
  private async loadRoster(
    cohortId: string,
    generation: number,
  ): Promise<void> {
    try {
      const students = await firstValueFrom(this.api.cohortLearners(cohortId));
      if (generation !== this.rosterGeneration) return;
      this.students.set(students);
      this.selectedEnrollmentId.set(students[0]?.enrollmentId ?? "");
    } catch {
      if (generation === this.rosterGeneration) this.rosterError.set(true);
    } finally {
      if (generation === this.rosterGeneration) this.rosterLoading.set(false);
    }
  }
  private async loadTopics(id: string, generation: number): Promise<void> {
    try {
      const rows = await firstValueFrom(this.api.topics(id));
      if (generation === this.topicsGeneration) this.topics.set(rows);
    } catch {
      if (generation === this.topicsGeneration) this.topicsError.set(true);
    } finally {
      if (generation === this.topicsGeneration) this.topicsLoading.set(false);
    }
  }

  updateStudent(event: Event): void {
    this.evaluationOpen.set(false);
    this.selectedEnrollmentId.set((event.target as HTMLSelectElement).value);
  }
  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  updateStatus(event: Event): void {
    this.statusFilter.set(
      (event.target as HTMLSelectElement).value as "all" | SheetStatus,
    );
  }
  statusLabel(status: string): string {
    return this.statuses.includes(status as SheetStatus)
      ? "sheets.status." + status
      : "sheets.real.unknownStatus";
  }
  formatDate(value: string | null): string {
    if (!value) return "—";
    const date = new Date(value + "T12:00:00");
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat(undefined, { dateStyle: "short" }).format(date);
  }
  onEvaluationSaved(row: TopicProgressApi): void {
    if (this.selectedEnrollmentId()) {
      this.topics.update((rows) =>
        rows.map((x) => (x.topicId === row.topicId ? row : x)),
      );
      this.evaluationOpen.set(false);
      const generation = ++this.topicsGeneration;
      void this.loadTopics(this.selectedEnrollmentId(), generation);
    }
  }
}
