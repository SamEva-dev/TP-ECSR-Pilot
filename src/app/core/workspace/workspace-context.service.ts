import { Injectable, computed, effect, inject, signal } from "@angular/core";
import { SessionService } from "../session/session.service";
import {
  ORGANIZATIONS,
  PROGRAM_OFFERINGS,
  TRAINING_PROGRAMS,
  TRAINING_SITES,
  WORKSPACE_COHORTS,
  workspaceAccessFor,
} from "../mock-data/workspace.mock";
import type {
  ProgramOffering,
  WorkspaceAccessRule,
  WorkspaceSelection,
} from "../models/workspace.models";

const STORAGE_PREFIX = "tp-ecsr-pilot.workspace-context";

@Injectable({ providedIn: "root" })
export class WorkspaceContextService {
  private readonly sessionService = inject(SessionService);
  private readonly selectionSignal = signal<WorkspaceSelection>({
    organizationId: "org-aftral",
    siteId: "site-aftral-nice",
    programId: "program-ecsr",
    cohortId: "p1",
  });
  private sessionKey = "";

  readonly selection = this.selectionSignal.asReadonly();
  readonly access = computed(() => workspaceAccessFor(this.sessionService.session()));
  readonly isLocked = computed(() => this.access().locked === true);

  readonly organizations = computed(() =>
    ORGANIZATIONS.filter((organization) => this.canAccessOrganization(organization.id)),
  );

  readonly sites = computed(() => {
    const organizationId = this.selectionSignal().organizationId;
    return TRAINING_SITES.filter(
      (site) => site.organizationId === organizationId && this.canAccessSite(site.id),
    );
  });

  readonly programs = computed(() => {
    const siteId = this.selectionSignal().siteId;
    const programIds = PROGRAM_OFFERINGS.filter(
      (offering) => offering.siteId === siteId && offering.active && this.canAccessOffering(offering),
    ).map((offering) => offering.programId);
    return TRAINING_PROGRAMS.filter((program) => programIds.includes(program.id));
  });

  readonly cohorts = computed(() => {
    const selection = this.selectionSignal();
    const offering = this.findOffering(selection.siteId, selection.programId);
    if (!offering) return [];
    return WORKSPACE_COHORTS.filter(
      (cohort) => cohort.offeringId === offering.id && this.canAccessCohort(cohort.id),
    );
  });

