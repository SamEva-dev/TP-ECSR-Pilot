import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { ContextualPromotionSummary } from "../models/contextual-promotions.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { ReportingApiService } from "../reporting/reporting-api.service";
import type { CohortDashboard } from "../reporting/reporting.models";
import { TrainingCatalogApiService, type CohortResponse } from "../training/training-catalog-api.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";
import { ReferentialApiStoreService } from "./referential-api-store.service";

@Injectable({ providedIn: "root" })
export class CohortApiStoreService {
  private readonly api = inject(TrainingCatalogApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly referentials = inject(ReferentialApiStoreService);
  private readonly reporting = inject(ReportingApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly notifications = inject(ApplicationNotificationService);

  private readonly rowsSignal = signal<CohortResponse[]>([]);
  private readonly dashboardsSignal = signal<Record<string, CohortDashboard>>({});
  readonly loading = signal(false);
  readonly loadError = signal(false);
  private generation = 0;
  private request = 0;

  readonly promotions = computed<ContextualPromotionSummary[]>(() => {
    const organization = this.workspace.organization();
    const site = this.workspace.site();
    const program = this.workspace.program();
    if (!organization || !site || !program) return [];

    return this.rowsSignal().map((row) => {
      const referential = this.referentials.items().find(
        (item) => item.apiId === this.text(row.referentialVersionId) || item.id === this.text(row.referentialVersionId),
      );
      const dashboard = this.dashboardsSignal()[this.text(row.id)];
      const learnerCount = this.number(row.learnerCount);
      const capacity = this.number(row.capacity);
      const displayedStudents = row.status === "planned" ? capacity : learnerCount;
      const referenceHours = this.number(referential?.totalHours);
      const plannedHours = dashboard
        ? Math.round(this.number(dashboard.plannedMinutes) / 60)
        : referenceHours * displayedStudents;
      const completedHours = dashboard
        ? Math.round(this.number(dashboard.deliveredMinutes) / 60)
        : 0;

      return {
        id: this.text(row.key) || this.text(row.id),
        offeringId: this.offeringKey(row.programOfferingId),
        organizationId: this.text(organization.id),
        organizationName: this.text(organization.name),
        siteId: this.text(site.id),
        siteName: this.text(site.name),
        siteCity: this.text(site.city),
        programId: this.text(program.id),
        programName: this.text(program.name),
        programCode: this.text(program.code),
        programIcon: this.text(program.icon),
        referentialVersionId: this.text(referential?.id) || this.text(row.referentialVersionId),
        referentialVersion: this.text(referential?.version),
        referentialCode: this.text(referential?.code),
        name: this.text(row.name),
        shortName: this.text(row.code),
        start: this.text(row.startDate),
        end: this.text(row.endDate),
        status: this.status(row.status),
        studentCount: displayedStudents,
        manager: "",
        plannedHours,
        completedHours,
        remainingHours: Math.max(0, plannedHours - completedHours),
        catchupHours: 0,
        attendanceRate: this.number(dashboard?.attendanceRate),
        averageProgress: this.number(dashboard?.averageCompetencyProgress),
      };
    });
  });

  constructor() {
    effect(() => {
      const organizationId = this.workspace.organization()?.apiId ?? "";
      const siteId = this.workspace.site()?.apiId ?? "";
      const programId = this.workspace.program()?.apiId ?? "";
      const ready = this.workspace.remoteWorkspaceLoaded();
      const generation = ++this.generation;
      this.rowsSignal.set([]);
      this.dashboardsSignal.set({});
      this.loadError.set(false);
      if (ready && organizationId && siteId && programId)
        void this.reload(generation, { organizationId, siteId, programId });
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.training\.(cohort|enrollment)\./.test(event.typeKey)) return;
      untracked(() => {
        if (this.workspace.remoteWorkspaceLoaded()) void this.reload();
      });
    });
  }

  async reload(
    generation = this.generation,
    filters = this.currentFilters(),
  ): Promise<boolean> {
    if (!filters.organizationId || !filters.siteId || !filters.programId) {
      this.rowsSignal.set([]);
      this.dashboardsSignal.set({});
      return true;
    }

    const request = ++this.request;
    this.loading.set(true);
    try {
      const rows = await this.api.list(filters);
      if (generation !== this.generation || request !== this.request) return false;
      const safeRows = Array.isArray(rows) ? rows.map((row) => this.normalize(row)) : [];
      this.rowsSignal.set(safeRows);
      this.loadError.set(false);
      await this.loadDashboards(safeRows, generation, request);
      return true;
    } catch {
      if (generation === this.generation && request === this.request) {
        this.rowsSignal.set([]);
        this.dashboardsSignal.set({});
        this.loadError.set(true);
        this.notifications.error("promotions.api.loadFailed", "/promotions");
      }
      return false;
    } finally {
      if (generation === this.generation && request === this.request) this.loading.set(false);
    }
  }

  async create(payload: {
    name: string;
    startDate: string;
    endDate: string;
    capacity: number;
    referentialVersionId: string;
    status: CohortResponse["status"];
  }): Promise<ContextualPromotionSummary | null> {
    const offering = this.workspace.activeOfferingForContext();
    const referential = this.referentials.items().find(
      (item) => item.id === payload.referentialVersionId || item.apiId === payload.referentialVersionId,
    );
    if (!offering?.apiId || !referential?.apiId) {
      this.notifications.error("promotions.api.invalidContext", "/promotions");
      return null;
    }

    try {
      let saved = await this.api.createCohort({
        programOfferingId: offering.apiId,
        referentialVersionId: referential.apiId,
        code: this.createCode(payload.name, payload.startDate),
        name: this.text(payload.name).trim(),
        startDate: this.text(payload.startDate),
        endDate: this.text(payload.endDate),
        capacity: Math.max(1, this.number(payload.capacity)),
        externalKey: null,
      });
      saved = this.normalize(saved);

      if (payload.status !== "planned") {
        try {
          saved = this.normalize(
            await this.api.updateCohort(saved.id, {
              name: saved.name,
              startDate: saved.startDate,
              endDate: saved.endDate,
              capacity: saved.capacity,
              status: payload.status,
            }),
          );
        } catch {
          this.notifications.error("promotions.api.updateFailed", "/promotions");
        }
      }

      this.upsert(saved);
      this.workspace.applySavedCohort(saved);
      const workspaceReloaded = await this.reloadWorkspaceSafely();
      await this.reload();
      if (!workspaceReloaded)
        this.notifications.error("promotions.api.refreshFailed", "/promotions");
      return this.promotions().find((item) => item.id === (saved.key || saved.id)) ?? null;
    } catch {
      this.notifications.error("promotions.api.createFailed", "/promotions");
      return null;
    }
  }

  private async loadDashboards(rows: CohortResponse[], generation: number, request: number): Promise<void> {
    if (!rows.length) {
      this.dashboardsSignal.set({});
      return;
    }

    const settled = await Promise.allSettled(
      rows.map((row) => firstValueFrom(this.reporting.cohortDashboard(row.id))),
    );
    if (generation !== this.generation || request !== this.request) return;

    const reports: Record<string, CohortDashboard> = {};
    let failed = false;
    settled.forEach((result, index) => {
      if (result.status === "fulfilled") reports[rows[index].id] = result.value;
      else failed = true;
    });
    this.dashboardsSignal.set(reports);
    if (failed) this.notifications.error("promotions.api.metricsFailed", "/promotions");
  }

  private async reloadWorkspaceSafely(): Promise<boolean> {
    await this.workspace.reload();
    return !this.workspace.remoteWorkspaceError();
  }

  private currentFilters(): { organizationId?: string; siteId?: string; programId?: string } {
    return {
      organizationId: this.workspace.organization()?.apiId ?? "",
      siteId: this.workspace.site()?.apiId ?? "",
      programId: this.workspace.program()?.apiId ?? "",
    };
  }

  private upsert(row: CohortResponse): void {
    this.rowsSignal.update((items) => {
      const index = items.findIndex((item) => item.id === row.id);
      return index < 0
        ? [row, ...items]
        : items.map((item, i) => (i === index ? row : item));
    });
  }

  private offeringKey(apiId: unknown): string {
    return this.text(apiId);
  }

  private createCode(name: string, startDate: string): string {
    const slug = this.text(name)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 42);
    const year = /^\d{4}/.test(startDate) ? startDate.slice(0, 4) : "0000";
    const uid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Date.now().toString(36).toUpperCase();
    return `${slug || "PROMO"}-${year}-${uid}`.slice(0, 64);
  }

  private normalize(row: CohortResponse): CohortResponse {
    return {
      id: this.text(row?.id),
      key: this.text(row?.key) || this.text(row?.id),
      organizationId: this.text(row?.organizationId),
      siteId: this.text(row?.siteId),
      programOfferingId: this.text(row?.programOfferingId),
      referentialVersionId: this.text(row?.referentialVersionId),
      code: this.text(row?.code),
      name: this.text(row?.name),
      startDate: this.text(row?.startDate),
      endDate: this.text(row?.endDate),
      capacity: this.number(row?.capacity),
      learnerCount: this.number(row?.learnerCount),
      status: this.status(row?.status),
    };
  }

  private status(value: unknown): CohortResponse["status"] {
    return value === "draft" || value === "active" || value === "completed" || value === "cancelled"
      ? value
      : "planned";
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
}
