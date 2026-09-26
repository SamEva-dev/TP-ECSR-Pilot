import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import type { AsyncLearningModuleApi, DistanceLearningSessionApi, DistanceParticipantApi } from "../distance-learning/distance-learning.models";
import { DistanceLearningApiService } from "../distance-learning/distance-learning-api.service";
import type {
  DistanceAsyncModule,
  DistanceAttendanceStatus,
  DistanceLiveSession,
  DistanceModuleStatus,
  DistancePlatform,
} from "../models/distance-learning.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionService } from "../session/session.service";
import { StudentApiStoreService } from "./student-api-store.service";
import { parisInstant } from "../training-delivery/paris-time";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

@Injectable({ providedIn: "root" })
export class DistanceLearningApiStoreService {
  private readonly api = inject(DistanceLearningApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly session = inject(SessionService);
  private readonly students = inject(StudentApiStoreService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly realtime = inject(RealtimeService);

  private readonly rawSessions = signal<DistanceLearningSessionApi[]>([]);
  private readonly rawModules = signal<AsyncLearningModuleApi[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly saving = signal(false);

  readonly sessions = computed<DistanceLiveSession[]>(() => this.rawSessions().map((item) => this.mapSession(item)));
  readonly modules = computed<DistanceAsyncModule[]>(() => this.rawModules().map((item) => this.mapModule(item)));

  constructor() {
    void this.realtime.start().catch(() => undefined);
    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const cohortId = this.text(this.workspace.cohort()?.apiId);
      this.rawSessions.set([]);
      this.rawModules.set([]);
      this.loadError.set(false);
      if (ready && cohortId) void this.load(cohortId);
    });
    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.distance\./.test(event.typeKey)) return;
      untracked(() => void this.reload(false));
    });
  }

  async reload(notify = true): Promise<boolean> {
    const cohortId = this.text(this.workspace.cohort()?.apiId);
    if (!cohortId) {
      this.rawSessions.set([]);
      this.rawModules.set([]);
      return true;
    }
    return this.load(cohortId, notify);
  }

  async createLive(value: { title: string; date: string; start: string; end: string; platform: DistancePlatform; joinUrl: string }): Promise<DistanceLiveSession | null> {
    const siteId = this.text(this.workspace.site()?.apiId || this.workspace.site()?.id);
    const programId = this.text(this.workspace.program()?.apiId || this.workspace.program()?.id);
    const cohortId = this.text(this.workspace.cohort()?.apiId);
    const startsAtUtc = parisInstant(this.text(value.date), this.text(value.start));
    const endsAtUtc = parisInstant(this.text(value.date), this.text(value.end));
    if (!siteId || !programId || !cohortId || !startsAtUtc || !endsAtUtc || !this.text(value.title).trim() || !this.text(value.joinUrl).trim()) {
      this.notifications.error("distanceLearning.api.createFailed", "/distanciel");
      return null;
    }
    this.saving.set(true);
    try {
      let created = this.normalizeSession(await this.api.createSession({
        siteId, programId, cohortId,
        title: this.text(value.title).trim(),
        trainerDisplayName: this.currentUserName(),
        trainerEmail: this.optionalText(this.session.session()?.email),
        startsAtUtc, endsAtUtc,
        platform: this.text(value.platform),
        joinUrl: this.text(value.joinUrl).trim(),
        objectives: null,
      }));
      for (const learner of this.students.students()) {
        const enrollmentId = this.text(learner.enrollmentId);
        if (!enrollmentId) continue;
        created = this.normalizeSession(await this.api.addParticipant(created.id, {
          enrollmentId,
          displayName: `${this.text(learner.firstName)} ${this.text(learner.lastName)}`.trim(),
        }));
      }
      this.rawSessions.update((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      await this.reload(false);
      return this.mapSession(created);
    } catch {
      this.notifications.error("distanceLearning.api.createFailed", "/distanciel");
      return null;
    } finally { this.saving.set(false); }
  }

  async createModule(value: { title: string; estimatedMinutes: number; dueDate: string }): Promise<DistanceAsyncModule | null> {
    const siteId = this.text(this.workspace.site()?.apiId || this.workspace.site()?.id);
    const programId = this.text(this.workspace.program()?.apiId || this.workspace.program()?.id);
    const cohortId = this.text(this.workspace.cohort()?.apiId);
    const expectedStudents = this.number(this.workspace.cohort()?.studentCount);
    if (!siteId || !programId || !cohortId || !this.text(value.title).trim() || this.number(value.estimatedMinutes) <= 0 || !this.text(value.dueDate)) {
      this.notifications.error("distanceLearning.api.createFailed", "/distanciel");
      return null;
    }
    this.saving.set(true);
    try {
      const created = this.normalizeModule(await this.api.createModule({
        siteId, programId, cohortId,
        title: this.text(value.title).trim(),
        description: null,
        estimatedMinutes: this.number(value.estimatedMinutes),
        dueDate: this.text(value.dueDate),
        trainerDisplayName: this.currentUserName(),
        expectedStudents,
        steps: [],
      }));
      this.rawModules.update((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      await this.reload(false);
      return this.mapModule(created);
    } catch {
      this.notifications.error("distanceLearning.api.createFailed", "/distanciel");
      return null;
    } finally { this.saving.set(false); }
  }

  async cycleAttendance(sessionId: string, participantId: string): Promise<boolean> {
    const rawSession = this.rawSessions().find((item) => item.id === this.text(sessionId));
    const participant = rawSession?.participants?.find((item) => item.id === this.text(participantId));
    if (!rawSession || !participant) return false;
    const current = this.attendance(participant.attendance);
    const order: DistanceAttendanceStatus[] = ["present", "late", "disconnected", "absent"];
    const next = order[(Math.max(order.indexOf(current), -1) + 1) % order.length];
    try {
      const updated = this.normalizeSession(await this.api.updateAttendance(rawSession.id, participant.id, {
        attendance: next,
        connectedAtUtc: participant.connectedAtUtc ?? null,
        disconnectedAtUtc: participant.disconnectedAtUtc ?? null,
        connectedMinutes: this.number(participant.connectedMinutes),
        participationPercent: this.number(participant.participationPercent),
        completedActivities: this.number(participant.completedActivities),
        activityCount: this.number(participant.activityCount),
      }));
      this.replaceSession(updated);
      return true;
    } catch {
      this.notifications.error("distanceLearning.api.attendanceFailed", "/distanciel");
      return false;
    }
  }

  async toggleModuleStep(moduleId: string, stepId: string): Promise<boolean> {
    const raw = this.rawModules().find((item) => item.id === this.text(moduleId));
    if (!raw || !(raw.steps ?? []).length) return false;
    const ordered = [...raw.steps].sort((a, b) => this.number(a.sortOrder) - this.number(b.sortOrder));
    const currentDone = Math.round((this.number(raw.progressPercent) / 100) * ordered.length);
    const index = ordered.findIndex((step) => step.id === this.text(stepId));
    if (index < 0) return false;
    const targetDone = index < currentDone ? index : index + 1;
    const progressPercent = Math.round((targetDone / Math.max(ordered.length, 1)) * 100);
    try {
      const updated = this.normalizeModule(await this.api.updateModuleProgress(raw.id, {
        progressPercent,
        completedStudents: this.number(raw.completedStudents),
        averageScore: typeof raw.averageScore === "number" ? raw.averageScore : null,
      }));
      this.replaceModule(updated);
      return true;
    } catch {
      this.notifications.error("distanceLearning.api.progressFailed", "/distanciel");
      return false;
    }
  }

  rawJoinUrl(sessionId: string): string {
    return this.text(this.rawSessions().find((item) => item.id === this.text(sessionId))?.joinUrl);
  }

  readonly totalLiveHours = computed(() => Math.round(this.rawSessions().reduce((total, item) => {
    const start = new Date(this.text(item?.startsAtUtc)).getTime();
    const end = new Date(this.text(item?.endsAtUtc)).getTime();
    return total + (Number.isFinite(start) && Number.isFinite(end) && end > start ? (end - start) / 3_600_000 : 0);
  }, 0)));
  readonly totalAsyncHours = computed(() => Math.round(this.rawModules().reduce((total, item) => total + this.number(item?.estimatedMinutes), 0) / 60));

  private async load(cohortId: string, notify = true): Promise<boolean> {
    this.loading.set(true);
    try {
      const [sessions, modules] = await Promise.all([this.api.sessions(cohortId), this.api.modules(cohortId)]);
      this.rawSessions.set((Array.isArray(sessions) ? sessions : []).map((item) => this.normalizeSession(item)));
      this.rawModules.set((Array.isArray(modules) ? modules : []).map((item) => this.normalizeModule(item)));
      this.loadError.set(false);
      return true;
    } catch {
      this.rawSessions.set([]);
      this.rawModules.set([]);
      this.loadError.set(true);
      if (notify) this.notifications.error("distanceLearning.api.loadFailed", "/distanciel");
      return false;
    } finally { this.loading.set(false); }
  }

  private mapSession(raw: DistanceLearningSessionApi): DistanceLiveSession {
    return {
      id: this.text(raw?.id), organizationId: this.text(raw?.organizationId), siteId: this.text(raw?.siteId), programId: this.text(raw?.programId), cohortId: this.text(raw?.cohortId),
      titleKey: this.text(raw?.title), trainer: this.text(raw?.trainerDisplayName), date: this.displayDate(raw?.startsAtUtc), start: this.displayTime(raw?.startsAtUtc), end: this.displayTime(raw?.endsAtUtc),
      platform: this.platform(raw?.platform), joinUrl: this.text(raw?.joinUrl), status: this.sessionStatus(raw?.status), expected: this.number(this.workspace.cohort()?.studentCount),
      objectivesKey: this.text(raw?.objectives), participants: (raw.participants ?? []).map((item) => this.mapParticipant(item)), resourceIds: [], interactionIds: [],
    };
  }

  private mapParticipant(raw: DistanceParticipantApi) {
    return {
      id: this.text(raw?.id), studentId: this.text(raw?.enrollmentId), name: this.text(raw?.displayName), attendance: this.attendance(raw?.attendance),
      connectedAt: this.displayTime(raw?.connectedAtUtc), disconnectedAt: this.displayTime(raw?.disconnectedAtUtc), connectedMinutes: this.number(raw?.connectedMinutes),
      participation: this.number(raw?.participationPercent), completedActivities: this.number(raw?.completedActivities), activityCount: this.number(raw?.activityCount),
    };
  }

  private mapModule(raw: AsyncLearningModuleApi): DistanceAsyncModule {
    const ordered = [...(raw.steps ?? [])].sort((a, b) => this.number(a.sortOrder) - this.number(b.sortOrder));
    const completedCount = Math.round((this.number(raw.progressPercent) / 100) * ordered.length);
    return {
      id: this.text(raw?.id), organizationId: this.text(raw?.organizationId), siteId: this.text(raw?.siteId), programId: this.text(raw?.programId), cohortId: this.text(raw?.cohortId),
      titleKey: this.text(raw?.title), descriptionKey: this.text(raw?.description), estimatedMinutes: this.number(raw?.estimatedMinutes), dueDate: this.displayDateOnly(raw?.dueDate),
      trainer: this.text(raw?.trainerDisplayName), status: this.moduleStatus(raw?.status), progress: this.number(raw?.progressPercent), completedStudents: this.number(raw?.completedStudents),
      expectedStudents: this.number(raw?.expectedStudents), score: this.number(raw?.averageScore),
      steps: ordered.map((step, index) => ({ id: this.text(step?.id), labelKey: this.text(step?.label), completed: index < completedCount })),
    };
  }

  private replaceSession(row: DistanceLearningSessionApi): void { this.rawSessions.update((items) => items.map((item) => item.id === row.id ? row : item)); }
  private replaceModule(row: AsyncLearningModuleApi): void { this.rawModules.update((items) => items.map((item) => item.id === row.id ? row : item)); }

  private normalizeSession(raw: DistanceLearningSessionApi): DistanceLearningSessionApi {
    return {
      id: this.text(raw?.id), organizationId: this.text(raw?.organizationId), siteId: this.text(raw?.siteId), programId: this.text(raw?.programId), cohortId: this.text(raw?.cohortId),
      title: this.text(raw?.title), trainerDisplayName: this.text(raw?.trainerDisplayName), trainerEmail: this.optionalText(raw?.trainerEmail), startsAtUtc: this.text(raw?.startsAtUtc), endsAtUtc: this.text(raw?.endsAtUtc),
      platform: this.text(raw?.platform), joinUrl: this.text(raw?.joinUrl), objectives: this.optionalText(raw?.objectives), status: this.text(raw?.status),
      participants: Array.isArray(raw?.participants) ? raw.participants.map((participant) => ({
        id: this.text(participant?.id), enrollmentId: this.text(participant?.enrollmentId), displayName: this.text(participant?.displayName), attendance: this.text(participant?.attendance),
        connectedAtUtc: this.optionalText(participant?.connectedAtUtc), disconnectedAtUtc: this.optionalText(participant?.disconnectedAtUtc), connectedMinutes: this.number(participant?.connectedMinutes),
        participationPercent: this.number(participant?.participationPercent), completedActivities: this.number(participant?.completedActivities), activityCount: this.number(participant?.activityCount),
      })) : [],
    };
  }

  private normalizeModule(raw: AsyncLearningModuleApi): AsyncLearningModuleApi {
    return {
      id: this.text(raw?.id), organizationId: this.text(raw?.organizationId), siteId: this.text(raw?.siteId), programId: this.text(raw?.programId), cohortId: this.text(raw?.cohortId),
      title: this.text(raw?.title), description: this.optionalText(raw?.description), estimatedMinutes: this.number(raw?.estimatedMinutes), dueDate: this.text(raw?.dueDate),
      trainerDisplayName: this.text(raw?.trainerDisplayName), status: this.text(raw?.status), progressPercent: this.number(raw?.progressPercent), completedStudents: this.number(raw?.completedStudents),
      expectedStudents: this.number(raw?.expectedStudents), averageScore: typeof raw?.averageScore === "number" ? raw.averageScore : null,
      steps: Array.isArray(raw?.steps) ? raw.steps.map((step) => ({ id: this.text(step?.id), code: this.text(step?.code), label: this.text(step?.label), sortOrder: this.number(step?.sortOrder) })) : [],
    };
  }

  private sessionStatus(value: unknown): DistanceLiveSession["status"] { const x = this.text(value).toLowerCase(); return x === "live" ? "live" : x === "closed" || x === "cancelled" ? "closed" : "scheduled"; }
  private moduleStatus(value: unknown): DistanceModuleStatus { const x = this.text(value).toLowerCase(); if (x === "inprogress") return "in-progress"; if (x === "completed") return "completed"; if (x === "late") return "late"; return "not-started"; }
  private attendance(value: unknown): DistanceAttendanceStatus { const x = this.text(value).toLowerCase(); if (x === "present" || x === "late" || x === "absent" || x === "disconnected") return x; return "absent"; }
  private platform(value: unknown): DistancePlatform { const x = this.text(value).toLowerCase(); return x === "teams" || x === "zoom" || x === "meet" || x === "jitsi" ? x : "other"; }

  private displayDate(value: unknown): string { const d = new Date(this.text(value)); return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(d); }
  private displayTime(value: unknown): string { const d = new Date(this.text(value)); return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d); }
  private displayDateOnly(value: unknown): string { const text = this.text(value); if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return ""; const [y,m,d] = text.slice(0,10).split("-"); return `${d}/${m}/${y}`; }
  private currentUserName(): string { const u = this.session.session(); return `${this.text(u?.firstName)} ${this.text(u?.lastName)}`.trim() || this.text(u?.email) || ""; }
  private optionalText(value: unknown): string | null { const x = this.text(value).trim(); return x || null; }
  private text(value: unknown): string { return typeof value === "string" ? value : ""; }
  private number(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
}
