import { Injectable, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type {
  OrganizationActivity,
  OrganizationAlert,
  OrganizationKpis,
  ProgramPerformance,
  SitePerformance,
} from "../models/organization-dashboard.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { ReportingApiService } from "../reporting/reporting-api.service";
import type { CohortDashboard, SiteDashboard } from "../reporting/reporting.models";
import {
  TrainingDeliveryApiService,
  type TrainingSessionApi,
} from "../training-delivery/training-delivery-api.service";
import { TranslateService } from "../i18n/translate.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";


type DashboardSiteRow = { id: string; apiId?: string; name?: string; city?: string };
type DashboardCohortRow = { id: string; apiId?: string; programId?: string; status?: string };
type DashboardProgramRow = { id: string; apiId?: string; code?: string; name?: string; icon?: string; active?: boolean };

const EMPTY_KPIS: OrganizationKpis = {
  organizationId: "",
  sites: 0,
  activePrograms: 0,
  students: 0,
  trainers: 0,
  activeCohorts: 0,
  successRate: 0,
  attendanceRate: 0,
  completedHours: 0,
};

@Injectable({ providedIn: "root" })
export class OrganizationDashboardApiStoreService {
  private readonly reporting = inject(ReportingApiService);
  private readonly delivery = inject(TrainingDeliveryApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly realtime = inject(RealtimeService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly translate = inject(TranslateService);

  private readonly kpisSignal = signal<OrganizationKpis>({ ...EMPTY_KPIS });
  private readonly sitesSignal = signal<SitePerformance[]>([]);
  private readonly programsSignal = signal<ProgramPerformance[]>([]);
  private readonly alertsSignal = signal<OrganizationAlert[]>([]);
  private readonly activitySignal = signal<OrganizationActivity[]>([]);

  readonly kpis = this.kpisSignal.asReadonly();
  readonly sites = this.sitesSignal.asReadonly();
  readonly programs = this.programsSignal.asReadonly();
  readonly alerts = this.alertsSignal.asReadonly();
  readonly activity = this.activitySignal.asReadonly();
  readonly loading = signal(false);
  readonly loadError = signal(false);

  private generation = 0;
  private request = 0;

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const organizationApiId = this.text(this.workspace.organization()?.apiId);
      this.translate.locale();
      const generation = ++this.generation;
      this.reset();
      if (ready && organizationApiId) void this.reload(generation, organizationApiId);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (
        !event ||
        !/^(pedagora\.(organization\.|catalog\.|training\.|certification\.|learning\.|workplace\.|document\.))/.test(
          event.typeKey,
        )
      ) return;

      untracked(() => {
        if (this.workspace.organization()?.apiId) void this.reload();
      });
    });
  }

  async reload(
    generation = this.generation,
    organizationApiId = this.text(this.workspace.organization()?.apiId),
  ): Promise<boolean> {
    if (!organizationApiId) {
      this.reset();
      return true;
    }

    const request = ++this.request;
    this.loading.set(true);
    try {
      const sites = this.workspace.sites() as DashboardSiteRow[];
      const cohorts = sites.flatMap((site) => this.workspace.siteCohorts(site.id) as DashboardCohortRow[]);
      const uniqueCohorts: DashboardCohortRow[] = Array.from(
        new Map<string, DashboardCohortRow>(cohorts.map((row) => [this.text(row.apiId), row])).values(),
      ).filter((row) => this.text(row.apiId));

      const orgPromise = firstValueFrom(this.reporting.organizationDashboard(organizationApiId));
      const sessionsPromise = this.delivery.list();
      const auditPromise = firstValueFrom(this.reporting.audit({ organizationId: organizationApiId, page: 1, pageSize: 8 }));
      const sitePromises = sites.map(async (site) => {
        const apiId = this.text(site.apiId);
        if (!apiId) return { site, dashboard: null as SiteDashboard | null };
        try {
          return { site, dashboard: await firstValueFrom(this.reporting.siteDashboard(apiId)) };
        } catch {
          return { site, dashboard: null as SiteDashboard | null };
        }
      });
      const cohortPromises = uniqueCohorts.map(async (cohort) => {
        try {
          return { cohort, dashboard: await firstValueFrom(this.reporting.cohortDashboard(this.text(cohort.apiId))) };
        } catch {
          return { cohort, dashboard: null as CohortDashboard | null };
        }
      });

      const [orgResult, sessionResult, auditSettled, siteRows, cohortRows] = await Promise.all([
        Promise.allSettled([orgPromise]).then(([result]) => result),
        Promise.allSettled([sessionsPromise]).then(([result]) => result),
        Promise.allSettled([auditPromise]).then(([result]) => result),
        Promise.all(sitePromises),
        Promise.all(cohortPromises),
      ]);

      if (generation !== this.generation || request !== this.request) return false;

      if (orgResult.status === "rejected") this.notifications.error("organizationDashboard.api.loadFailed", "/organisation");
      if (sessionResult.status === "rejected") this.notifications.error("organizationDashboard.api.sessionsFailed", "/organisation");
      if (auditSettled.status === "rejected") this.notifications.error("organizationDashboard.api.activityFailed", "/organisation");
      if (siteRows.some((row) => row.dashboard === null) || cohortRows.some((row) => row.dashboard === null)) {
        this.notifications.error("organizationDashboard.api.detailsFailed", "/organisation");
      }

      const org = orgResult.status === "fulfilled" ? orgResult.value : null;
      const sessions = sessionResult.status === "fulfilled" && Array.isArray(sessionResult.value)
        ? sessionResult.value.map((row) => this.session(row))
        : [];
      const audit = auditSettled.status === "fulfilled" && Array.isArray(auditSettled.value?.items)
        ? auditSettled.value.items
        : [];

      const organizationId = this.text(this.workspace.organization()?.id);
      const uniquePrograms: DashboardProgramRow[] = Array.from(
        new Map<string, DashboardProgramRow>(
          sites
            .flatMap((site) => this.workspace.sitePrograms(site.id) as DashboardProgramRow[])
            .map((program) => [this.text(program.id), program] as [string, DashboardProgramRow]),
        ).values(),
      ).filter((program) => this.text(program.id));

      const completedMinutes = sessions
        .filter((row) => row.status === "completed")
        .reduce((sum, row) => sum + this.number(row.plannedMinutes), 0);
      const trainerNames = new Set(
        sessions.map((row) => this.text(row.trainerDisplayName).trim().toLowerCase()).filter(Boolean),
      );

      const siteDashboards = siteRows.map((row) => row.dashboard).filter((row): row is SiteDashboard => row !== null);
      const siteLearners = siteDashboards.reduce((sum, row) => sum + this.number(row.learners), 0);
      const siteLearnerWeight = siteDashboards.reduce((sum, row) => sum + this.number(row.learners), 0);
      const fallbackAttendance = siteLearnerWeight > 0
        ? Math.round(siteDashboards.reduce((sum, row) => sum + this.number(row.attendanceRate) * this.number(row.learners), 0) / siteLearnerWeight)
        : 0;
      const fallbackSuccess = siteLearnerWeight > 0
        ? Math.round(siteDashboards.reduce((sum, row) => sum + this.number(row.certificationSuccessRate) * this.number(row.learners), 0) / siteLearnerWeight)
        : 0;

      this.kpisSignal.set({
        organizationId,
        sites: org ? this.number(org.sites) : sites.length,
        activePrograms: org ? this.number(org.activePrograms) : uniquePrograms.filter((row) => row.active !== false).length,
        students: org ? this.number(org.learners) : siteLearners,
        trainers: trainerNames.size,
        activeCohorts: org ? this.number(org.activeCohorts) : uniqueCohorts.filter((row) => row.status === "active").length,
        successRate: org ? this.number(org.certificationSuccessRate) : fallbackSuccess,
        attendanceRate: org ? this.number(org.attendanceRate) : fallbackAttendance,
        completedHours: this.round1(completedMinutes / 60),
      });

      this.sitesSignal.set(siteRows.map(({ site, dashboard }) => {
        const siteSessions = sessions.filter((row) => this.text(row.siteId) === this.text(site.apiId));
        const siteTrainers = new Set(siteSessions.map((row) => this.text(row.trainerDisplayName).trim().toLowerCase()).filter(Boolean));
        return {
          organizationId,
          siteId: this.text(site.id),
          siteName: this.text(dashboard?.siteName) || this.text(site.name),
          city: this.text(site.city),
          students: this.number(dashboard?.learners),
          trainers: siteTrainers.size,
          programs: this.workspace.sitePrograms(this.text(site.id)).length,
          activeCohorts: this.number(dashboard?.activeCohorts),
          attendanceRate: this.number(dashboard?.attendanceRate),
          successRate: this.number(dashboard?.certificationSuccessRate),
          alerts: 0,
        };
      }));

      this.programsSignal.set(uniquePrograms.map((program) => {
        const related = cohortRows.filter(({ cohort }) => this.text(cohort.programId) === this.text(program.id));
        const dashboards = related.map((row) => row.dashboard).filter((row): row is CohortDashboard => row !== null);
        const learners = dashboards.reduce((sum, row) => sum + this.number(row.learners), 0);
        const attendanceWeight = dashboards.reduce((sum, row) => sum + this.number(row.learners), 0);
        const weightedAttendance = dashboards.reduce(
          (sum, row) => sum + this.number(row.attendanceRate) * this.number(row.learners),
          0,
        );
        const eligible = dashboards.reduce((sum, row) => sum + this.number(row.certificationEligible), 0);
        const obtained = dashboards.reduce((sum, row) => sum + this.number(row.certificationObtained), 0);
        return {
          organizationId,
          programId: this.text(program.id),
          programName: this.text(program.name),
          code: this.text(program.code),
          students: learners,
          activeCohorts: related.filter(({ cohort }) => cohort.status === "active").length,
          attendanceRate: attendanceWeight > 0 ? Math.round(weightedAttendance / attendanceWeight) : 0,
          successRate: this.percent(obtained, eligible),
          icon: this.text(program.icon) || "ph-books",
        };
      }));

      const openAlerts = this.number(org?.openAlerts);
      this.alertsSignal.set(openAlerts > 0 ? [{
        id: "backend-open-alerts",
        organizationId,
        level: "warning",
        titleKey: "organizationDashboard.real.alerts.open.title",
        detailKey: "organizationDashboard.real.alerts.open.detail",
      }] : []);

      this.activitySignal.set(audit.slice(0, 8).map((row) => ({
        id: this.text(row.id),
        organizationId,
        icon: this.auditIcon(row.entityType),
        titleKey: this.text(row.action),
        detailKey: [this.text(row.entityType), this.text(row.entityId)].filter(Boolean).join(" · "),
        whenKey: this.formatDateTime(row.occurredAtUtc),
      })));

      this.loadError.set(orgResult.status === "rejected");
      return orgResult.status === "fulfilled";
    } catch {
      if (generation === this.generation && request === this.request) {
        this.resetDataOnly();
        this.loadError.set(true);
        this.notifications.error("organizationDashboard.api.loadFailed", "/organisation");
      }
      return false;
    } finally {
      if (generation === this.generation && request === this.request) this.loading.set(false);
    }
  }

  private reset(): void {
    ++this.request;
    this.loading.set(false);
    this.loadError.set(false);
    this.resetDataOnly();
  }

  private resetDataOnly(): void {
    this.kpisSignal.set({ ...EMPTY_KPIS });
    this.sitesSignal.set([]);
    this.programsSignal.set([]);
    this.alertsSignal.set([]);
    this.activitySignal.set([]);
  }

  private session(row: TrainingSessionApi): TrainingSessionApi {
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
      participantEnrollmentIds: Array.isArray(row?.participantEnrollmentIds)
        ? row.participantEnrollmentIds.filter((id): id is string => typeof id === "string")
        : [],
      plannedMinutes: this.number(row?.plannedMinutes),
      expectedLearners: this.number(row?.expectedLearners),
      presentLearners: this.number(row?.presentLearners),
    };
  }

  private auditIcon(entityType: unknown): string {
    const value = this.text(entityType).toLowerCase();
    if (value.includes("certif") || value.includes("exam")) return "ph-certificate";
    if (value.includes("cohort") || value.includes("learner") || value.includes("enrollment")) return "ph-users-three";
    if (value.includes("site") || value.includes("organization")) return "ph-buildings";
    return "ph-graduation-cap";
  }

  private formatDateTime(value: unknown): string {
    const date = new Date(this.text(value));
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(this.locale(), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Europe/Paris",
    }).format(date);
  }

  private locale(): string {
    return this.translate.locale() === "en" ? "en-GB" : "fr-FR";
  }

  private number(value: unknown): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private percent(part: number, total: number): number {
    return total > 0 ? Math.max(0, Math.min(100, Math.round((part / total) * 100))) : 0;
  }

  private round1(value: number): number {
    return Math.round((Number.isFinite(value) ? value : 0) * 10) / 10;
  }
}