  readonly organization = computed(
    () => ORGANIZATIONS.find((item) => item.id === this.selectionSignal().organizationId) ?? null,
  );
  readonly site = computed(
    () => TRAINING_SITES.find((item) => item.id === this.selectionSignal().siteId) ?? null,
  );
  readonly program = computed(
    () => TRAINING_PROGRAMS.find((item) => item.id === this.selectionSignal().programId) ?? null,
  );
  readonly cohort = computed(
    () => WORKSPACE_COHORTS.find((item) => item.id === this.selectionSignal().cohortId) ?? null,
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

  constructor() {
    effect(() => {
      const session = this.sessionService.session();
      const key = session ? `${session.role}:${session.email.toLowerCase()}` : "anonymous";
      if (key === this.sessionKey) return;
      this.sessionKey = key;
      this.selectionSignal.set(this.resolveInitialSelection(key));
    });
  }

  selectOrganization(organizationId: string): void {
    const organization = this.organizations().find((item) => item.id === organizationId);
    if (!organization) return;
    const site = TRAINING_SITES.find(
      (item) => item.organizationId === organization.id && this.canAccessSite(item.id),
    );
    if (!site) return;
    const offering = PROGRAM_OFFERINGS.find(
      (item) => item.siteId === site.id && item.active && this.canAccessOffering(item),
    );
    if (!offering) return;
    const cohort = WORKSPACE_COHORTS.find(
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
    const offering = PROGRAM_OFFERINGS.find(
      (item) => item.siteId === site.id && item.active && this.canAccessOffering(item),
    );
    if (!offering) return;
    const cohort = WORKSPACE_COHORTS.find(
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
    const cohort = WORKSPACE_COHORTS.find(
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

    const cohort = WORKSPACE_COHORTS.find((item) => this.canAccessCohort(item.id));
    if (cohort) return this.selectionFromCohort(cohort.id);

    const offering = PROGRAM_OFFERINGS.find((item) => this.canAccessOffering(item));
    if (offering) {
      const fallbackCohort = WORKSPACE_COHORTS.find((item) => item.offeringId === offering.id);
      if (fallbackCohort) return this.selectionFromCohort(fallbackCohort.id);
    }

    return { organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr", cohortId: "p1" };
  }

  private selectionFromCohort(cohortId: string): WorkspaceSelection {
    const cohort = WORKSPACE_COHORTS.find((item) => item.id === cohortId) ?? WORKSPACE_COHORTS[0];
    const offering = PROGRAM_OFFERINGS.find((item) => item.id === cohort.offeringId) ?? PROGRAM_OFFERINGS[0];
    const site = TRAINING_SITES.find((item) => item.id === offering.siteId) ?? TRAINING_SITES[0];
    return {
      organizationId: site.organizationId,
      siteId: site.id,
      programId: offering.programId,
      cohortId: cohort.id,
    };
  }

  private isSelectionAccessible(selection: WorkspaceSelection): boolean {
    const organization = ORGANIZATIONS.some((item) => item.id === selection.organizationId);
    const site = TRAINING_SITES.some(
      (item) => item.id === selection.siteId && item.organizationId === selection.organizationId,
    );
    const offering = this.findOffering(selection.siteId, selection.programId);
    const cohort = WORKSPACE_COHORTS.some(
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
      return TRAINING_SITES.some(
        (site) => access.siteIds?.includes(site.id) && site.organizationId === organizationId,
      );
    }
    if (access.offeringIds) {
      return PROGRAM_OFFERINGS.some((offering) => {
        if (!access.offeringIds?.includes(offering.id)) return false;
        const site = TRAINING_SITES.find((item) => item.id === offering.siteId);
        return site?.organizationId === organizationId;
      });
    }
    if (access.cohortIds) {
      return access.cohortIds.some((cohortId) => {
        const cohort = WORKSPACE_COHORTS.find((item) => item.id === cohortId);
        const offering = PROGRAM_OFFERINGS.find((item) => item.id === cohort?.offeringId);
        const site = TRAINING_SITES.find((item) => item.id === offering?.siteId);
        return site?.organizationId === organizationId;
      });
    }
    return false;
  }

  private canAccessSite(siteId: string): boolean {
    const access = this.access();
    if (access.scope === "platform" || access.organizationIds) {
      const site = TRAINING_SITES.find((item) => item.id === siteId);
      return !!site && this.canAccessOrganization(site.organizationId);
    }
    if (access.siteIds) return access.siteIds.includes(siteId);
    if (access.offeringIds) {
      return PROGRAM_OFFERINGS.some(
        (offering) => access.offeringIds?.includes(offering.id) && offering.siteId === siteId,
      );
    }
    if (access.cohortIds) {
      return access.cohortIds.some((cohortId) => {
        const cohort = WORKSPACE_COHORTS.find((item) => item.id === cohortId);
        const offering = PROGRAM_OFFERINGS.find((item) => item.id === cohort?.offeringId);
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
        (cohortId) => WORKSPACE_COHORTS.find((item) => item.id === cohortId)?.offeringId === offering.id,
      );
    }
    return false;
  }

  private canAccessCohort(cohortId: string): boolean {
    const access = this.access();
    const cohort = WORKSPACE_COHORTS.find((item) => item.id === cohortId);
    if (!cohort) return false;
    if (access.cohortIds) return access.cohortIds.includes(cohortId);
    const offering = PROGRAM_OFFERINGS.find((item) => item.id === cohort.offeringId);
    return !!offering && this.canAccessOffering(offering);
  }

  private findOffering(siteId: string, programId: string): ProgramOffering | undefined {
    return PROGRAM_OFFERINGS.find(
      (item) => item.siteId === siteId && item.programId === programId && item.active,
    );
  }

  private commit(selection: WorkspaceSelection): void {
    this.selectionSignal.set(selection);
    this.persist(selection);
    const cohort = WORKSPACE_COHORTS.find((item) => item.id === selection.cohortId);
    if (cohort?.legacyPromotionId) {
      this.sessionService.setPromotion(cohort.legacyPromotionId);
    }
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
