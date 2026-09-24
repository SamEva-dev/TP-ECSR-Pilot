import { Injectable, computed, effect, inject, signal } from "@angular/core";
import { WorkspaceApiService } from "./workspace-api.service";
import { SessionService } from "../session/session.service";
import { RuntimeDataLoaderService } from "../api-data/runtime-data-loader.service";
import type {
  ProgramOffering,
  WorkspaceAccessRule,
  WorkspaceSelection,
} from "../models/workspace.models";

const STORAGE_PREFIX = "tp-ecsr-pilot.workspace-context";

@Injectable({ providedIn: "root" })
export class WorkspaceContextService {
  private readonly sessionService = inject(SessionService);
  private readonly workspaceApi = inject(WorkspaceApiService);
  private readonly runtimeData = inject(RuntimeDataLoaderService);
  private readonly organizationsSignal = signal<any[]>([]);
  private readonly sitesSignal = signal<any[]>([]);
  private readonly programsSignal = signal<any[]>([]);
  private readonly offeringsSignal = signal<any[]>([]);
  private readonly cohortsSignal = signal<any[]>([]);
  readonly remoteWorkspaceLoaded = signal(false);
  private readonly selectionSignal = signal<WorkspaceSelection>({
    organizationId: "",
    siteId: "",
    programId: "",
    cohortId: "",
  });
  private sessionKey = "";

  readonly selection = this.selectionSignal.asReadonly();
  readonly access = computed<WorkspaceAccessRule>(() => ({ scope: "platform" as const, locked: false }));
  readonly isLocked = computed(() => false);

  readonly organizations = computed(() =>
    this.organizationsSignal().filter((organization) => this.canAccessOrganization(organization.id)),
  );

  readonly sites = computed(() => {
    const organizationId = this.selectionSignal().organizationId;
    return this.sitesSignal().filter(
      (site) => site.organizationId === organizationId && this.canAccessSite(site.id),
    );
  });

  readonly programs = computed(() => {
    const siteId = this.selectionSignal().siteId;
    const programIds = this.offeringsSignal().filter(
      (offering) => offering.siteId === siteId && offering.active && this.canAccessOffering(offering),
    ).map((offering) => offering.programId);
    return this.programsSignal().filter((program) => programIds.includes(program.id));
  });

  readonly cohorts = computed(() => {
    const selection = this.selectionSignal();
    const offering = this.findOffering(selection.siteId, selection.programId);
    if (!offering) return [];
    return this.cohortsSignal().filter(
      (cohort) => cohort.offeringId === offering.id && this.canAccessCohort(cohort.id),
    );
  });

  readonly organization = computed(
    () => this.organizationsSignal().find((item) => item.id === this.selectionSignal().organizationId) ?? null,
  );
  readonly site = computed(
    () => this.sitesSignal().find((item) => item.id === this.selectionSignal().siteId) ?? null,
  );
  readonly program = computed(
    () => this.programsSignal().find((item) => item.id === this.selectionSignal().programId) ?? null,
  );
  readonly cohort = computed(
    () => this.cohortsSignal().find((item) => item.id === this.selectionSignal().cohortId) ?? null,
  );

  readonly secondaryLabel = computed(() => {
    const site = this.site();
    const program = this.program();
    const cohort = this.cohort();
    return [site?.city, program?.name, cohort?.shortName].filter(Boolean).join(" · ");
  });

  readonly breadcrumb = computed(() =>
    [this.organization()?.shortName, this.site()?.city, this.program()?.name, this.cohort()?.shortName]
      .filter(Boolean)
      .join(" > "),
  );

  readonly canSwitch = computed(() => {
    if (this.isLocked()) return false;
    return (
      this.organizations().length > 1 ||
      this.sites().length > 1 ||
      this.programs().length > 1 ||
      this.cohorts().length > 1
    );
  });

  async reload(): Promise<void> { await this.loadRemoteWorkspace(this.sessionKey || "current"); }

