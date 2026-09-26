import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type {
  CertificationCandidate as CertificationCandidateApi,
  CertificationExamSession as CertificationExamSessionApi,
  CertificationScheme as CertificationSchemeApi,
} from "../certification/certification.models";
import { CertificationApiService } from "../certification/certification-api.service";
import type {
  CertificationCandidate,
  CertificationScheme,
  CertificationUnitStatus,
  ExamSession,
  ExamSessionStatus,
  ExamStep,
  JuryMember,
} from "../models/certification.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionService } from "../session/session.service";
import { StudentProfileApiService } from "../students/student-profile-api.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";
import { StudentApiStoreService } from "./student-api-store.service";
import { ContextualTrainingDataService } from "../workspace/contextual-training-data.service";

const EMPTY_SCHEME: CertificationScheme = {
  id: "",
  programId: "",
  code: "",
  nameKey: "",
  version: "",
  requiredDocuments: 0,
  units: [],
  steps: [],
  juryCriteria: [],
};

const EMPTY_SESSION: ExamSession = {
  id: "",
  name: "",
  promotionId: "",
  promotionName: "",
  centre: "",
  location: "",
  startDate: "",
  endDate: "",
  status: "preparation",
  candidateIds: [],
  juryIds: [],
  programId: "",
  schemeId: "",
};

