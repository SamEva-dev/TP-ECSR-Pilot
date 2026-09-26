import { Injectable, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { AlertLevel, SessionType, StudentStatus } from "../models/app.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { ReportingApiService } from "../reporting/reporting-api.service";
import type {
  CohortDashboard,
  CohortDrivingObservation,
  CohortLearnerDashboard,
} from "../reporting/reporting.models";
import { SessionService } from "../session/session.service";
import {
  StudentProfileApiService,
  type DrivingEvaluationApi,
  type TopicProgressApi,
} from "../students/student-profile-api.service";
import {
  TrainingDeliveryApiService,
  type TrainingSessionApi,
} from "../training-delivery/training-delivery-api.service";
import { TranslateService } from "../i18n/translate.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

export interface HomeStudent {
  id: string;
  enrollmentId: string;
  firstName: string;
  lastName: string;
  progress: number;
  plannedHours: number;
  completedHours: number;
  catchupHours: number;
  preparedSheets: number;
  validatedSheets: number;
  totalSheets: number;
  status: StudentStatus;
  skills: Record<"C1" | "C2" | "C3" | "C4", number>;
}

export interface HomeMetrics {
  trainers: number;
  attendanceRate: number;
  completedHours: number;
  remainingHours: number;
  catchupHours: number;
  progress: number;
  totalPlannedHours: number;
  volumeDone: number;
  sheetCount: number;
}

export interface HomeAgendaItem {
  id: string;
  time: string;
  target: string;
  subject: string;
  type: SessionType;
}

export interface HomeObservation {
  id: string;
  enrollmentId: string;
  studentName: string;
  date: string;
  competence: string;
  subject: string;
  positive: string;
  workOn: string;
  nextGoal: string;
}

export interface HomeTimelineItem {
  id: string;
  date: string;
  title: string;
  detail: string;
  status: "valid" | "absence" | "driving" | "classroom";
}

export interface HomeNextSession {
  dateText: string;
  title: string;
  meta: string;
}

const EMPTY_METRICS: HomeMetrics = {
  trainers: 0,
  attendanceRate: 0,
  completedHours: 0,
  remainingHours: 0,
  catchupHours: 0,
  progress: 0,
  totalPlannedHours: 0,
  volumeDone: 0,
  sheetCount: 0,
};

const EMPTY_STUDENT: HomeStudent = {
  id: "",
  enrollmentId: "",
  firstName: "",
  lastName: "",
  progress: 0,
  plannedHours: 0,
  completedHours: 0,
  catchupHours: 0,
  preparedSheets: 0,
  validatedSheets: 0,
  totalSheets: 0,
  status: "good",
  skills: { C1: 0, C2: 0, C3: 0, C4: 0 },
};

@Injectable({ providedIn: "root" })
export class HomeDashboardApiStoreService {
  private readonly reporting = inject(ReportingApiService);
  private readonly profiles = inject(StudentProfileApiService);
  private readonly delivery = inject(TrainingDeliveryApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly session = inject(SessionService);
  private readonly realtime = inject(RealtimeService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly translate = inject(TranslateService);

  private readonly studentsSignal = signal<HomeStudent[]>([]);
  private readonly metricsSignal = signal<HomeMetrics>({ ...EMPTY_METRICS });
  private readonly agendaSignal = signal<HomeAgendaItem[]>([]);
  private readonly observationsSignal = signal<HomeObservation[]>([]);
  private readonly timelineSignal = signal<HomeTimelineItem[]>([]);
  private readonly nextSessionsSignal = signal<HomeNextSession[]>([]);
  private readonly selfStudentSignal = signal<HomeStudent>({ ...EMPTY_STUDENT, skills: { ...EMPTY_STUDENT.skills } });
  private readonly openAlertsSignal = signal(0);

  readonly students = this.studentsSignal.asReadonly();
  readonly metrics = this.metricsSignal.asReadonly();
  readonly trainerAgenda = this.agendaSignal.asReadonly();
  readonly observations = this.observationsSignal.asReadonly();
  readonly timeline = this.timelineSignal.asReadonly();
  readonly nextSessions = this.nextSessionsSignal.asReadonly();
  readonly selfStudent = this.selfStudentSignal.asReadonly();
  readonly openAlerts = this.openAlertsSignal.asReadonly();
  readonly loading = signal(false);
  readonly loadError = signal(false);

  private generation = 0;
  private request = 0;

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const cohortApiId = this.workspace.cohort()?.apiId ?? "";
      const role = this.session.role();
      this.translate.locale();
      const generation = ++this.generation;
      this.reset();
      if (ready && cohortApiId) void this.reload(generation, cohortApiId, role);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (
        !event ||
        !/^(pedagora\.(training\.(session|attendance|enrollment)\.|learning\.(topic|competency|driving)|certification\.|workplace\.))/.test(
          event.typeKey,
        )
      )
        return;
      untracked(() => {
        if (this.workspace.cohort()?.apiId) void this.reload();
      });
    });
  }

  async reload(
    generation = this.generation,
    cohortApiId = this.workspace.cohort()?.apiId ?? "",
    role = this.session.role(),
  ): Promise<boolean> {
    if (!cohortApiId) {
      this.reset();
      return true;
    }

    const request = ++this.request;
    this.loading.set(true);
    try {
      if (role === "direction" || role === "secretariat" || role === "formateur") {
        await this.loadStaff(cohortApiId, generation, request);
      } else {
        await this.loadSelf(cohortApiId, generation, request);
      }
      if (generation !== this.generation || request !== this.request) return false;
      this.loadError.set(false);
      return true;
    } catch {
      if (generation === this.generation && request === this.request) {
        this.resetDataOnly();
        this.loadError.set(true);
        this.notifications.error("home.api.loadFailed", "/accueil");
      }
      return false;
    } finally {
      if (generation === this.generation && request === this.request) this.loading.set(false);
    }
  }

  private async loadStaff(cohortApiId: string, generation: number, request: number): Promise<void> {
    const [learnerResult, sessionsResult, dashboardResult, observationsResult] = await Promise.allSettled([
      firstValueFrom(this.reporting.cohortLearners(cohortApiId)),
      this.delivery.list(cohortApiId),
      firstValueFrom(this.reporting.cohortDashboard(cohortApiId)),
      firstValueFrom(this.reporting.cohortDrivingObservations(cohortApiId, 12)),
    ]);
    if (generation !== this.generation || request !== this.request) return;

    if (learnerResult.status === "rejected") this.notifications.error("home.api.learnersFailed", "/accueil");
    if (sessionsResult.status === "rejected") this.notifications.error("home.api.sessionsFailed", "/accueil");
    if (dashboardResult.status === "rejected") this.notifications.error("home.api.metricsFailed", "/accueil");
    if (observationsResult.status === "rejected") this.notifications.error("home.api.observationsFailed", "/accueil");

    const learnerRows = learnerResult.status === "fulfilled" && Array.isArray(learnerResult.value) ? learnerResult.value : [];
    const students = learnerRows.map((row) => this.student(row));
    const sessions = sessionsResult.status === "fulfilled" && Array.isArray(sessionsResult.value) ? sessionsResult.value.map((row) => this.sessionRow(row)) : [];
    const dashboard = dashboardResult.status === "fulfilled" ? this.dashboard(dashboardResult.value) : null;
    const observations = observationsResult.status === "fulfilled" && Array.isArray(observationsResult.value)
      ? observationsResult.value.map((row) => this.observation(row))
      : [];

    this.studentsSignal.set(students);
    this.metricsSignal.set(this.staffMetrics(students, sessions, dashboard));
    this.agendaSignal.set(this.agenda(sessions, students));
    this.observationsSignal.set(observations);
    this.openAlertsSignal.set(this.number(dashboard?.openAlerts));
  }

  private async loadSelf(cohortApiId: string, generation: number, request: number): Promise<void> {
    const [summaryResult, sessionsResult] = await Promise.allSettled([
      firstValueFrom(this.reporting.myLearnerDashboard(cohortApiId)),
      this.delivery.list(cohortApiId),
    ]);
    if (generation !== this.generation || request !== this.request) return;

    if (summaryResult.status === "rejected") this.notifications.error("home.api.studentFailed", "/accueil");
    if (sessionsResult.status === "rejected") this.notifications.error("home.api.sessionsFailed", "/accueil");

    const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
    const student = summary ? this.student(summary) : { ...EMPTY_STUDENT, skills: { ...EMPTY_STUDENT.skills } };
    const sessions = sessionsResult.status === "fulfilled" && Array.isArray(sessionsResult.value) ? sessionsResult.value.map((row) => this.sessionRow(row)) : [];

    this.selfStudentSignal.set(student);
    this.studentsSignal.set(student.enrollmentId ? [student] : []);
    this.metricsSignal.set({
      ...EMPTY_METRICS,
      completedHours: student.completedHours,
      remainingHours: Math.max(0, student.plannedHours - student.completedHours),
      catchupHours: student.catchupHours,
      progress: student.progress,
      totalPlannedHours: student.plannedHours,
      volumeDone: this.percent(student.completedHours, student.plannedHours),
      sheetCount: student.totalSheets,
    });
    this.nextSessionsSignal.set(this.studentNextSessions(sessions, student.enrollmentId));

    if (!student.enrollmentId) return;
    const [topicsResult, drivingResult] = await Promise.allSettled([
      firstValueFrom(this.profiles.topics(student.enrollmentId)),
      firstValueFrom(this.profiles.driving(student.enrollmentId)),
    ]);
    if (generation !== this.generation || request !== this.request) return;

    if (topicsResult.status === "rejected") this.notifications.error("home.api.timelineFailed", "/accueil");
    if (drivingResult.status === "rejected") this.notifications.error("home.api.observationsFailed", "/accueil");

    const topics = topicsResult.status === "fulfilled" && Array.isArray(topicsResult.value) ? topicsResult.value : [];
    const driving = drivingResult.status === "fulfilled" && Array.isArray(drivingResult.value) ? drivingResult.value : [];
    this.observationsSignal.set(driving.map((row) => this.selfObservation(row, student)));
    this.timelineSignal.set(this.buildTimeline(topics, driving));
  }

  private staffMetrics(students: HomeStudent[], sessions: TrainingSessionApi[], dashboard: CohortDashboard | null): HomeMetrics {
    const trainerNames = new Set(sessions.map((row) => this.text(row.trainerDisplayName).trim().toLowerCase()).filter(Boolean));
    const completedHours = this.round1(students.reduce((sum, row) => sum + row.completedHours, 0));
    const plannedHours = this.round1(students.reduce((sum, row) => sum + row.plannedHours, 0));
    const catchupHours = this.round1(students.reduce((sum, row) => sum + row.catchupHours, 0));
    const progress = dashboard ? this.number(dashboard.averageCompetencyProgress) : this.average(students.map((row) => row.progress));
    const sheetCount = students.reduce((max, row) => Math.max(max, row.totalSheets), 0);
    return {
      trainers: trainerNames.size,
      attendanceRate: this.number(dashboard?.attendanceRate),
      completedHours,
      remainingHours: Math.max(0, this.round1(plannedHours - completedHours)),
      catchupHours,
      progress,
      totalPlannedHours: plannedHours,
      volumeDone: this.percent(completedHours, plannedHours),
      sheetCount,
    };
  }

  private student(row: CohortLearnerDashboard): HomeStudent {
    const completedHours = this.round1(this.number(row?.completedMinutes) / 60);
    const catchupHours = this.round1(this.number(row?.catchupMinutes) / 60);
    const plannedHours = this.round1(this.number(row?.plannedMinutes) / 60);
    return {
      id: this.text(row?.learnerProfileId),
      enrollmentId: this.text(row?.enrollmentId),
      firstName: this.text(row?.firstName),
      lastName: this.text(row?.lastName),
      progress: this.number(row?.averageCompetencyProgress),
      plannedHours,
      completedHours,
      catchupHours,
      preparedSheets: this.number(row?.preparedTopics),
      validatedSheets: this.number(row?.validatedTopics),
      totalSheets: this.number(row?.totalTopics),
      status: this.status(this.text(row?.enrollmentStatus), catchupHours),
      skills: {
        C1: this.competency(row?.competencies, "C1"),
        C2: this.competency(row?.competencies, "C2"),
        C3: this.competency(row?.competencies, "C3"),
        C4: this.competency(row?.competencies, "C4"),
      },
    };
  }

  private observation(row: CohortDrivingObservation): HomeObservation {
    return {
      id: this.text(row?.id),
      enrollmentId: this.text(row?.enrollmentId),
      studentName: this.text(row?.learnerDisplayName),
      date: this.formatDate(row?.evaluatedAtUtc),
      competence: this.text(row?.competencyCode),
      subject: this.text(row?.subject),
      positive: this.text(row?.positive),
      workOn: this.text(row?.difficulty),
      nextGoal: this.text(row?.nextGoal),
    };
  }

  private selfObservation(row: DrivingEvaluationApi, student: HomeStudent): HomeObservation {
    return {
      id: this.text(row?.id),
      enrollmentId: student.enrollmentId,
      studentName: [student.firstName, student.lastName].filter(Boolean).join(" "),
      date: this.formatDate(row?.evaluatedAtUtc),
      competence: "",
      subject: this.text(row?.subject),
      positive: this.text(row?.positive),
      workOn: this.text(row?.difficulty),
      nextGoal: this.text(row?.nextGoal),
    };
  }

  private agenda(sessions: TrainingSessionApi[], students: HomeStudent[]): HomeAgendaItem[] {
    const user = this.session.session();
    const userId = this.text(user?.userId).toLowerCase();
    const userName = [this.text(user?.firstName), this.text(user?.lastName)].filter(Boolean).join(" ").trim().toLowerCase();
    const now = Date.now();
    return sessions
      .filter((row) => {
        const start = Date.parse(this.text(row.startsAtUtc));
        if (!Number.isFinite(start) || start < now - 6 * 60 * 60 * 1000) return false;
        const trainerId = this.text(row.trainerAuthGateUserId).toLowerCase();
        const trainerName = this.text(row.trainerDisplayName).trim().toLowerCase();
        return (!!userId && trainerId === userId) || (!!userName && trainerName === userName);
      })
      .sort((a, b) => Date.parse(a.startsAtUtc) - Date.parse(b.startsAtUtc))
      .slice(0, 5)
      .map((row) => ({
        id: this.text(row.id),
        time: this.formatTime(row.startsAtUtc),
        target: this.sessionTarget(row, students),
        subject: this.text(row.title),
        type: this.homeType(row.type),
      }));
  }

  private studentNextSessions(sessions: TrainingSessionApi[], enrollmentId: string): HomeNextSession[] {
    const now = Date.now();
    return sessions
      .filter((row) => {
        const start = Date.parse(this.text(row.startsAtUtc));
        if (!Number.isFinite(start) || start < now) return false;
        return row.audienceMode === "whole-cohort" || (Array.isArray(row.participantEnrollmentIds) && row.participantEnrollmentIds.includes(enrollmentId));
      })
      .sort((a, b) => Date.parse(a.startsAtUtc) - Date.parse(b.startsAtUtc))
      .slice(0, 2)
      .map((row) => ({
        dateText: this.formatSessionDate(row.startsAtUtc, row.endsAtUtc),
        title: this.text(row.title),
        meta: [this.text(row.trainerDisplayName), this.text(row.location)].filter(Boolean).join(" · "),
      }));
  }

  private buildTimeline(topics: TopicProgressApi[], driving: DrivingEvaluationApi[]): HomeTimelineItem[] {
    const topicItems = topics
      .map((row) => {
        const date = this.text(row.presentationDate) || this.text(row.preparationDate);
        if (!date) return null;
        const status = this.text(row.status);
        return {
          id: `topic-${this.text(row.id)}`,
          sort: Date.parse(`${date}T00:00:00Z`),
          date: this.formatDate(date),
          title: this.text(row.title),
          detail: this.translate.instant(`sheets.status.${status}`),
          status: "valid" as const,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const drivingItems = driving.map((row) => ({
      id: `driving-${this.text(row.id)}`,
      sort: Date.parse(this.text(row.evaluatedAtUtc)),
      date: this.formatDate(row.evaluatedAtUtc),
      title: this.text(row.subject),
      detail: this.text(row.nextGoal) || this.text(row.freeObservation),
      status: "driving" as const,
    }));
    return [...topicItems, ...drivingItems]
      .sort((a, b) => (Number.isFinite(b.sort) ? b.sort : 0) - (Number.isFinite(a.sort) ? a.sort : 0))
      .slice(0, 4)
      .map(({ sort: _sort, ...item }) => item);
  }

  private sessionTarget(row: TrainingSessionApi, students: HomeStudent[]): string {
    const participants = Array.isArray(row.participantEnrollmentIds) ? row.participantEnrollmentIds : [];
    if (row.audienceMode === "selected-enrollments" && participants.length === 1) {
      const learner = students.find((item) => item.enrollmentId === participants[0]);
      if (learner) return [learner.firstName, learner.lastName].filter(Boolean).join(" ");
    }
    return this.text(this.workspace.cohort()?.name);
  }

  private sessionRow(row: TrainingSessionApi): TrainingSessionApi {
    return {
      ...row,
      id: this.text(row?.id),
      organizationId: this.text(row?.organizationId),
      siteId: this.text(row?.siteId),
      cohortId: this.text(row?.cohortId),
      title: this.text(row?.title),
      startsAtUtc: this.text(row?.startsAtUtc),
      endsAtUtc: this.text(row?.endsAtUtc),
      timeZoneId: this.text(row?.timeZoneId) || "Europe/Paris",
      trainerAuthGateUserId: this.text(row?.trainerAuthGateUserId),
      trainerDisplayName: this.text(row?.trainerDisplayName),
      location: this.text(row?.location),
      objective: this.text(row?.objective),
      supports: this.text(row?.supports),
      comments: this.text(row?.comments),
      participantEnrollmentIds: Array.isArray(row?.participantEnrollmentIds) ? row.participantEnrollmentIds.filter((id): id is string => typeof id === "string") : [],
      plannedMinutes: this.number(row?.plannedMinutes),
      expectedLearners: this.number(row?.expectedLearners),
      presentLearners: this.number(row?.presentLearners),
    };
  }

  private dashboard(row: CohortDashboard): CohortDashboard {
    return {
      cohortId: this.text(row?.cohortId),
      cohortCode: this.text(row?.cohortCode),
      cohortName: this.text(row?.cohortName),
      learners: this.number(row?.learners),
      plannedMinutes: this.number(row?.plannedMinutes),
      deliveredMinutes: this.number(row?.deliveredMinutes),
      presentMinutes: this.number(row?.presentMinutes),
      attendanceRate: this.number(row?.attendanceRate),
      averageCompetencyProgress: this.number(row?.averageCompetencyProgress),
      workplacePeriodsCompleted: this.number(row?.workplacePeriodsCompleted),
      certificationEligible: this.number(row?.certificationEligible),
      certificationObtained: this.number(row?.certificationObtained),
      openAlerts: this.number(row?.openAlerts),
    };
  }

  private homeType(value: unknown): SessionType {
    return value === "driving" ? "driving" : value === "presentation" ? "presentation" : value === "catchup" ? "catchup" : "classroom";
  }

  private status(enrollmentStatus: string, catchupHours: number): StudentStatus {
    if (enrollmentStatus !== "active" && enrollmentStatus !== "completed") return "warning";
    if (catchupHours > 10) return "late";
    if (catchupHours > 0) return "warning";
    return "good";
  }

  private competency(values: Record<string, number> | null | undefined, code: "C1" | "C2" | "C3" | "C4"): number {
    if (!values || typeof values !== "object") return 0;
    return this.number(values[code]);
  }

  private formatDate(value: unknown): string {
    const text = this.text(value);
    if (!text) return "";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T12:00:00Z`) : new Date(text);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(this.locale(), { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" }).format(date);
  }

  private formatTime(value: unknown): string {
    const date = new Date(this.text(value));
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(this.locale(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Paris" }).format(date);
  }

  private formatSessionDate(startValue: unknown, endValue: unknown): string {
    const start = new Date(this.text(startValue));
    const end = new Date(this.text(endValue));
    if (Number.isNaN(start.getTime())) return "";
    const date = new Intl.DateTimeFormat(this.locale(), { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(start);
    const startTime = this.formatTime(startValue);
    const endTime = Number.isNaN(end.getTime()) ? "" : this.formatTime(endValue);
    return [date, [startTime, endTime].filter(Boolean).join(" – ")].filter(Boolean).join(" · ");
  }

  private locale(): string {
    return this.translate.locale() === "en" ? "en-GB" : "fr-FR";
  }

  private average(values: number[]): number {
    const safe = values.filter((value) => Number.isFinite(value));
    return safe.length ? Math.round((safe.reduce((sum, value) => sum + value, 0) / safe.length) * 100) / 100 : 0;
  }

  private percent(value: number, total: number): number {
    return total > 0 ? Math.max(0, Math.min(100, Math.round((value * 100) / total))) : 0;
  }

  private round1(value: number): number {
    return Math.round((Number.isFinite(value) ? value : 0) * 10) / 10;
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  private reset(): void {
    this.resetDataOnly();
    this.loadError.set(false);
  }

  private resetDataOnly(): void {
    this.studentsSignal.set([]);
    this.metricsSignal.set({ ...EMPTY_METRICS });
    this.agendaSignal.set([]);
    this.observationsSignal.set([]);
    this.timelineSignal.set([]);
    this.nextSessionsSignal.set([]);
    this.selfStudentSignal.set({ ...EMPTY_STUDENT, skills: { ...EMPTY_STUDENT.skills } });
    this.openAlertsSignal.set(0);
  }
}