  constructor() {
    effect(() => {
      const session = this.sessionService.session();
      const key = session ? `${session.role}:${session.email.toLowerCase()}` : "anonymous";
      if (key === this.sessionKey) return;
      this.sessionKey = key;
      this.selectionSignal.set(this.resolveInitialSelection(key));
      if (session) void this.loadRemoteWorkspace(key);
    });
  }

  private async loadRemoteWorkspace(key: string): Promise<void> {
    try {
      const dto = await this.workspaceApi.load();
      const organizations = dto.organizations.map((item) => ({
        id: item.key, apiId: item.id, code: item.code, name: item.name, shortName: item.shortName,
        city: item.city, active: item.active, primaryColor: item.primaryColor, secondaryColor: item.secondaryColor,
      }));
      const orgApiToKey = new Map(dto.organizations.map((item) => [item.id, item.key]));
      const sites = dto.sites.map((item) => ({
        id: item.key, apiId: item.id, organizationId: item.organizationKey || orgApiToKey.get(item.organizationId) || item.organizationId,
        code: item.code, name: item.name, city: item.city, active: item.active,
      }));
      if (organizations.length) this.organizationsSignal.set(organizations);
      if (sites.length) this.sitesSignal.set(sites);
      const programs = (dto.programs ?? []).map((item) => ({ id:item.key, apiId:item.id, code:item.code, name:item.name, category:item.category, familyCode:item.familyCode, icon:item.icon, active:item.status === "active", enabledModules:item.enabledModules as any }));
      const offerings = (dto.offerings ?? []).map((item) => ({ id:item.key, apiId:item.id, siteId:item.siteKey, programId:item.programKey, active:item.active }));
      const offeringApiToKey = new Map((dto.offerings ?? []).map((item) => [item.id, item.key]));
      const cohorts = (dto.cohorts ?? []).map((item) => ({
        id: item.key,
        apiId: item.id,
        offeringId: offeringApiToKey.get(item.programOfferingId) ?? item.programOfferingId,
        name: item.name,
        shortName: item.code,
        start: item.startDate,
        end: item.endDate,
        status: (item.status === "completed" ? "completed" : item.status === "planned" ? "planned" : "active") as "planned" | "active" | "completed",
        studentCount: item.learnerCount,
        referentialVersionId: item.referentialVersionId,
      }));
      if (programs.length) this.programsSignal.set(programs);
      if (offerings.length) this.offeringsSignal.set(offerings);
      if (cohorts.length) this.cohortsSignal.set(cohorts);
      const apiSelection = dto.defaultSelection ?? null;
      const defaultSelection = apiSelection
        ? {
            organizationId: dto.organizations.find(x => x.id === apiSelection.organizationId)?.key ?? "",
            siteId: dto.sites.find(x => x.id === apiSelection.siteId)?.key ?? "",
            programId: dto.programs.find(x => x.id === apiSelection.programId)?.key ?? "",
            cohortId: dto.cohorts.find(x => x.id === apiSelection.cohortId)?.key ?? "",
          }
        : null;

      await this.runtimeData.hydrateWorkspace(dto, defaultSelection);
      this.remoteWorkspaceLoaded.set(true);
      const restored = this.restore(key);
      if (restored && this.isSelectionAccessible(restored)) {
        this.selectionSignal.set(restored);
      } else if (defaultSelection && this.isSelectionAccessible(defaultSelection)) {
        this.selectionSignal.set(defaultSelection);
        this.persist(defaultSelection);
      } else {
        const resolved = this.resolveInitialSelection(key);
        this.selectionSignal.set(resolved);
        this.persist(resolved);
      }
    } catch {
      this.organizationsSignal.set([]);
      this.sitesSignal.set([]);
      this.programsSignal.set([]);
      this.offeringsSignal.set([]);
      this.cohortsSignal.set([]);
      this.remoteWorkspaceLoaded.set(false);
    }
  }

