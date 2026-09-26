import { Injectable, effect, inject, signal, untracked } from "@angular/core";
import {
  ProgramCatalogApiService,
  type ProgramApiDto,
} from "../catalog/program-catalog-api.service";
import type {
  ProgramCatalogItem,
  ProgramCatalogStatus,
  ProgramFormValue,
} from "../models/programs.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionService } from "../session/session.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

@Injectable({ providedIn: "root" })
export class ProgramApiStoreService {
  private readonly api = inject(ProgramCatalogApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly realtime = inject(RealtimeService);
  private readonly session = inject(SessionService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly programsSignal = signal<ProgramCatalogItem[]>([]);

  readonly programs = this.programsSignal.asReadonly();
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly remoteLoaded = signal(false);
  private generation = 0;
  private request = 0;

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const orgId = this.workspace.organization()?.apiId;
      const ready = this.workspace.remoteWorkspaceLoaded();
      const user = this.session.session();
      const generation = ++this.generation;
      this.programsSignal.set([]);
      this.remoteLoaded.set(false);
      this.loadError.set(false);
      if (user && ready) void this.reload(generation, orgId);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (
        !event ||
        !/^(pedagora\.(catalog|organization\.training-site|training\.cohort)\.)/.test(
          event.typeKey,
        )
      )
        return;
      untracked(() => {
        if (this.workspace.remoteWorkspaceLoaded()) void this.reload();
      });
    });
  }

  async reload(
    generation = this.generation,
    organizationId = this.workspace.organization()?.apiId,
  ): Promise<void> {
    const request = ++this.request;
    this.loading.set(true);
    try {
      const isPlatform = (this.session.session()?.roles ?? []).some((role) =>
        /superadmin|platformadministrator|platformadmin/i.test(role),
      );
      const rows = await this.api.list(isPlatform ? undefined : organizationId);
      if (generation !== this.generation || request !== this.request) return;
      this.programsSignal.set((rows ?? []).map((item) => this.map(item)));
      this.remoteLoaded.set(true);
      this.loadError.set(false);
    } catch {
      if (generation === this.generation && request === this.request) {
        this.programsSignal.set([]);
        this.loadError.set(true);
        this.notifications.error("programs.real.loadError", "/formations");
      }
    } finally {
      if (generation === this.generation && request === this.request)
        this.loading.set(false);
    }
  }

  retry(): void {
    void this.reload();
  }

  async create(value: ProgramFormValue): Promise<boolean> {
    try {
      const created = await this.api.create({
        familyCode: this.familyFor(value.category),
        code: this.text(value.code).trim(),
        name: this.text(value.name).trim(),
        descriptionKey: this.text(value.description).trim(),
        icon: this.iconFor(value.category),
        durationHours: this.number(value.durationHours),
        status: this.status(value.status),
        enabledModules: Array.isArray(value.enabledModules) ? value.enabledModules : [],
        externalKey: null,
      });
      this.programsSignal.update((items) => [...items, this.map(created)]);
      await this.reload();
      await this.workspace.reload();
      if (this.workspace.remoteWorkspaceError())
        this.notifications.error("programs.real.workspaceError", "/formations");
      return true;
    } catch {
      this.notifications.error("programs.real.saveError", "/formations");
      return false;
    }
  }

  async update(id: string, value: ProgramFormValue): Promise<boolean> {
    try {
      const current = this.programsSignal().find((item) => item.id === id);
      if (!current) throw new Error("Program unavailable");

      const saved = await this.api.update(current.apiId, {
        familyCode:
          current.category === value.category
            ? current.familyCode
            : this.familyFor(value.category),
        name: this.text(value.name).trim(),
        descriptionKey: this.text(value.description).trim(),
        icon:
          current.category === value.category
            ? current.icon
            : this.iconFor(value.category),
        durationHours: this.number(value.durationHours),
        status: this.status(value.status),
        enabledModules: Array.isArray(value.enabledModules) ? value.enabledModules : [],
      });

      const mapped = this.map(saved);
      this.programsSignal.update((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...mapped,
                siteIds: mapped.siteIds.length ? mapped.siteIds : item.siteIds,
                referenceVersion: mapped.referenceVersion || item.referenceVersion,
              }
            : item,
        ),
      );
      await this.reload();
      await this.workspace.reload();
      if (this.workspace.remoteWorkspaceError())
        this.notifications.error("programs.real.workspaceError", `/formations/${id}`);
      return true;
    } catch {
      this.notifications.error("programs.real.saveError", `/formations/${id}`);
      return false;
    }
  }

  async toggleSite(programId: string, siteId: string): Promise<boolean> {
    try {
      const program = this.programsSignal().find((item) => item.id === programId);
      const site = this.workspace.sites().find((item) => item.id === siteId);
      if (!program || !site?.apiId) throw new Error("Offering unavailable");

      const enabled = !program.siteIds.includes(siteId);
      await this.api.setOffering(program.apiId, site.apiId, enabled);
      this.programsSignal.update((items) =>
        items.map((item) =>
          item.id === programId
            ? {
                ...item,
                siteIds: enabled
                  ? [...new Set([...item.siteIds, siteId])]
                  : item.siteIds.filter((id) => id !== siteId),
              }
            : item,
        ),
      );
      await this.workspace.reload();
      await this.reload();
      if (this.workspace.remoteWorkspaceError())
        this.notifications.error("programs.real.workspaceError", `/formations/${programId}`);
      return true;
    } catch {
      this.notifications.error("programs.real.offeringError", `/formations/${programId}`);
      return false;
    }
  }

  private map(item: ProgramApiDto): ProgramCatalogItem {
    const id = this.text(item?.key);
    const siteIds = Array.isArray(item?.siteKeys)
      ? item.siteKeys.filter((siteId): siteId is string => typeof siteId === "string")
      : [];
    const cohorts = this.workspace
      .sites()
      .filter((site) => siteIds.includes(site.id))
      .flatMap((site) =>
        this.workspace
          .siteCohorts(site.id)
          .filter((cohort) => cohort.programId === id),
      );

    return {
      id,
      apiId: this.text(item?.id),
      code: this.text(item?.code),
      name: this.text(item?.name),
      familyCode: this.text(item?.familyCode),
      category: this.text(item?.category),
      icon: this.text(item?.icon),
      description: this.text(item?.descriptionKey),
      referenceVersion: this.text(item?.referenceVersion),
      durationHours: this.number(item?.durationHours),
      enabledModules: Array.isArray(item?.enabledModules)
        ? (item.enabledModules.filter((module): module is ProgramCatalogItem["enabledModules"][number] => typeof module === "string") as ProgramCatalogItem["enabledModules"])
        : [],
      siteIds,
      status: this.status(item?.status),
      students: cohorts.reduce(
        (sum, cohort) => sum + this.number(cohort.studentCount),
        0,
      ),
      trainers: 0,
      activeCohorts: cohorts.filter((cohort) => cohort.status === "active").length,
      successRate: 0,
    };
  }

  private familyFor(category: string): string {
    const families: Record<string, string> = {
      teacher: "ROAD_EDUCATION",
      motorcycle: "MOTORCYCLE",
      "heavy-vehicle": "HEAVY_VEHICLE",
      "passenger-transport": "PASSENGER_TRANSPORT",
      ambulance: "EMERGENCY_MEDICAL",
      "first-aid": "FIRST_AID",
    };
    if (!families[category]) throw new Error("Unsupported program family");
    return families[category];
  }

  private iconFor(category: string): string {
    return (
      {
        teacher: "ph-steering-wheel",
        motorcycle: "ph-motorcycle",
        "heavy-vehicle": "ph-truck",
        "passenger-transport": "ph-bus",
        ambulance: "ph-ambulance",
        "first-aid": "ph-first-aid-kit",
      } as Record<string, string>
    )[category] ?? "";
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  private status(value: unknown): ProgramCatalogStatus {
    return value === "draft" || value === "inactive" ? value : "active";
  }
}
