import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type {
  DrivingCriterion,
  DrivingHistoryItem,
  DrivingLevel,
} from "../models/driving.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionService } from "../session/session.service";
import {
  StudentProfileApiService,
  type CompetencyDefinitionApi,
  type DrivingEvaluationApi,
  type LearnerProfileApi,
  type RecordDrivingEvaluationApiRequest,
} from "../students/student-profile-api.service";
import { PARIS_ZONE } from "../training-delivery/paris-time";
import type { TrainingSessionApi } from "../training-delivery/training-delivery-api.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";
import { TrainingSessionApiStoreService } from "./training-session-api-store.service";

export interface DrivingStudentOption {
  id: string;
  name: string;
}

export interface DrivingTrainerOption {
  id: string;
  name: string;
}

export interface DrivingCompetencyOption {
  id: string;
  definitionId: string;
  descriptionKey: string;
}

export interface DrivingSubSkillOption {
  id: string;
  definitionId: string;
  labelKey: string;
}

export interface DrivingSessionFormData {
  date: string;
  start: string;
  end: string;
  duration: string;
}

export interface RecordDrivingValue {
  enrollmentId: string;
  competenceCode: string;
  subSkillCode: string;
  evaluation: Record<string, DrivingLevel>;
  objective: string;
  positive: string;
  difficulties: string;
  errors: string;
  advice: string;
  nextGoal: string;
  freeObservation: string;
  date: string;
}

@Injectable({ providedIn: "root" })
export class DrivingApiStoreService {
  private readonly api = inject(StudentProfileApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly session = inject(SessionService);
  private readonly sessions = inject(TrainingSessionApiStoreService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly realtime = inject(RealtimeService);

  private readonly learnersSignal = signal<LearnerProfileApi[]>([]);
  private readonly definitionsSignal = signal<CompetencyDefinitionApi[]>([]);
  private readonly historySignal = signal<DrivingHistoryItem[]>([]);
  private readonly selectedEnrollmentSignal = signal("");

  readonly loading = signal(false);
  readonly historyLoading = signal(false);
  readonly loadError = signal(false);
  readonly definitionsError = signal(false);
  readonly historyError = signal(false);
  private contextGeneration = 0;
  private historyGeneration = 0;

  readonly students = computed<DrivingStudentOption[]>(() =>
    this.learnersSignal().map((learner) => ({
      id: this.text(learner.enrollmentId),
      name: `${this.text(learner.firstName)} ${this.text(learner.lastName)}`.trim(),
    })),
  );

  readonly trainers = computed<DrivingTrainerOption[]>(() => {
    const current = this.session.session();
    const name = `${this.text(current?.firstName)} ${this.text(current?.lastName)}`.trim();
    return name ? [{ id: this.text(current?.userId), name }] : [];
  });

  readonly competencies = computed<DrivingCompetencyOption[]>(() => {
    const definitions = this.definitionsSignal().filter((item) => item.active !== false);
    const roots = definitions.filter((item) => !this.text(item.parentId));
    const ecsrRoots = roots.filter((item) => /^C[1-4]$/i.test(this.text(item.code)));
    return (ecsrRoots.length ? ecsrRoots : roots)
      .slice()
      .sort((a, b) => this.number(a.sortOrder) - this.number(b.sortOrder))
      .map((item) => ({
        id: this.text(item.code),
        definitionId: this.text(item.id),
        descriptionKey: this.text(item.title),
      }));
  });

  readonly history = this.historySignal.asReadonly();

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const cohortApiId = this.text(this.workspace.cohort()?.apiId);
      const referentialVersionId = this.text(this.workspace.cohort()?.referentialVersionId);
      const role = this.session.role();
      const generation = ++this.contextGeneration;
      this.learnersSignal.set([]);
      this.definitionsSignal.set([]);
      this.historySignal.set([]);
      this.selectedEnrollmentSignal.set("");
      this.loadError.set(false);
      this.definitionsError.set(false);
      if (ready && cohortApiId) void this.loadContext(cohortApiId, referentialVersionId, role === "stagiaire", generation);
    });

