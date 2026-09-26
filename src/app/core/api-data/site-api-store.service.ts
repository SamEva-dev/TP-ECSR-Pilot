import { HttpClient } from "@angular/common/http";
import {
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import type { SiteFormValue, SiteProfile } from "../models/sites.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { ReportingApiService } from "../reporting/reporting-api.service";
import type { SiteDashboard } from "../reporting/reporting.models";
import { RealtimeService } from "../realtime/realtime.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

@Injectable({ providedIn: "root" })
export class SiteApiStoreService {
  private readonly http = inject(HttpClient);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly reporting = inject(ReportingApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly reports = signal<Record<string, SiteDashboard>>({});

  readonly loading = signal(false);
  readonly error = signal(false);
  private generation = 0;
  private request = 0;

  readonly sites = computed<SiteProfile[]>(() =>
    this.workspace.sites().map((site) => {
      const report = this.reports()[site.id];
      const cohorts = this.workspace.siteCohorts(site.id);
      const fallbackStudents = cohorts.reduce(
        (sum, cohort) => sum + this.number(cohort.studentCount),
        0,
      );
      const fallbackActiveCohorts = cohorts.filter(
        (cohort) => cohort.status === "active",
      ).length;

      return {
        id: this.text(site.id),
        apiId: this.text(site.apiId),
        organizationId: this.text(site.organizationId),
        code: this.text(site.code),
        name: this.text(site.name),
        city: this.text(site.city),
        address: this.text(site.address),
        postalCode: this.text(site.postalCode),
        phone: this.text(site.phone),
        email: this.text(site.email),
        manager: this.text(site.manager),
        status: site.status === "attention" ? "attention" : site.active ? "active" : "inactive",
        students: this.number(report?.learners, fallbackStudents),
        trainers: this.number(site.trainers),
        programs: this.workspace.sitePrograms(site.id).length,
        activeCohorts: this.number(report?.activeCohorts, fallbackActiveCohorts),
        attendanceRate: this.number(report?.attendanceRate),
        successRate: this.number(report?.certificationSuccessRate),
        rooms: this.number(site.rooms),
        vehicles: this.number(site.vehicles),
        alerts: this.number(site.alerts),
      };
    }),
  );

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const sites = this.workspace
        .sites()
        .map((site) => ({ id: this.text(site.id), apiId: this.text(site.apiId) }))
        .filter((site) => site.apiId.length > 0);
      const ready = this.workspace.remoteWorkspaceLoaded();
      const generation = ++this.generation;
      this.reports.set({});
      this.error.set(false);
      if (ready) void this.refresh(sites, generation);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (
        !event ||
        !/^(pedagora\.(organization|catalog|training|learning|certification|workplace)\.)/.test(
          event.typeKey,
        )
      )
        return;
      untracked(() => {
        if (this.workspace.remoteWorkspaceLoaded()) void this.refresh();
      });
    });
  }

  async refresh(
    sites = this.workspace
      .sites()
      .map((site) => ({ id: this.text(site.id), apiId: this.text(site.apiId) }))
      .filter((site) => site.apiId.length > 0),
    generation = this.generation,
  ): Promise<void> {
    const request = ++this.request;
    this.loading.set(true);

    try {
      const results = await Promise.allSettled(
        sites.map((site) => firstValueFrom(this.reporting.siteDashboard(site.apiId))),
      );
      if (generation !== this.generation || request !== this.request) return;

      const reports: Record<string, SiteDashboard> = {};
      results.forEach((result, index) => {
        if (
          result.status === "fulfilled" &&
          this.text(result.value.siteId).toLowerCase() ===
            sites[index].apiId.toLowerCase()
        )
          reports[sites[index].id] = result.value;
      });

      const failed = results.some((result) => result.status === "rejected");
      this.reports.set(reports);
      this.error.set(failed);
      if (failed)
        this.notifications.error("sites.real.metricsError", "/etablissements");
    } finally {
      if (generation === this.generation && request === this.request)
        this.loading.set(false);
    }
  }

  async create(organizationId: string, value: SiteFormValue): Promise<boolean> {
    try {
      const org = this.workspace
        .organizations()
        .find((item) => item.id === organizationId);
      if (!org?.apiId) throw new Error("No accessible organization");

      await firstValueFrom(
        this.http.post(
          `${environment.apiBaseUrl}/api/v1/organizations/${org.apiId}/sites`,
          {
            code: this.text(value.code).trim(),
            name: this.text(value.name).trim(),
            city: this.text(value.city).trim(),
            address: this.text(value.address).trim(),
            postalCode: this.text(value.postalCode).trim(),
            phone: this.text(value.phone).trim(),
            email: this.text(value.email).trim(),
            manager: this.text(value.manager).trim(),
            status: value.status || "active",
            externalKey: null,
          },
        ),
      );

      await this.workspace.reload();
      if (this.workspace.remoteWorkspaceError())
        this.notifications.error("sites.real.workspaceError", "/etablissements");
      return true;
    } catch {
      this.notifications.error("sites.real.saveError", "/etablissements");
      return false;
    }
  }

  async update(id: string, value: SiteFormValue): Promise<boolean> {
    try {
      const site = this.workspace.sites().find((item) => item.id === id);
      const org = this.workspace
        .organizations()
        .find((item) => item.id === site?.organizationId);
      if (!site?.apiId || !org?.apiId) throw new Error("No accessible site");

      await firstValueFrom(
        this.http.put(
          `${environment.apiBaseUrl}/api/v1/organizations/${org.apiId}/sites/${site.apiId}`,
          {
            code: this.text(value.code).trim(),
            name: this.text(value.name).trim(),
            city: this.text(value.city).trim(),
            address: this.text(value.address).trim(),
            postalCode: this.text(value.postalCode).trim(),
            phone: this.text(value.phone).trim(),
            email: this.text(value.email).trim(),
            manager: this.text(value.manager).trim(),
            status: value.status || "active",
          },
        ),
      );

      await this.workspace.reload();
      if (this.workspace.remoteWorkspaceError())
        this.notifications.error("sites.real.workspaceError", `/etablissements/${id}`);
      return true;
    } catch {
      this.notifications.error("sites.real.saveError", `/etablissements/${id}`);
      return false;
    }
  }

  byId(id: string): SiteProfile | undefined {
    return this.sites().find((site) => site.id === id);
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private number(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }
}
