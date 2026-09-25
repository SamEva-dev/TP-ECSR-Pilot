import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { StudentProfileApiService } from "../../core/students/student-profile-api.service";
import { DocumentApiService } from "../../core/documents/document-api.service";
import type { DocumentDto } from "../../core/documents/document.models";
import { WorkplaceApiService } from "../../core/workplace/workplace-api.service";
import type {
  CohortLearnerDto,
  CreateWorkplacePeriodPayload,
  WorkplacePeriodDto,
  WorkplaceActivityDto,
  WorkplaceDocumentDto,
} from "../../core/workplace/workplace.models";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import { CreateInternshipDrawerComponent } from "./create-internship-drawer/create-internship-drawer.component";

@Component({
  selector: "app-internships",
  imports: [
    TranslatePipe,
    ProgressBarComponent,
    CreateInternshipDrawerComponent,
  ],
  templateUrl: "./internships.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternshipsComponent {
  readonly session = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  private readonly api = inject(WorkplaceApiService);
  private readonly profiles = inject(StudentProfileApiService);
  private readonly documentApi = inject(DocumentApiService);
  private readonly drawer = viewChild(CreateInternshipDrawerComponent);
  readonly periods = signal<WorkplacePeriodDto[]>([]);
  readonly learners = signal<CohortLearnerDto[]>([]);
  readonly periodTypes = signal<string[]>([]);
  readonly drawerOpen = signal(false);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly typesError = signal(false);
  readonly typesLoading = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal(false);
  readonly documents = signal<DocumentDto[]>([]);
  readonly documentsError = signal(false);
  readonly updatingId = signal("");
  readonly updateErrorId = signal("");
  readonly editHoursId = signal("");
  readonly completedDraft = signal("");
  readonly observationDraft = signal("");
  readonly editEvaluationId = signal("");
  readonly evaluationKind = signal<"trainer" | "final">("trainer");
  readonly evaluationSummary = signal("");
  readonly evaluationStrengths = signal("");
  readonly evaluationImprovements = signal("");
  readonly evaluationValidated = signal<"" | "yes" | "no">("");
  readonly documentSelection = signal<Record<string, string>>({});
  readonly activityComments = signal<Record<string, string>>({});
  readonly canManage = computed(() =>
    ["direction", "secretariat", "formateur"].includes(this.session.role()),
  );
  readonly activityStatuses: WorkplaceActivityDto["status"][] = [
    "pending",
    "done",
    "notApplicable",
  ];
  readonly documentStatuses: WorkplaceDocumentDto["status"][] = [
    "missing",
    "available",
    "validated",
  ];
  readonly canCreate = computed(() =>
    ["direction", "secretariat"].includes(this.session.role()),
  );
  readonly totals = computed(() => {
    const rows = this.periods();
    const planned = rows.reduce((n, x) => n + x.plannedHours, 0);
    const completed = rows.reduce((n, x) => n + x.completedHours, 0);
    return {
      planned,
      completed,
      remaining: Math.max(0, planned - completed),
      incomplete: rows.filter((x) => x.status === "incomplete").length,
    };
  });
  private generation = 0;

  constructor() {
    effect((onCleanup) => {
      const user = this.session.session();
      const cohort = this.workspace.cohort();
      const loaded = this.workspace.remoteWorkspaceLoaded();
      const generation = ++this.generation;
      this.periods.set([]);
      this.learners.set([]);
      this.periodTypes.set([]);
      this.documents.set([]);
      this.documentsError.set(false);
      this.editHoursId.set("");
      this.editEvaluationId.set("");
      this.documentSelection.set({});
      this.activityComments.set({});
      this.updateErrorId.set("");
      this.updatingId.set("");
      this.error.set(false);
      this.typesError.set(false);
      this.typesLoading.set(false);
      this.drawerOpen.set(false);
      this.loading.set(false);
      this.saveError.set(false);
      if (user && loaded) {
        this.loading.set(true);
        if (user.role === "stagiaire") void this.loadSelf(generation);
        else if (cohort?.apiId)
          void this.loadCohort(
            cohort.apiId,
            cohort.referentialVersionId ?? "",
            generation,
          );
        else this.loading.set(false);
      }
      onCleanup(() => {
        this.generation++;
      });
    });
  }

  private async loadSelf(generation: number): Promise<void> {
    try {
      const profile = await firstValueFrom(this.profiles.self());
      const rows = await this.api.getMyPeriods(profile.enrollmentId);
      if (generation === this.generation) this.periods.set(rows);
    } catch {
      if (generation === this.generation) this.error.set(true);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  private async loadCohort(
    cohortId: string,
    version: string,
    generation: number,
  ): Promise<void> {
    try {
      const [periods, learners] = await Promise.all([
        this.api.getPeriods(cohortId),
        this.api.getLearners(cohortId),
      ]);
      if (generation !== this.generation) return;
      this.periods.set(periods);
      this.learners.set(learners);
      if (this.canManage()) void this.loadDocuments(generation);
    } catch {
      if (generation === this.generation) this.error.set(true);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
    if (generation !== this.generation || !this.canCreate()) return;
    if (!version) {
      this.typesError.set(true);
      return;
    }
    this.typesLoading.set(true);
    try {
      const types = await this.api.getPeriodTypes(version);
      if (generation === this.generation) this.periodTypes.set(types);
    } catch {
      if (generation === this.generation) this.typesError.set(true);
    } finally {
      if (generation === this.generation) this.typesLoading.set(false);
    }
  }
  private async loadDocuments(generation: number): Promise<void> {
    try {
      const documents = await this.documentApi.list();
      if (generation === this.generation)
        this.documents.set(documents.filter((x) => x.status === "active"));
    } catch {
      if (generation === this.generation) this.documentsError.set(true);
    }
  }
  eligibleDocuments(period: WorkplacePeriodDto): DocumentDto[] {
    return this.documents().filter(
      (x) =>
        (x.category === "internship" || x.category === "administrative") &&
        !!x.versions[0]?.blobAvailable &&
        x.versions[0]?.securityStatus === "clean" &&
        ((x.ownerType === "enrollment" && x.ownerId === period.enrollmentId) ||
          (x.ownerType === "workplaceperiod" && x.ownerId === period.id) ||
          (x.ownerType === "cohort" && x.ownerId === period.cohortId)),
    );
  }

  titleKey(): string {
    return this.session.role() === "stagiaire"
      ? "internships.studentTitle"
      : this.session.role() === "formateur"
        ? "internships.trainerTitle"
        : "internships.title";
  }
  subtitleKey(): string {
    return this.session.role() === "stagiaire"
      ? "internships.studentSubtitle"
      : this.session.role() === "formateur"
        ? "internships.trainerSubtitle"
        : "internships.subtitle";
  }
  openDrawer(): void {
    this.drawer()?.reset();
    this.saveError.set(false);
    this.drawerOpen.set(true);
  }
  closeDrawer(): void {
    if (!this.saving()) this.drawerOpen.set(false);
  }
  async addPeriod(payload: CreateWorkplacePeriodPayload): Promise<void> {
    if (
      !this.canCreate() ||
      this.saving() ||
      !this.learners().some((x) => x.enrollmentId === payload.enrollmentId) ||
      !this.periodTypes().includes(payload.periodTypeCode)
    )
      return;
    const generation = this.generation;
    this.saving.set(true);
    this.saveError.set(false);
    try {
      const result = await this.api.createPeriod(payload);
      if (generation !== this.generation) return;
      this.periods.update((rows) => [result, ...rows]);
      this.drawer()?.reset();
      this.drawerOpen.set(false);
    } catch {
      if (generation === this.generation) this.saveError.set(true);
    } finally {
      this.saving.set(false);
    }
  }
  private async mutate(
    id: string,
    operation: () => Promise<WorkplacePeriodDto>,
  ): Promise<boolean> {
    if (!this.canManage() || this.updatingId()) return false;
    const generation = this.generation;
    this.updatingId.set(id);
    this.updateErrorId.set("");
    try {
      const updated = await operation();
      if (generation !== this.generation) return false;
      this.periods.update((rows) =>
        rows.map((row) => (row.id === id ? updated : row)),
      );
      return true;
    } catch {
      if (generation === this.generation) this.updateErrorId.set(id);
      return false;
    } finally {
      if (this.updatingId() === id) this.updatingId.set("");
    }
  }
  startHours(period: WorkplacePeriodDto): void {
    this.editHoursId.set(period.id);
    this.editEvaluationId.set("");
    this.completedDraft.set(String(period.completedHours));
    this.observationDraft.set(period.tutorObservation ?? "");
  }
  updateHoursDraft(event: Event): void {
    this.completedDraft.set((event.target as HTMLInputElement).value);
  }
  updateObservationDraft(event: Event): void {
    this.observationDraft.set((event.target as HTMLTextAreaElement).value);
  }
  async saveHours(period: WorkplacePeriodDto): Promise<void> {
    const hours = Number(this.completedDraft());
    if (
      !this.completedDraft().trim() ||
      !Number.isFinite(hours) ||
      hours < 0 ||
      hours > period.plannedHours ||
      hours > 2000
    ) {
      this.updateErrorId.set(period.id);
      return;
    }
    if (
      await this.mutate(period.id, () =>
        this.api.updateHours(
          period.id,
          hours,
          this.observationDraft().trim() || null,
        ),
      )
    )
      this.editHoursId.set("");
  }
  async updateActivity(
    period: WorkplacePeriodDto,
    activity: WorkplaceActivityDto,
    event: Event,
  ): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const status = select.value as WorkplaceActivityDto["status"];
    select.value = activity.status;
    if (!["pending", "done", "notApplicable"].includes(status)) return;
    const comment =
      (this.activityComments()[activity.id] ?? activity.comment)?.trim() ||
      null;
    await this.mutate(period.id, () =>
      this.api.updateActivity(period.id, activity.id, status, comment),
    );
  }
  updateActivityComment(id: string, event: Event): void {
    this.activityComments.update((current) => ({
      ...current,
      [id]: (event.target as HTMLInputElement).value,
    }));
  }
  async saveActivityComment(
    period: WorkplacePeriodDto,
    activity: WorkplaceActivityDto,
  ): Promise<void> {
    await this.mutate(period.id, () =>
      this.api.updateActivity(
        period.id,
        activity.id,
        activity.status,
        this.activityComments()[activity.id]?.trim() || null,
      ),
    );
  }
  selectDocument(itemId: string, event: Event): void {
    this.documentSelection.update((current) => ({
      ...current,
      [itemId]: (event.target as HTMLSelectElement).value,
    }));
  }
  async updateDocument(
    period: WorkplacePeriodDto,
    item: WorkplaceDocumentDto,
    event: Event,
  ): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const status = select.value as WorkplaceDocumentDto["status"];
    select.value = item.status;
    if (!["missing", "available", "validated"].includes(status)) return;
    const selected = this.documentSelection()[item.id] ?? item.documentId ?? "";
    const documentId = status === "missing" ? null : selected || null;
    if (
      documentId &&
      !this.eligibleDocuments(period).some((x) => x.id === documentId)
    ) {
      this.updateErrorId.set(period.id);
      return;
    }
    if (
      (status === "validated" && !documentId) ||
      (status === "available" && !documentId && item.code !== "AGREEMENT")
    ) {
      this.updateErrorId.set(period.id);
      return;
    }
    if (
      (await this.mutate(period.id, () =>
        this.api.updateDocument(period.id, item.id, status, documentId),
      )) &&
      status === "missing"
    )
      this.documentSelection.update((current) => ({
        ...current,
        [item.id]: "",
      }));
  }
  startEvaluation(period: WorkplacePeriodDto): void {
    this.editEvaluationId.set(period.id);
    this.editHoursId.set("");
    this.evaluationKind.set("trainer");
    this.evaluationSummary.set("");
    this.evaluationStrengths.set("");
    this.evaluationImprovements.set("");
    this.evaluationValidated.set("");
  }
  updateEvaluation(
    field:
      "evaluationSummary" | "evaluationStrengths" | "evaluationImprovements",
    event: Event,
  ): void {
    this[field].set(
      (event.target as HTMLInputElement | HTMLTextAreaElement).value,
    );
  }
  updateEvaluationKind(event: Event): void {
    this.evaluationKind.set(
      (event.target as HTMLSelectElement).value === "final"
        ? "final"
        : "trainer",
    );
  }
  updateEvaluationValidated(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.evaluationValidated.set(
      value === "yes" || value === "no" ? value : "",
    );
  }
  async saveEvaluation(period: WorkplacePeriodDto): Promise<void> {
    if (
      !this.evaluationSummary().trim() ||
      this.evaluationSummary().length > 4000
    ) {
      this.updateErrorId.set(period.id);
      return;
    }
    if (
      await this.mutate(period.id, () =>
        this.api.recordEvaluation(period.id, {
          kind: this.evaluationKind(),
          evaluatorDisplayName: "",
          evaluatedAtUtc: null,
          summary: this.evaluationSummary().trim(),
          strengths: this.evaluationStrengths().trim() || null,
          improvementAreas: this.evaluationImprovements().trim() || null,
          validated:
            this.evaluationValidated() === ""
              ? null
              : this.evaluationValidated() === "yes",
        }),
      )
    )
      this.editEvaluationId.set("");
  }
  progress(row: WorkplacePeriodDto): number {
    return row.plannedHours
      ? Math.min(100, Math.round((row.completedHours / row.plannedHours) * 100))
      : 0;
  }
  remaining(row: WorkplacePeriodDto): number {
    return Math.max(0, row.plannedHours - row.completedHours);
  }
  formatDate(value: string): string {
    const date = new Date(value + "T12:00:00");
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat(undefined, { dateStyle: "short" }).format(date);
  }
  formatDateTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        }).format(date);
  }
  statusClass(status: string): string {
    return status === "completed"
      ? "bg-green-100 text-green-700"
      : status === "incomplete" || status === "cancelled"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";
  }
}
