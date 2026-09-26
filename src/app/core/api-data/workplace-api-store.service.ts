import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { InternshipPeriod } from "../models/internships.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionService } from "../session/session.service";
import { StudentProfileApiService } from "../students/student-profile-api.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";
import { WorkplaceApiService } from "../workplace/workplace-api.service";
import type {
  CohortLearnerDto,
  CreateWorkplacePeriodPayload,
  WorkplacePeriodDto,
} from "../workplace/workplace.models";

export interface WorkplaceStudentOption {
  id: string;
  firstName: string;
  lastName: string;
}

export interface CreateWorkplacePeriodValue {
  studentId: string;
  company: string;
  city: string;
  tutor: string;
  tutorEmail: string;
  tutorPhone: string;
  startDate: string;
  endDate: string;
  plannedHours: number;
  agreementReceived: boolean;
  notes: string;
}

@Injectable({ providedIn: "root" })
export class WorkplaceApiStoreService {
  private readonly api = inject(WorkplaceApiService);
  private readonly learnerApi = inject(StudentProfileApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly session = inject(SessionService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly realtime = inject(RealtimeService);

  private readonly rowsSignal = signal<WorkplacePeriodDto[]>([]);
  private readonly learnersSignal = signal<CohortLearnerDto[]>([]);
  private readonly periodTypesSignal = signal<string[]>([]);

  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly loadError = signal(false);
  readonly typesError = signal(false);
  private generation = 0;
  private request = 0;

  readonly students = computed<WorkplaceStudentOption[]>(() =>
    this.learnersSignal().map((learner) => ({
      id: this.text(learner.enrollmentId),
      firstName: this.text(learner.firstName),
      lastName: this.text(learner.lastName),
    })),
  );

  readonly periodTypes = this.periodTypesSignal.asReadonly();
  readonly defaultPlannedHours = computed(() => 0);
  readonly periods = computed<InternshipPeriod[]>(() =>
    this.rowsSignal().map((row) => this.toPeriod(row)),
  );

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const cohortApiId = this.text(this.workspace.cohort()?.apiId);
      const referentialVersionId = this.text(this.workspace.cohort()?.referentialVersionId);
      const role = this.session.role();
      const generation = ++this.generation;

      this.rowsSignal.set([]);
      this.learnersSignal.set([]);
      this.periodTypesSignal.set([]);
      this.loadError.set(false);
      this.typesError.set(false);

      if (ready && cohortApiId) {
        void this.loadContext(cohortApiId, referentialVersionId, role, generation);
      }
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.workplace\./.test(event.typeKey)) return;
      untracked(() => void this.reload(false));
    });
  }

  async reload(notify = true): Promise<boolean> {
    const cohortApiId = this.text(this.workspace.cohort()?.apiId);
    const referentialVersionId = this.text(this.workspace.cohort()?.referentialVersionId);
    if (!cohortApiId) {
      this.rowsSignal.set([]);
      this.learnersSignal.set([]);
      this.periodTypesSignal.set([]);
      return true;
    }
    return this.loadContext(cohortApiId, referentialVersionId, this.session.role(), this.generation, notify);
  }

  async create(value: CreateWorkplacePeriodValue): Promise<WorkplacePeriodDto | null> {
    if (this.creating()) return null;

    const enrollmentId = this.text(value.studentId);
    const periodTypeCode = this.periodTypesSignal()[0] ?? "";
    if (!enrollmentId || !periodTypeCode || !this.text(value.startDate) || !this.text(value.endDate) || this.number(value.plannedHours) <= 0) {
      this.notifications.error(periodTypeCode ? "internships.real.createError" : "internships.real.noTypes", "/stages");
      return null;
    }

    const payload: CreateWorkplacePeriodPayload = {
      enrollmentId,
      periodTypeCode,
      company: this.text(value.company).trim(),
      city: this.text(value.city).trim(),
      tutorName: this.text(value.tutor).trim(),
      tutorEmail: this.optionalText(value.tutorEmail) ?? undefined,
      tutorPhone: this.optionalText(value.tutorPhone) ?? undefined,
      startDate: this.text(value.startDate),
      endDate: this.text(value.endDate),
      plannedHours: this.number(value.plannedHours),
      agreementReceived: Boolean(value.agreementReceived),
      notes: this.optionalText(value.notes) ?? undefined,
    };

    this.creating.set(true);
    try {
      const created = this.normalize(await this.api.createPeriod(payload));
      this.rowsSignal.update((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      await this.reload(false);
      return created;
    } catch {
      this.notifications.error("internships.real.createError", "/stages");
      return null;
    } finally {
      this.creating.set(false);
    }
  }

  private async loadContext(
    cohortApiId: string,
    referentialVersionId: string,
    role: string,
    generation: number,
    notify = true,
  ): Promise<boolean> {
    const request = ++this.request;
    this.loading.set(true);
    let ok = true;

    const periodTask = (async () => {
      try {
        let rows: WorkplacePeriodDto[] = [];
        if (role === "stagiaire") {
          const self = await firstValueFrom(this.learnerApi.self());
          const enrollmentId = this.text(self?.enrollmentId);
          rows = enrollmentId ? await this.api.getMyPeriods(enrollmentId) : [];
          this.learnersSignal.set(
            enrollmentId
              ? [{
                  enrollmentId,
                  firstName: this.text(self?.firstName),
                  lastName: this.text(self?.lastName),
                  displayName: `${this.text(self?.firstName)} ${this.text(self?.lastName)}`.trim(),
                  externalKey: null,
                }]
              : [],
          );
        } else {
          rows = await this.api.getPeriods(cohortApiId);
        }
        if (generation === this.generation && request === this.request) {
          this.rowsSignal.set((Array.isArray(rows) ? rows : []).map((row) => this.normalize(row)));
          this.loadError.set(false);
        }
      } catch {
        ok = false;
        if (generation === this.generation && request === this.request) {
          this.rowsSignal.set([]);
          this.loadError.set(true);
          if (notify) this.notifications.error("internships.real.loadError", "/stages");
        }
      }
    })();

    const learnersTask = role === "stagiaire"
      ? Promise.resolve()
      : (async () => {
          try {
            const learners = await this.api.getLearners(cohortApiId);
            if (generation === this.generation && request === this.request) {
              this.learnersSignal.set((Array.isArray(learners) ? learners : []).map((row) => this.normalizeLearner(row)));
            }
          } catch {
            ok = false;
            if (generation === this.generation && request === this.request) {
              this.learnersSignal.set([]);
              if (notify) this.notifications.error("internships.real.loadError", "/stages");
            }
          }
        })();

    const typesTask = (async () => {
      if (!["direction", "secretariat"].includes(role) || !referentialVersionId) {
        this.periodTypesSignal.set([]);
        return;
      }
      try {
        const types = await this.api.getPeriodTypes(referentialVersionId);
        if (generation === this.generation && request === this.request) {
          this.periodTypesSignal.set((Array.isArray(types) ? types : []).map((value) => this.text(value).trim()).filter(Boolean).sort());
          this.typesError.set(false);
        }
      } catch {
        ok = false;
        if (generation === this.generation && request === this.request) {
          this.periodTypesSignal.set([]);
          this.typesError.set(true);
          if (notify) this.notifications.error("internships.real.typesError", "/stages");
        }
      }
    })();

    await Promise.all([periodTask, learnersTask, typesTask]);
    if (generation === this.generation && request === this.request) this.loading.set(false);
    return ok;
  }

  private toPeriod(row: WorkplacePeriodDto): InternshipPeriod {
    const normalized = this.normalize(row);
    return {
      id: normalized.id,
      studentId: normalized.enrollmentId,
      studentName: normalized.learnerDisplayName,
      company: normalized.company,
      city: normalized.city,
      tutor: normalized.tutorName,
      startDate: this.displayDate(normalized.startDate),
      endDate: this.displayDate(normalized.endDate),
      plannedHours: normalized.plannedHours,
      completedHours: normalized.completedHours,
      status: normalized.status,
      trainerVisible: normalized.trainerVisible,
      activities: normalized.activities.map((activity) => ({
        labelKey: this.text(activity.labelKey) || this.text(activity.title) || this.text(activity.code),
        status: activity.status,
      })),
      tutorObservationKey: this.text(normalized.tutorObservation),
      documents: normalized.documents.map((document) => ({
        labelKey: this.text(document.labelKey) || this.text(document.title) || this.text(document.code),
        status: document.status,
      })),
    };
  }

  private normalize(row: WorkplacePeriodDto): WorkplacePeriodDto {
    const status = row?.status === "inProgress" || row?.status === "completed" || row?.status === "incomplete" || row?.status === "cancelled"
      ? row.status
      : "planned";
    return {
      id: this.text(row?.id),
      enrollmentId: this.text(row?.enrollmentId),
      cohortId: this.text(row?.cohortId),
      referentialVersionId: this.text(row?.referentialVersionId),
      periodTypeCode: this.text(row?.periodTypeCode),
      learnerDisplayName: this.text(row?.learnerDisplayName),
      learnerExternalKey: this.optionalText(row?.learnerExternalKey),
      company: this.text(row?.company),
      city: this.text(row?.city),
      tutorName: this.text(row?.tutorName),
      tutorEmail: this.optionalText(row?.tutorEmail),
      tutorPhone: this.optionalText(row?.tutorPhone),
      startDate: this.text(row?.startDate),
      endDate: this.text(row?.endDate),
      plannedHours: this.number(row?.plannedHours),
      completedHours: this.number(row?.completedHours),
      status,
      agreementReceived: Boolean(row?.agreementReceived),
      trainerVisible: Boolean(row?.trainerVisible),
      notes: this.optionalText(row?.notes),
      tutorObservation: this.optionalText(row?.tutorObservation),
      activities: Array.isArray(row?.activities)
        ? row.activities.map((activity) => ({
            id: this.text(activity?.id),
            definitionId: this.text(activity?.definitionId),
            code: this.text(activity?.code),
            title: this.text(activity?.title),
            labelKey: this.optionalText(activity?.labelKey),
            mandatory: Boolean(activity?.mandatory),
            status: activity?.status === "done" || activity?.status === "notApplicable" ? activity.status : "pending",
            comment: this.optionalText(activity?.comment),
          }))
        : [],
      documents: Array.isArray(row?.documents)
        ? row.documents.map((document) => ({
            id: this.text(document?.id),
            requirementId: this.text(document?.requirementId),
            code: this.text(document?.code),
            title: this.text(document?.title),
            labelKey: this.optionalText(document?.labelKey),
            mandatory: Boolean(document?.mandatory),
            status: document?.status === "available" || document?.status === "validated" ? document.status : "missing",
            documentId: this.optionalText(document?.documentId),
          }))
        : [],
      evaluations: Array.isArray(row?.evaluations)
        ? row.evaluations.map((evaluation) => ({
            id: this.text(evaluation?.id),
            kind: this.text(evaluation?.kind),
            evaluatorDisplayName: this.text(evaluation?.evaluatorDisplayName),
            evaluatedAtUtc: this.text(evaluation?.evaluatedAtUtc),
            summary: this.text(evaluation?.summary),
            strengths: this.optionalText(evaluation?.strengths),
            improvementAreas: this.optionalText(evaluation?.improvementAreas),
            validated: typeof evaluation?.validated === "boolean" ? evaluation.validated : null,
          }))
        : [],
    };
  }

  private normalizeLearner(row: CohortLearnerDto): CohortLearnerDto {
    return {
      enrollmentId: this.text(row?.enrollmentId),
      firstName: this.text(row?.firstName),
      lastName: this.text(row?.lastName),
      displayName: this.text(row?.displayName),
      externalKey: this.optionalText(row?.externalKey),
    };
  }

  private displayDate(value: unknown): string {
    const raw = this.text(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private optionalText(value: unknown): string | null {
    const text = this.text(value).trim();
    return text || null;
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
}