  selectOrganization(organizationId: string): void {
    const organization = this.organizations().find((item) => item.id === organizationId);
    if (!organization) return;
    const site = this.sitesSignal().find(
      (item) => item.organizationId === organization.id && this.canAccessSite(item.id),
    );
    if (!site) return;
    const offering = this.offeringsSignal().find(
      (item) => item.siteId === site.id && item.active && this.canAccessOffering(item),
    );
    if (!offering) return;
    const cohort = this.cohortsSignal().find(
      (item) => item.offeringId === offering.id && this.canAccessCohort(item.id),
    );
    if (!cohort) return;
    this.commit({
      organizationId: organization.id,
      siteId: site.id,
      programId: offering.programId,
      cohortId: cohort.id,
    });
  }

  selectSite(siteId: string): void {
    const site = this.sites().find((item) => item.id === siteId);
    if (!site) return;
    const offering = this.offeringsSignal().find(
      (item) => item.siteId === site.id && item.active && this.canAccessOffering(item),
    );
    if (!offering) return;
    const cohort = this.cohortsSignal().find(
      (item) => item.offeringId === offering.id && this.canAccessCohort(item.id),
    );
    if (!cohort) return;
    this.commit({
      organizationId: site.organizationId,
      siteId: site.id,
      programId: offering.programId,
      cohortId: cohort.id,
    });
  }

  selectProgram(programId: string): void {
    const siteId = this.selectionSignal().siteId;
    const offering = this.findOffering(siteId, programId);
    if (!offering || !this.canAccessOffering(offering)) return;
    const cohort = this.cohortsSignal().find(
      (item) => item.offeringId === offering.id && this.canAccessCohort(item.id),
    );
    if (!cohort) return;
    this.commit({ ...this.selectionSignal(), programId, cohortId: cohort.id });
  }

  selectCohort(cohortId: string): void {
    const cohort = this.cohorts().find((item) => item.id === cohortId);
    if (!cohort) return;
    this.commit({ ...this.selectionSignal(), cohortId });
  }

  private resolveInitialSelection(key: string): WorkspaceSelection {
    const restored = this.restore(key);
    if (restored && this.isSelectionAccessible(restored)) return restored;

    const cohort = this.cohortsSignal().find((item) => this.canAccessCohort(item.id));
    if (cohort) return this.selectionFromCohort(cohort.id);

    const offering = this.offeringsSignal().find((item) => this.canAccessOffering(item));
    if (offering) {
      const fallbackCohort = this.cohortsSignal().find((item) => item.offeringId === offering.id);
      if (fallbackCohort) return this.selectionFromCohort(fallbackCohort.id);
    }

    const firstOrg = this.organizationsSignal()[0];
    const firstSite = firstOrg ? this.sitesSignal().find(x => x.organizationId === firstOrg.id) : undefined;
    const firstOffering = firstSite ? this.offeringsSignal().find(x => x.siteId === firstSite.id && x.active) : undefined;
    const firstCohort = firstOffering ? this.cohortsSignal().find(x => x.offeringId === firstOffering.id) : undefined;
    return { organizationId:firstOrg?.id ?? "", siteId:firstSite?.id ?? "", programId:firstOffering?.programId ?? "", cohortId:firstCohort?.id ?? "" };
  }

  private selectionFromCohort(cohortId: string): WorkspaceSelection {
    const cohort = this.cohortsSignal().find((item) => item.id === cohortId) ?? this.cohortsSignal()[0];
    if (!cohort) return { organizationId: "", siteId: "", programId: "", cohortId: "" };
    const offering = this.offeringsSignal().find((item) => item.id === cohort.offeringId) ?? this.offeringsSignal()[0];
    if (!offering) return { organizationId: "", siteId: "", programId: "", cohortId: "" };
    const site = this.sitesSignal().find((item) => item.id === offering.siteId) ?? this.sitesSignal()[0];
    if (!site) return { organizationId: "", siteId: "", programId: "", cohortId: "" };
    return {
      organizationId: site.organizationId,
      siteId: site.id,
      programId: offering.programId,
      cohortId: cohort.id,
    };
  }

