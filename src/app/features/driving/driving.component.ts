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
  TrainingDeliveryApiService,
  type TrainingSessionApi,
} from "../../core/training-delivery/training-delivery-api.service";
import {
  StudentProfileApiService,
  type CompetencyDefinitionApi,
  type DrivingEvaluationApi,
  type LearnerProfileApi,
  type RecordDrivingEvaluationApiRequest,
} from "../../core/students/student-profile-api.service";

type Level = "not_assessed" | "in_progress" | "rework" | "acquired";

@Component({
  selector: "app-driving",
  imports: [TranslatePipe],
  templateUrl: "./driving.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrivingComponent {
  readonly session = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  private readonly api = inject(StudentProfileApiService);
  private readonly sessionsApi = inject(TrainingDeliveryApiService);
  readonly isStudent = computed(() => this.session.role() === "stagiaire");
  readonly canEdit = computed(() =>
    ["direction", "formateur"].includes(this.session.role()),
  );
  readonly students = signal<LearnerProfileApi[]>([]);
  readonly definitions = signal<CompetencyDefinitionApi[]>([]);
  readonly selectedEnrollmentId = signal("");
  readonly selectedDefinitionId = signal("");
  readonly history = signal<DrivingEvaluationApi[]>([]);
  readonly sessions = signal<TrainingSessionApi[]>([]);
  readonly selectedSessionId = signal("");
  readonly sessionsError = signal(false);
  readonly levels: Level[] = [
    "not_assessed",
    "in_progress",
    "rework",
    "acquired",
  ];
  readonly evaluation = signal<Record<string, Level>>({});
  readonly subject = signal("");
  readonly positive = signal("");
  readonly difficulty = signal("");
  readonly nextGoal = signal("");
  readonly freeObservation = signal("");
  readonly rosterLoading = signal(false);
  readonly rosterError = signal(false);
  readonly definitionsError = signal(false);
  readonly historyLoading = signal(false);
  readonly historyError = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal(false);
  readonly saved = signal(false);
  readonly selectedStudent = computed(
    () =>
      this.students().find(
        (x) => x.enrollmentId === this.selectedEnrollmentId(),
      ) ?? null,
  );
  readonly eligibleSessions = computed(() =>
    this.sessions().filter(
      (x) =>
        x.type === "driving" &&
        x.status !== "cancelled" &&
        new Date(x.startsAtUtc).getTime() <= Date.now() &&
        (x.audienceMode !== "selected-enrollments" ||
          x.participantEnrollmentIds.includes(this.selectedEnrollmentId())),
    ),
  );
  readonly competencyGroups = computed(() => {
    const defs = this.definitions();
    const ids = new Set(defs.map((x) => x.id));
    return defs.filter((x) => !x.parentId || !ids.has(x.parentId));
  });
  readonly selectedDefinition = computed(
    () =>
      this.competencyGroups().find(
        (x) => x.id === this.selectedDefinitionId(),
      ) ?? null,
  );
  readonly criteria = computed(() => {
    const parent = this.selectedDefinition();
    if (!parent) return [];
    const children = this.definitions().filter((x) => x.parentId === parent.id);
    return children.length ? children : [parent];
  });
  readonly latestHistory = computed(() => this.history()[0] ?? null);
  readonly valid = computed(
    () =>
      !!this.selectedEnrollmentId() &&
      !!this.selectedDefinition() &&
      !!this.subject().trim() &&
      this.criteria().length > 0 &&
      this.criteria().every((x) => !!this.evaluation()[x.code]),
  );
  private rosterGeneration = 0;
  private historyGeneration = 0;

  constructor() {
    effect((onCleanup) => {
      const user = this.session.session();
      const cohort = this.workspace.cohort();
      const loaded = this.workspace.remoteWorkspaceLoaded();
      const generation = ++this.rosterGeneration;
      this.students.set([]);
      this.definitions.set([]);
      this.sessions.set([]);
      this.selectedSessionId.set("");
      this.sessionsError.set(false);
      this.selectedEnrollmentId.set("");
      this.selectedDefinitionId.set("");
      this.evaluation.set({});
      this.rosterLoading.set(false);
      this.rosterError.set(false);
      this.definitionsError.set(false);
      this.saved.set(false);
      this.saveError.set(false);
      if (user && loaded) {
        this.rosterLoading.set(true);
        if (user.role === "stagiaire") void this.loadSelf(generation);
        else if (cohort?.apiId)
          void this.loadCohort(
            cohort.apiId,
            cohort.referentialVersionId ?? "",
            generation,
          );
        else this.rosterLoading.set(false);
      }
      onCleanup(() => {
        this.rosterGeneration++;
      });
    });
    effect((onCleanup) => {
      const id = this.selectedEnrollmentId();
      const generation = ++this.historyGeneration;
      this.history.set([]);
      this.selectedSessionId.set("");
      this.historyError.set(false);
      this.historyLoading.set(false);
      this.saved.set(false);
      this.saveError.set(false);
      if (id) {
        this.historyLoading.set(true);
        void this.loadHistory(id, generation);
      }
      onCleanup(() => {
        this.historyGeneration++;
      });
    });
  }

  private async loadSelf(generation: number): Promise<void> {
    try {
      const profile = await firstValueFrom(this.api.self());
      if (generation !== this.rosterGeneration) return;
      this.students.set([profile]);
      this.selectedEnrollmentId.set(profile.enrollmentId);
      const version = this.workspace.cohortReferentialVersionByApiId(
        profile.cohortId,
      );
      if (version) await this.loadDefinitions(version, generation);
      else this.definitionsError.set(true);
    } catch {
      if (generation === this.rosterGeneration) this.rosterError.set(true);
    } finally {
      if (generation === this.rosterGeneration) this.rosterLoading.set(false);
    }
  }
  private async loadCohort(
    cohortId: string,
    version: string,
    generation: number,
  ): Promise<void> {
    try {
      const rows = await firstValueFrom(this.api.cohortLearners(cohortId));
      if (generation !== this.rosterGeneration) return;
      this.students.set(rows);
      this.selectedEnrollmentId.set(rows[0]?.enrollmentId ?? "");
      void this.loadSessions(cohortId, generation);
      if (version) await this.loadDefinitions(version, generation);
      else this.definitionsError.set(true);
    } catch {
      if (generation === this.rosterGeneration) this.rosterError.set(true);
    } finally {
      if (generation === this.rosterGeneration) this.rosterLoading.set(false);
    }
  }
  private async loadSessions(
    cohortId: string,
    generation: number,
  ): Promise<void> {
    try {
      const sessions = await this.sessionsApi.list(cohortId);
      if (generation === this.rosterGeneration) this.sessions.set(sessions);
    } catch {
      if (generation === this.rosterGeneration) this.sessionsError.set(true);
    }
  }
  private async loadDefinitions(
    version: string,
    generation: number,
  ): Promise<void> {
    try {
      const definitions = await firstValueFrom(
        this.api.competencyDefinitions(version),
      );
      if (generation !== this.rosterGeneration) return;
      this.definitions.set(definitions.filter((x) => x.active));
      const ids = new Set(definitions.map((x) => x.id));
      this.selectedDefinitionId.set(
        definitions.find(
          (x) => x.active && (!x.parentId || !ids.has(x.parentId)),
        )?.id ?? "",
      );
    } catch {
      if (generation === this.rosterGeneration) this.definitionsError.set(true);
    }
  }
  private async loadHistory(id: string, generation: number): Promise<void> {
    try {
      const rows = await firstValueFrom(this.api.driving(id));
      if (generation === this.historyGeneration) this.history.set(rows);
    } catch {
      if (generation === this.historyGeneration) this.historyError.set(true);
    } finally {
      if (generation === this.historyGeneration) this.historyLoading.set(false);
    }
  }
  updateStudent(event: Event): void {
    if (!this.isStudent())
      this.selectedEnrollmentId.set((event.target as HTMLSelectElement).value);
  }
  updateSession(event: Event): void {
    this.selectedSessionId.set((event.target as HTMLSelectElement).value);
    this.saved.set(false);
  }
  sessionTitle(id: string | null): string | null {
    return this.sessions().find((x) => x.id === id)?.title ?? null;
  }
  selectDefinition(id: string): void {
    if (!this.canEdit()) return;
    this.selectedDefinitionId.set(id);
    this.evaluation.set({});
    this.saved.set(false);
  }
  setLevel(code: string, level: Level): void {
    if (!this.canEdit()) return;
    this.evaluation.update((current) => ({ ...current, [code]: level }));
    this.saved.set(false);
  }
  updateText(
    field:
      "subject" | "positive" | "difficulty" | "nextGoal" | "freeObservation",
    event: Event,
  ): void {
    this[field].set(
      (event.target as HTMLInputElement | HTMLTextAreaElement).value,
    );
    this.saved.set(false);
  }
  levelClasses(code: string, level: Level): string {
    return this.evaluation()[code] === level
      ? "border-[#2b66a4] bg-[#2b66a4] text-white"
      : "border-[#dfe5ec] bg-white text-[#334155]";
  }
  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date);
  }
  async save(): Promise<void> {
    if (!this.canEdit() || !this.valid() || this.saving()) return;
    const enrollmentId = this.selectedEnrollmentId();
    const sessionId = this.selectedSessionId();
    if (sessionId && !this.eligibleSessions().some((x) => x.id === sessionId))
      return;
    const definition = this.selectedDefinition();
    if (!definition) return;
    const request: RecordDrivingEvaluationApiRequest = {
      competencyDefinitionId: definition.id,
      trainingSessionId: sessionId || null,
      evaluatedAtUtc: new Date().toISOString(),
      trainerAuthGateUserId: null,
      trainerDisplayName: "",
      subject: this.subject().trim(),
      positive: this.positive().trim() || null,
      difficulty: this.difficulty().trim() || null,
      nextGoal: this.nextGoal().trim() || null,
      freeObservation: this.freeObservation().trim() || null,
      criteria: this.criteria().map((x) => ({
        code: x.code,
        label: x.title,
        level: this.evaluation()[x.code],
      })),
    };
    this.saving.set(true);
    this.saveError.set(false);
    this.saved.set(false);
    try {
      const recorded = await firstValueFrom(
        this.api.recordDriving(enrollmentId, request),
      );
      if (enrollmentId !== this.selectedEnrollmentId()) return;
      this.history.update((rows) => [
        recorded,
        ...rows.filter((x) => x.id !== recorded.id),
      ]);
      this.saved.set(true);
      this.subject.set("");
      this.positive.set("");
      this.difficulty.set("");
      this.nextGoal.set("");
      this.freeObservation.set("");
      this.evaluation.set({});
    } catch {
      if (enrollmentId === this.selectedEnrollmentId())
        this.saveError.set(true);
    } finally {
      this.saving.set(false);
    }
  }
  scrollToHistory(): void {
    document
      .getElementById("driving-history")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