@Injectable({ providedIn: "root" })
export class CertificationApiStoreService {
  private readonly api = inject(CertificationApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly studentsStore = inject(StudentApiStoreService);
  private readonly studentProfile = inject(StudentProfileApiService);
  private readonly session = inject(SessionService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly realtime = inject(RealtimeService);
  private readonly contextual = inject(ContextualTrainingDataService);

  private readonly schemesSignal = signal<CertificationSchemeApi[]>([]);
  private readonly sessionsSignal = signal<CertificationExamSessionApi[]>([]);
  private readonly candidatesSignal = signal<CertificationCandidateApi[]>([]);
  private readonly selectedSessionIdSignal = signal("");
  private readonly selfEnrollmentIdSignal = signal("");

  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly saving = signal(false);

  readonly scheme = computed<CertificationScheme>(() => {
    const raw = this.currentSchemeApi();
    if (!raw) return { ...EMPTY_SCHEME, programId: this.text(this.workspace.program()?.id) };
    return this.mapScheme(raw);
  });

  readonly examSession = computed<ExamSession>(() => {
    const raw = this.currentSessionApi();
    if (!raw) {
      return {
        ...EMPTY_SESSION,
        promotionId: this.text(this.workspace.cohort()?.id),
        promotionName: this.text(this.workspace.cohort()?.name),
        centre: this.text(this.workspace.site()?.name),
        programId: this.text(this.workspace.program()?.id),
        schemeId: this.scheme().id,
      };
    }
    return this.mapSession(raw);
  });

  readonly candidates = computed<CertificationCandidate[]>(() => {
    const scheme = this.scheme();
    const session = this.currentSessionApi();
    return this.candidatesSignal().map((candidate) => this.mapCandidate(candidate, scheme, session));
  });

  readonly juryMembers = computed<JuryMember[]>(() =>
    (this.contextual.juryMembers() ?? []).map((member) => ({
      id: this.text(member?.id),
      firstName: this.text(member?.firstName),
      lastName: this.text(member?.lastName),
      professionKey: this.text(member?.professionKey),
      organisation: this.text(member?.organisation),
      habilitation: this.text(member?.habilitation),
      validUntil: this.text(member?.validUntil),
      active: Boolean(member?.active),
      programIds: Array.isArray(member?.programIds) ? member.programIds.map((x: unknown) => this.text(x)) : [],
    })),
  );

  readonly selfEnrollmentId = this.selfEnrollmentIdSignal.asReadonly();

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const cohortApiId = this.text(this.workspace.cohort()?.apiId);
      const referentialVersionId = this.text(this.workspace.cohort()?.referentialVersionId);
      this.schemesSignal.set([]);
      this.sessionsSignal.set([]);
      this.candidatesSignal.set([]);
      this.selectedSessionIdSignal.set("");
      this.selfEnrollmentIdSignal.set("");
      this.loadError.set(false);
      if (ready && cohortApiId) void this.loadContext(cohortApiId, referentialVersionId);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.certification\./.test(event.typeKey)) return;
      untracked(() => void this.reload(false));
    });
  }

  async reload(notify = true): Promise<boolean> {
    const cohortApiId = this.text(this.workspace.cohort()?.apiId);
    const referentialVersionId = this.text(this.workspace.cohort()?.referentialVersionId);
    if (!cohortApiId) {
      this.schemesSignal.set([]);
      this.sessionsSignal.set([]);
      this.candidatesSignal.set([]);
      return true;
    }
    return this.loadContext(cohortApiId, referentialVersionId, notify);
  }

  async selectSession(sessionId: string): Promise<void> {
    const id = this.text(sessionId);
    this.selectedSessionIdSignal.set(id);
    if (id && this.sessionsSignal().some((item) => this.text(item?.id) === id)) {
      await this.loadCandidates(id, true);
    }
  }

  async saveAssessments(
    candidateId: string,
    levels: Record<string, "satisfactory" | "partial" | "insufficient">,
    comment: string,
  ): Promise<boolean> {
    const candidate = this.candidatesSignal().find((item) => this.text(item?.id) === this.text(candidateId));
    if (!candidate) {
      this.notifications.error("certification.api.saveFailed", "/certification");
      return false;
    }

    const entries = Object.entries(levels).filter(([stepId]) => Boolean(stepId));
    if (!entries.length) return true;

    this.saving.set(true);
    try {
      let updated = candidate;
      const juryDisplayName = this.currentUserName();
      if (!juryDisplayName) {
        this.notifications.error("certification.api.saveFailed", "/certification");
        return false;
      }
      for (const [stepDefinitionId, level] of entries) {
        updated = await firstValueFrom(
          this.api.addAssessment(this.text(candidateId), {
            stepDefinitionId,
            juryDisplayName,
            outcome: level === "satisfactory" ? "Passed" : level === "insufficient" ? "Failed" : "Pending",
            score: level === "satisfactory" ? 100 : level === "partial" ? 50 : 0,
            comment: this.optionalText(comment),
          }),
        );
      }
      this.replaceCandidate(this.normalizeCandidate(updated));
      await this.loadCandidates(this.selectedSessionIdSignal(), false);
      return true;
    } catch {
      this.notifications.error("certification.api.saveFailed", "/certification");
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  levelForAssessment(outcome: string): "satisfactory" | "partial" | "insufficient" {
    const normalized = this.text(outcome).toLowerCase();
    if (normalized === "passed") return "satisfactory";
    if (normalized === "failed" || normalized === "absent") return "insufficient";
    return "partial";
  }

  rawCandidate(candidateId: string): CertificationCandidateApi | null {
    return this.candidatesSignal().find((item) => this.text(item?.id) === this.text(candidateId)) ?? null;
  }

  private async loadContext(cohortApiId: string, referentialVersionId: string, notify = true): Promise<boolean> {
    this.loading.set(true);
    let ok = true;
    try {
      const [schemes, sessions] = await Promise.all([
        firstValueFrom(this.api.getSchemes(referentialVersionId || undefined)),
        firstValueFrom(this.api.getSessions(cohortApiId)),
      ]);
      this.schemesSignal.set((Array.isArray(schemes) ? schemes : []).map((item) => this.normalizeScheme(item)));
      this.sessionsSignal.set((Array.isArray(sessions) ? sessions : []).map((item) => this.normalizeSession(item)));
      const current = this.text(this.selectedSessionIdSignal());
      const selected = this.sessionsSignal().some((item) => item.id === current)
        ? current
        : this.text(this.sessionsSignal()[0]?.id);
      this.selectedSessionIdSignal.set(selected);
      await this.loadCandidates(selected, notify);
      if (this.session.role() === "stagiaire") await this.loadSelfEnrollment();
      this.loadError.set(false);
    } catch {
      ok = false;
      this.schemesSignal.set([]);
      this.sessionsSignal.set([]);
      this.candidatesSignal.set([]);
      this.loadError.set(true);
      if (notify) this.notifications.error("certification.api.loadFailed", "/certification");
    } finally {
      this.loading.set(false);
    }
    return ok;
  }

  private async loadCandidates(sessionId: string, notify: boolean): Promise<void> {
    if (!sessionId) {
      this.candidatesSignal.set([]);
      return;
    }
    try {
      const candidates = await firstValueFrom(this.api.getCandidates(sessionId));
      this.candidatesSignal.set((Array.isArray(candidates) ? candidates : []).map((item) => this.normalizeCandidate(item)));
    } catch {
      this.candidatesSignal.set([]);
      if (notify) this.notifications.error("certification.api.candidatesLoadFailed", "/certification");
    }
  }

  private async loadSelfEnrollment(): Promise<void> {
    try {
      const self = await firstValueFrom(this.studentProfile.self());
      this.selfEnrollmentIdSignal.set(this.text(self?.enrollmentId));
    } catch {
      this.selfEnrollmentIdSignal.set("");
      this.notifications.error("certification.api.loadFailed", "/certification");
    }
  }

  private currentSchemeApi(): CertificationSchemeApi | null {
    const sessionSchemeId = this.text(this.currentSessionApi()?.schemeId);
    return this.schemesSignal().find((item) => item.id === sessionSchemeId) ?? this.schemesSignal()[0] ?? null;
  }

  private currentSessionApi(): CertificationExamSessionApi | null {
    const selected = this.selectedSessionIdSignal();
    return this.sessionsSignal().find((item) => item.id === selected) ?? this.sessionsSignal()[0] ?? null;
  }

  private mapScheme(raw: CertificationSchemeApi): CertificationScheme {
    const units = (raw.units ?? []).map((unit) => ({
      id: this.text(unit?.id),
      labelKey: this.text(unit?.title),
      shortLabel: this.text(unit?.code),
    }));
    const steps = (raw.steps ?? []).map((step) => ({
      id: this.text(step?.id),
      labelKey: this.text(step?.title),
      duration: this.formatMinutes(this.number(step?.durationMinutes)),
    }));
    return {
      id: this.text(raw?.id),
      programId: this.text(this.workspace.program()?.id),
      code: this.text(raw?.code),
      nameKey: this.text(raw?.name),
      version: this.schemeVersion(raw),
      requiredDocuments: 0,
      units,
      steps,
      juryCriteria: (raw.steps ?? []).map((step) => ({ id: this.text(step?.id), labelKey: this.text(step?.title) })),
    };
  }

  private mapSession(raw: CertificationExamSessionApi): ExamSession {
    return {
      id: this.text(raw?.id),
      name: this.text(raw?.title),
      promotionId: this.text(this.workspace.cohort()?.id),
      promotionName: this.text(this.workspace.cohort()?.name),
      centre: this.text(this.workspace.site()?.name),
      location: this.text(raw?.venue),
      startDate: this.displayDate(raw?.startsAtUtc),
      endDate: this.displayDate(raw?.endsAtUtc),
      status: this.sessionStatus(raw?.status),
      candidateIds: this.candidatesSignal().map((candidate) => this.text(candidate?.id)).filter(Boolean),
      juryIds: this.juryMembers().map((member) => member.id).filter(Boolean),
      programId: this.text(this.workspace.program()?.id),
      schemeId: this.text(raw?.schemeId),
    };
  }

  private mapCandidate(raw: CertificationCandidateApi, scheme: CertificationScheme, session: CertificationExamSessionApi | null): CertificationCandidate {
    const student = this.studentsStore.students().find((item) => this.text(item?.enrollmentId) === this.text(raw?.enrollmentId));
    const rawScheme = this.currentSchemeApi();
    const unitStatuses = (rawScheme?.units ?? []).map((unit) => ({
      unitId: this.text(unit?.id),
      status: this.unitStatus(raw, this.text(unit?.id), rawScheme),
    }));
    const first = unitStatuses[0]?.status ?? "pending";
    const second = unitStatuses[1]?.status ?? "pending";
    const assessmentByStep = new Map((raw.assessments ?? []).map((assessment) => [this.text(assessment?.stepDefinitionId), assessment]));
    const steps: ExamStep[] = (rawScheme?.steps ?? []).map((step) => {
      const assessment = assessmentByStep.get(this.text(step?.id));
      return {
        id: this.text(step?.id),
        labelKey: this.text(step?.title),
        duration: this.formatMinutes(this.number(step?.durationMinutes)),
        status: assessment ? "done" : "planned",
        date: assessment ? this.displayDate(assessment.recordedAtUtc) : this.displayDate(session?.startsAtUtc),
        time: assessment ? this.displayTime(assessment.recordedAtUtc) : this.displayTime(session?.startsAtUtc),
      };
    });

    return {
      id: this.text(raw?.id),
      studentId: this.text(student?.id),
      firstName: this.text(student?.firstName),
      lastName: this.text(student?.lastName),
      candidateNumber: "",
      promotionId: this.text(this.workspace.cohort()?.id),
      ready: raw?.eligible === true,
      missingKeys: [],
      completedHours: this.number(student?.completedHours),
      plannedHours: 0,
      documentsReady: 0,
      documentsTotal: 0,
      ccp1: first,
      ccp2: second,
      result: this.result(raw?.decision),
      published: this.text(raw?.status).toLowerCase() === "published",
      examTime: this.displayTime(session?.startsAtUtc),
      steps,
      programId: this.text(this.workspace.program()?.id),
      schemeId: scheme.id,
      unitStatuses,
    };
  }

  private unitStatus(candidate: CertificationCandidateApi, unitId: string, scheme: CertificationSchemeApi | null): CertificationUnitStatus {
    const stepIds = (scheme?.steps ?? []).filter((step) => this.text(step?.unitId) === unitId).map((step) => this.text(step?.id));
    if (!stepIds.length) return "pending";
    const assessments = (candidate.assessments ?? []).filter((assessment) => stepIds.includes(this.text(assessment?.stepDefinitionId)));
    if (!assessments.length) return "pending";
    if (assessments.some((assessment) => ["failed", "absent"].includes(this.text(assessment?.outcome).toLowerCase()))) return "not_validated";
    if (assessments.length === stepIds.length && assessments.every((assessment) => this.text(assessment?.outcome).toLowerCase() === "passed")) return "validated";
    return "pending";
  }

  private replaceCandidate(candidate: CertificationCandidateApi): void {
    this.candidatesSignal.update((items) => items.map((item) => item.id === candidate.id ? candidate : item));
  }

  private normalizeScheme(raw: CertificationSchemeApi): CertificationSchemeApi {
    return {
      id: this.text(raw?.id), referentialVersionId: this.text(raw?.referentialVersionId), code: this.text(raw?.code),
      name: this.text(raw?.name), status: this.text(raw?.status), effectiveFrom: this.optionalText(raw?.effectiveFrom),
      effectiveTo: this.optionalText(raw?.effectiveTo), units: Array.isArray(raw?.units) ? raw.units : [], steps: Array.isArray(raw?.steps) ? raw.steps : [],
    };
  }

  private normalizeSession(raw: CertificationExamSessionApi): CertificationExamSessionApi {
    return {
      id: this.text(raw?.id), organizationId: this.text(raw?.organizationId), siteId: this.text(raw?.siteId), cohortId: this.text(raw?.cohortId),
      schemeId: this.text(raw?.schemeId), title: this.text(raw?.title), startsAtUtc: this.text(raw?.startsAtUtc), endsAtUtc: this.text(raw?.endsAtUtc),
      venue: this.optionalText(raw?.venue), status: this.text(raw?.status),
    };
  }

  private normalizeCandidate(raw: CertificationCandidateApi): CertificationCandidateApi {
    return {
      id: this.text(raw?.id), examSessionId: this.text(raw?.examSessionId), enrollmentId: this.text(raw?.enrollmentId), status: this.text(raw?.status),
      eligible: typeof raw?.eligible === "boolean" ? raw.eligible : null, decision: this.text(raw?.decision), decisionComment: this.optionalText(raw?.decisionComment),
      decisionAtUtc: this.optionalText(raw?.decisionAtUtc), assessments: Array.isArray(raw?.assessments) ? raw.assessments.map((item) => ({
        id: this.text(item?.id), stepDefinitionId: this.text(item?.stepDefinitionId), juryDisplayName: this.text(item?.juryDisplayName), outcome: this.text(item?.outcome),
        score: typeof item?.score === "number" ? item.score : null, comment: this.optionalText(item?.comment), recordedAtUtc: this.text(item?.recordedAtUtc),
      })) : [],
    };
  }

  private sessionStatus(value: unknown): ExamSessionStatus {
    switch (this.text(value).toLowerCase()) {
      case "planned": return "ready";
      case "inprogress": return "running";
      case "completed": return "deliberation";
      case "published": return "published";
      case "cancelled": return "closed";
      default: return "preparation";
    }
  }

  private result(value: unknown): CertificationCandidate["result"] {
    const normalized = this.text(value).toLowerCase();
    if (normalized === "obtained" || normalized === "partial" || normalized === "failed" || normalized === "absent") return normalized;
    return "pending";
  }

  private schemeVersion(raw: CertificationSchemeApi): string {
    const effective = this.text(raw?.effectiveFrom);
    if (/^\d{4}/.test(effective)) return effective.slice(0, 4);
    const codeYear = this.text(raw?.code).match(/(20\d{2})/);
    return codeYear?.[1] ?? "";
  }

  private displayDate(value: unknown): string {
    const date = new Date(this.text(value));
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  private displayTime(value: unknown): string {
    const date = new Date(this.text(value));
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  }

  private formatMinutes(value: number): string {
    if (value <= 0) return "0 min";
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    if (!hours) return `${minutes} min`;
    return minutes ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${hours} h`;
  }

  private currentUserName(): string {
    const user = this.session.session();
    return `${this.text(user?.firstName)} ${this.text(user?.lastName)}`.trim() || this.text(user?.email) || "";
  }

  private optionalText(value: unknown): string | null {
    const text = this.text(value).trim();
    return text || null;
  }

  private text(value: unknown): string { return typeof value === "string" ? value : ""; }
  private number(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
}