  private isSelectionAccessible(selection: WorkspaceSelection): boolean {
    const organization = this.organizationsSignal().some((item) => item.id === selection.organizationId);
    const site = this.sitesSignal().some(
      (item) => item.id === selection.siteId && item.organizationId === selection.organizationId,
    );
    const offering = this.findOffering(selection.siteId, selection.programId);
    const cohort = this.cohortsSignal().some(
      (item) => item.id === selection.cohortId && item.offeringId === offering?.id,
    );
    return Boolean(
      organization &&
        site &&
        offering &&
        cohort &&
        this.canAccessOrganization(selection.organizationId) &&
        this.canAccessSite(selection.siteId) &&
        this.canAccessOffering(offering) &&
        this.canAccessCohort(selection.cohortId),
    );
  }

  private canAccessOrganization(organizationId: string): boolean {
    const access = this.access();
    if (access.scope === "platform") return true;
    if (access.organizationIds) return access.organizationIds.includes(organizationId);
    if (access.siteIds) {
      return this.sitesSignal().some(
        (site) => access.siteIds?.includes(site.id) && site.organizationId === organizationId,
      );
    }
    if (access.offeringIds) {
      return this.offeringsSignal().some((offering) => {
        if (!access.offeringIds?.includes(offering.id)) return false;
        const site = this.sitesSignal().find((item) => item.id === offering.siteId);
        return site?.organizationId === organizationId;
      });
    }
    if (access.cohortIds) {
      return access.cohortIds.some((cohortId) => {
        const cohort = this.cohortsSignal().find((item) => item.id === cohortId);
        const offering = this.offeringsSignal().find((item) => item.id === cohort?.offeringId);
        const site = this.sitesSignal().find((item) => item.id === offering?.siteId);
        return site?.organizationId === organizationId;
      });
    }
    return false;
  }

  private canAccessSite(siteId: string): boolean {
    const access = this.access();
    if (access.scope === "platform" || access.organizationIds) {
      const site = this.sitesSignal().find((item) => item.id === siteId);
      return !!site && this.canAccessOrganization(site.organizationId);
    }
    if (access.siteIds) return access.siteIds.includes(siteId);
    if (access.offeringIds) {
      return this.offeringsSignal().some(
        (offering) => access.offeringIds?.includes(offering.id) && offering.siteId === siteId,
      );
    }
    if (access.cohortIds) {
      return access.cohortIds.some((cohortId) => {
        const cohort = this.cohortsSignal().find((item) => item.id === cohortId);
        const offering = this.offeringsSignal().find((item) => item.id === cohort?.offeringId);
        return offering?.siteId === siteId;
      });
    }
    return false;
  }

  private canAccessOffering(offering: ProgramOffering): boolean {
    const access: WorkspaceAccessRule = this.access();
    if (access.scope === "platform" || access.organizationIds || access.siteIds) {
      return this.canAccessSite(offering.siteId);
    }
    if (access.offeringIds) return access.offeringIds.includes(offering.id);
    if (access.cohortIds) {
      return access.cohortIds.some(
        (cohortId) => this.cohortsSignal().find((item) => item.id === cohortId)?.offeringId === offering.id,
      );
    }
    return false;
  }

  private canAccessCohort(cohortId: string): boolean {
    const access = this.access();
    const cohort = this.cohortsSignal().find((item) => item.id === cohortId);
    if (!cohort) return false;
    if (access.cohortIds) return access.cohortIds.includes(cohortId);
    const offering = this.offeringsSignal().find((item) => item.id === cohort.offeringId);
    return !!offering && this.canAccessOffering(offering);
  }

  private findOffering(siteId: string, programId: string): ProgramOffering | undefined {
    return this.offeringsSignal().find(
      (item) => item.siteId === siteId && item.programId === programId && item.active,
    );
  }

  private commit(selection: WorkspaceSelection): void {
    this.selectionSignal.set(selection);
    this.sessionService.setPromotion(selection.cohortId);
    void this.runtimeData.hydrateContext(selection);
    this.persist(selection);
  }

  private persist(selection: WorkspaceSelection): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(`${STORAGE_PREFIX}:${this.sessionKey}`, JSON.stringify(selection));
  }

  private restore(key: string): WorkspaceSelection | null {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WorkspaceSelection;
    } catch {
      localStorage.removeItem(`${STORAGE_PREFIX}:${key}`);
      return null;
    }
  }
}