    effect(() => {
      const enrollmentId = this.selectedEnrollmentSignal();
      const generation = ++this.historyGeneration;
      this.historySignal.set([]);
      this.historyError.set(false);
      if (enrollmentId) void this.loadHistory(enrollmentId, generation);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || event.typeKey !== "pedagora.learning.driving-evaluation.recorded.v1") return;
      untracked(() => {
        const enrollmentId = this.selectedEnrollmentSignal();
        if (enrollmentId) void this.loadHistory(enrollmentId, ++this.historyGeneration, false);
      });
    });
  }

  selectStudent(enrollmentId: string): void {
    this.selectedEnrollmentSignal.set(this.text(enrollmentId));
  }

  subSkills(competenceCode: string): DrivingSubSkillOption[] {
    const root = this.definitionByCode(competenceCode);
    if (!root) return [];
    return this.childrenOf(root.id).map((item) => ({
      id: this.text(item.code),
      definitionId: this.text(item.id),
      labelKey: this.text(item.title),
    }));
  }

  criteria(competenceCode: string, subSkillCode: string): DrivingCriterion[] {
    const root = this.definitionByCode(competenceCode);
    if (!root) return [];
    const subSkill = this.definitionByCode(subSkillCode, root.id);
    const target = subSkill ?? root;
    const children = this.childrenOf(target.id);
    const definitions = children.length ? children : [target];
    return definitions.map((item) => ({
      id: this.text(item.code),
      labelKey: this.text(item.title),
    }));
  }

  sessionForm(enrollmentId: string): DrivingSessionFormData {
    const session = this.latestEligibleDrivingSession(enrollmentId);
    if (!session) return { date: "", start: "", end: "", duration: "" };
    const start = this.date(session.startsAtUtc);
    const end = this.date(session.endsAtUtc);
    if (!start || !end) return { date: "", start: "", end: "", duration: "" };
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    return {
      date: this.localIsoDate(start),
      start: this.localTime(start),
      end: this.localTime(end),
      duration: minutes ? `${this.formatNumber(minutes / 60)} h` : "",
    };
  }

  async record(value: RecordDrivingValue): Promise<boolean> {
    const enrollmentId = this.text(value.enrollmentId);
    const root = this.definitionByCode(value.competenceCode);
    const subSkill = root ? this.definitionByCode(value.subSkillCode, root.id) : null;
    const target = subSkill ?? root;
    const criteria = this.criteria(value.competenceCode, value.subSkillCode);
    if (!enrollmentId || !target?.id || !criteria.length) {
      this.notifications.error("drivingSession.real.saveError", "/conduite");
      return false;
    }

    const payloadCriteria = criteria.map((criterion) => ({
      code: this.text(criterion.id),
      label: this.text(criterion.labelKey),
      level: this.toApiLevel(value.evaluation[criterion.id]),
    }));
    if (payloadCriteria.some((criterion) => !criterion.level)) {
      this.notifications.error("drivingSession.real.criteriaHelp", "/conduite");
      return false;
    }

    const subject = this.text(value.objective).trim() || this.text(target.title).trim() || this.text(target.code).trim();
    if (!subject) {
      this.notifications.error("drivingSession.real.saveError", "/conduite");
      return false;
    }

    const linkedSession = this.matchDrivingSession(enrollmentId, value.date);
    const request: RecordDrivingEvaluationApiRequest = {
      competencyDefinitionId: this.text(target.id),
      trainingSessionId: linkedSession?.id ?? null,
      evaluatedAtUtc: new Date().toISOString(),
      trainerAuthGateUserId: null,
      trainerDisplayName: this.currentUserName(),
      subject,
      positive: this.nullableText(value.positive),
      difficulty: this.nullableText(value.difficulties),
      nextGoal: this.nullableText(value.nextGoal),
      freeObservation: this.observation(value.freeObservation, value.errors, value.advice),
      criteria: payloadCriteria.map((criterion) => ({
        code: criterion.code,
        label: criterion.label,
        level: criterion.level!,
      })),
    };

    try {
      const created = await firstValueFrom(this.api.recordDriving(enrollmentId, request));
      this.historySignal.update((items) => [this.mapHistory(created, enrollmentId), ...items.filter((item) => item.id !== created.id)]);
      await this.loadHistory(enrollmentId, ++this.historyGeneration, false);
      return true;
    } catch {
      this.notifications.error("drivingSession.real.saveError", "/conduite");
      return false;
    }
  }

  private async loadContext(cohortApiId: string, referentialVersionId: string, selfOnly: boolean, generation: number): Promise<void> {
    this.loading.set(true);
    const learnersPromise = selfOnly
      ? firstValueFrom(this.api.self()).then((row) => [row])
      : firstValueFrom(this.api.cohortLearners(cohortApiId));
    const definitionsPromise = referentialVersionId
      ? firstValueFrom(this.api.competencyDefinitions(referentialVersionId))
      : Promise.resolve([] as CompetencyDefinitionApi[]);

    const [learnersResult, definitionsResult] = await Promise.allSettled([learnersPromise, definitionsPromise]);
    if (generation !== this.contextGeneration) return;

    if (learnersResult.status === "fulfilled") {
      this.learnersSignal.set((Array.isArray(learnersResult.value) ? learnersResult.value : []).map((row) => this.normalizeLearner(row)));
      this.loadError.set(false);
    } else {
      this.learnersSignal.set([]);
      this.loadError.set(true);
      this.notifications.error("drivingSession.real.loadError", "/conduite");
    }

    if (definitionsResult.status === "fulfilled") {
      this.definitionsSignal.set((Array.isArray(definitionsResult.value) ? definitionsResult.value : []).map((row) => this.normalizeDefinition(row)));
      this.definitionsError.set(false);
    } else {
      this.definitionsSignal.set([]);
      this.definitionsError.set(true);
      this.notifications.error("drivingSession.real.definitionsError", "/conduite");
    }

    const firstEnrollment = this.learnersSignal()[0]?.enrollmentId ?? "";
    this.selectedEnrollmentSignal.set(this.text(firstEnrollment));
    this.loading.set(false);
  }

  private async loadHistory(enrollmentId: string, generation: number, notify = true): Promise<void> {
    this.historyLoading.set(true);
    try {
      const rows = await firstValueFrom(this.api.driving(enrollmentId));
      if (generation !== this.historyGeneration || enrollmentId !== this.selectedEnrollmentSignal()) return;
      this.historySignal.set((Array.isArray(rows) ? rows : []).map((row) => this.mapHistory(row, enrollmentId)));
      this.historyError.set(false);
    } catch {
      if (generation === this.historyGeneration && enrollmentId === this.selectedEnrollmentSignal()) {
        this.historySignal.set([]);
        this.historyError.set(true);
        if (notify) this.notifications.error("drivingSession.real.historyError", "/conduite");
      }
    } finally {
      if (generation === this.historyGeneration) this.historyLoading.set(false);
    }
  }

  private mapHistory(row: DrivingEvaluationApi, enrollmentId: string): DrivingHistoryItem {
    const target = this.definitionById(row?.competencyDefinitionId);
    const root = target ? this.rootOf(target) : null;
    const student = this.learnersSignal().find((item) => item.enrollmentId === enrollmentId);
    return {
      id: this.text(row?.id),
      studentId: this.text(enrollmentId),
      studentName: `${this.text(student?.firstName)} ${this.text(student?.lastName)}`.trim(),
      date: this.shortLocalDate(row?.evaluatedAtUtc),
      competence: this.text(root?.code),
      trainer: this.text(row?.trainerDisplayName),
      subjectKey: this.text(row?.subject),
      positiveKey: this.text(row?.positive),
      difficultyKey: this.text(row?.difficulty),
      nextGoalKey: this.text(row?.nextGoal),
      evaluations: (Array.isArray(row?.criteria) ? row.criteria : []).map((criterion) => ({
        criterionId: this.text(criterion?.code),
        level: this.fromApiLevel(criterion?.level),
      })),
    };
  }

  private latestEligibleDrivingSession(enrollmentId: string): TrainingSessionApi | null {
    const now = Date.now();
    return this.sessions.apiSessions()
      .filter((row) => this.isEligibleDrivingSession(row, enrollmentId) && this.time(row.startsAtUtc) <= now)
      .slice()
      .sort((a, b) => this.time(b.startsAtUtc) - this.time(a.startsAtUtc))[0] ?? null;
  }

  private matchDrivingSession(enrollmentId: string, localDate: string): TrainingSessionApi | null {
    const candidates = this.sessions.apiSessions()
      .filter((row) => this.isEligibleDrivingSession(row, enrollmentId) && this.time(row.startsAtUtc) <= Date.now())
      .slice()
      .sort((a, b) => this.time(b.startsAtUtc) - this.time(a.startsAtUtc));
    if (!localDate) return candidates[0] ?? null;
    return candidates.find((row) => {
      const date = this.date(row.startsAtUtc);
      return date ? this.localIsoDate(date) === localDate : false;
    }) ?? null;
  }

  private isEligibleDrivingSession(row: TrainingSessionApi, enrollmentId: string): boolean {
    if (row?.type !== "driving" || row?.status === "cancelled") return false;
    if (row?.audienceMode !== "selected-enrollments") return true;
    return (Array.isArray(row.participantEnrollmentIds) ? row.participantEnrollmentIds : []).includes(enrollmentId);
  }

  private definitionByCode(code: string, parentId?: string): CompetencyDefinitionApi | null {
    const normalized = this.text(code).toLowerCase();
    return this.definitionsSignal().find((item) =>
      this.text(item.code).toLowerCase() === normalized && (parentId === undefined || this.text(item.parentId) === parentId),
    ) ?? null;
  }

  private definitionById(id: unknown): CompetencyDefinitionApi | null {
    const value = this.text(id);
    return this.definitionsSignal().find((item) => item.id === value) ?? null;
  }

  private childrenOf(parentId: string): CompetencyDefinitionApi[] {
    return this.definitionsSignal()
      .filter((item) => item.active !== false && this.text(item.parentId) === parentId)
      .slice()
      .sort((a, b) => this.number(a.sortOrder) - this.number(b.sortOrder));
  }

  private rootOf(definition: CompetencyDefinitionApi): CompetencyDefinitionApi {
    let current = definition;
    const visited = new Set<string>();
    while (current.parentId && !visited.has(current.id)) {
      visited.add(current.id);
      const parent = this.definitionById(current.parentId);
      if (!parent) break;
      current = parent;
    }
    return current;
  }

  private normalizeLearner(row: LearnerProfileApi): LearnerProfileApi {
    return {
      enrollmentId: this.text(row?.enrollmentId),
      learnerProfileId: this.text(row?.learnerProfileId),
      cohortId: this.text(row?.cohortId),
      firstName: this.text(row?.firstName),
      lastName: this.text(row?.lastName),
      email: this.text(row?.email),
      phone: this.nullableText(row?.phone),
      birthDate: this.nullableText(row?.birthDate),
      enrollmentStatus: this.text(row?.enrollmentStatus),
      enrolledOn: this.text(row?.enrolledOn),
    };
  }

  private normalizeDefinition(row: CompetencyDefinitionApi): CompetencyDefinitionApi {
    return {
      id: this.text(row?.id),
      parentId: this.nullableText(row?.parentId),
      code: this.text(row?.code),
      title: this.text(row?.title),
      kind: this.text(row?.kind),
      sortOrder: this.number(row?.sortOrder),
      active: Boolean(row?.active),
    };
  }

  private toApiLevel(level: DrivingLevel | undefined): "acquired" | "in_progress" | "rework" | "" {
    if (level === "acquired") return "acquired";
    if (level === "progress") return "in_progress";
    if (level === "work") return "rework";
    return "";
  }

  private fromApiLevel(level: unknown): DrivingLevel {
    if (level === "acquired") return "acquired";
    if (level === "in_progress") return "progress";
    return "work";
  }

  private observation(free: string, errors: string, advice: string): string | null {
    const blocks = [
      this.text(free).trim(),
      this.text(errors).trim() ? `Erreurs : ${this.text(errors).trim()}` : "",
      this.text(advice).trim() ? `Conseils : ${this.text(advice).trim()}` : "",
    ].filter(Boolean);
    return blocks.length ? blocks.join("\n") : null;
  }

  private currentUserName(): string {
    const current = this.session.session();
    return `${this.text(current?.firstName)} ${this.text(current?.lastName)}`.trim() || this.text(current?.email);
  }

  private localIsoDate(date: Date): string {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: PARIS_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date).map((part) => [part.type, part.value]));
    return `${parts["year"] ?? ""}-${parts["month"] ?? ""}-${parts["day"] ?? ""}`;
  }

  private localTime(date: Date): string {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: PARIS_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  }

  private shortLocalDate(value: unknown): string {
    const date = this.date(value);
    if (!date) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: PARIS_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }

  private date(value: unknown): Date | null {
    if (typeof value !== "string" || !value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private time(value: unknown): number {
    return this.date(value)?.getTime() ?? Number.POSITIVE_INFINITY;
  }

  private nullableText(value: unknown): string | null {
    const text = this.text(value).trim();
    return text || null;
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
}
