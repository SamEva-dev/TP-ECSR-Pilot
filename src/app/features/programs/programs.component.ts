import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { PedagoraAccessApiService, type ProductAccount } from "../../core/access/pedagora-access-api.service";
import { RealtimeService } from "../../core/realtime/realtime.service";
import { ProgramApiStoreService } from "../../core/api-data/program-api-store.service";
import { AccessPolicyService } from "../../core/access/access-policy.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslateService } from "../../core/i18n/translate.service";
import type { ProgramCatalogCategory, ProgramCatalogItem, ProgramCatalogStatus, ProgramFormValue } from "../../core/models/programs.models";
import { ApplicationNotificationService } from "../../core/notifications/application-notification.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ProgramDrawerComponent } from "./program-drawer/program-drawer.component";

@Component({
  selector: "app-programs",
  imports: [TranslatePipe, ProgramDrawerComponent],
  templateUrl: "./programs.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramsComponent {
  private readonly router = inject(Router);
  private readonly accessApi = inject(PedagoraAccessApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly trainerAccounts = signal<ProductAccount[] | null>(null);
  private trainerRequest = 0;
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly translate = inject(TranslateService);
  readonly access = inject(AccessPolicyService);
  readonly store = inject(ProgramApiStoreService);
  readonly workspace = inject(WorkspaceContextService);
  readonly query = signal("");
  readonly category = signal<"all" | ProgramCatalogCategory>("all");
  readonly status = signal<"all" | ProgramCatalogStatus>("all");
  readonly drawerOpen = signal(false);
  readonly editingProgram = signal<ProgramCatalogItem | null>(null);
  // A training program is shared at organization level; a new site gets an
  // offering rather than a second program identity or referential copy.
  readonly attachOpen = signal(false);
  readonly selectedSourceProgram = signal("");
  readonly attaching = signal(false);
  readonly attachCandidates = computed(() => {
    const siteId = this.workspace.site()?.id;
    if (!siteId) return [];
    return this.store.programs().filter(program =>
      !program.siteIds.includes(siteId) && program.status !== "inactive"
    );
  });


  // A catalog item is visible only when it belongs to the selected scope.
  // The site selection must never silently fall back to every site in the org.
  readonly organizationSiteIds = computed(() => this.workspace.sites().map((site) => site.id ?? ""));
  readonly scopeSiteIds = computed(() => {
    if (this.workspace.activeLevel() === "organization") return this.organizationSiteIds();
    const siteId = this.workspace.site()?.id;
    return siteId ? [siteId] : [];
  });
  readonly programs = computed(() => {
    const allowed = new Set(this.scopeSiteIds());
    const selectedProgramId = this.workspace.program()?.id;
    const level = this.workspace.activeLevel();
    return this.store.programs()
      .filter((program) =>
        program.siteIds.some((siteId) => allowed.has(siteId)) &&
        (level === "organization" || level === "site" || program.id === selectedProgramId),
      )
      .map((program) => {
        // Read the current API-backed workspace signal, rather than counters
        // snapshotted when the program catalog was last fetched.
        const seen = new Set<string>();
        const cohorts = program.siteIds
          .filter((siteId) => allowed.has(siteId))
          .flatMap((siteId) => this.workspace.siteCohorts(siteId))
          .filter((cohort) => {
            if (cohort.programId !== program.id || seen.has(cohort.id)) return false;
            seen.add(cohort.id);
            return true;
          });
        return {
          ...program,
          students: cohorts.reduce((sum, cohort) => sum + Number(cohort.studentCount ?? 0), 0),
          activeCohorts: cohorts.filter((cohort) => cohort.status === "active").length,
        };
      });
  });

  readonly filteredPrograms = computed(() => {
    const q = this.query().trim().toLocaleLowerCase("fr-FR");
    return this.programs().filter((program) => {
      const matchesQuery = !q || [program.name, program.code, program.referenceVersion]
        .map((value) => value ?? "")
        .some((value) => value.toLocaleLowerCase("fr-FR").includes(q));
      const matchesCategory = this.category() === "all" || program.category === this.category();
      const matchesStatus = this.status() === "all" || program.status === this.status();
      return matchesQuery && matchesCategory && matchesStatus;
    });
  });

  readonly totals = computed(() => {
    const programs = this.programs();
    const students = programs.reduce((sum, program) => sum + (program.students ?? 0), 0);
    const cohorts = programs.reduce((sum, program) => sum + (program.activeCohorts ?? 0), 0);
    // Distinct active trainer members assigned to this selected scope.
    // Organization scope includes all its trainers; narrower scopes require
    // an explicit local business assignment.
    const trainers = this.trainerTotal(programs);
    return { students, trainers, cohorts };
  });

  constructor() {
    effect(() => {
      if (this.workspace.remoteWorkspaceError())
        this.notifications.error("programs.real.workspaceError", "/formations");
    });
    effect(() => {
      const organizationId = this.workspace.organization()?.apiId;
      const ready = this.workspace.remoteWorkspaceLoaded();
      if (ready && organizationId) void this.loadTrainerCount(organizationId);
      else {
        ++this.trainerRequest;
        this.trainerAccounts.set(null);
      }
    });
    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !(/^(pedagora\.access\.|pedagora\.training\.)/.test(event.typeKey))) return;
      const organizationId = this.workspace.organization()?.apiId;
      if (organizationId && this.workspace.remoteWorkspaceLoaded())
        void this.loadTrainerCount(organizationId);
    });
  }

  private async loadTrainerCount(organizationId: string): Promise<void> {
    const request = ++this.trainerRequest;
    this.trainerAccounts.set(null);
    try {
      const accounts: ProductAccount[] = [];
      const pageSize = 100;
      for (let page = 1; page <= 100; page++) {
        const response = await firstValueFrom(this.accessApi.list(page, "", pageSize));
        accounts.push(...(response.items ?? []));
        if (page * pageSize >= response.totalCount || !response.items?.length) break;
      }
      if (request !== this.trainerRequest || this.workspace.organization()?.apiId !== organizationId) return;
      this.trainerAccounts.set(accounts);
    } catch {
      if (request === this.trainerRequest) this.trainerAccounts.set(null);
    }
  }

  private trainerTotal(programs: ProgramCatalogItem[]): number | null {
    const accounts = this.trainerAccounts();
    if (!accounts) return null;
    const organizationLevel = this.workspace.activeLevel() === "organization";
    const siteKeys = new Set(this.scopeSiteIds());
    const sites = this.workspace.sites().filter(site => siteKeys.has(site.id));
    const siteIds = new Set(sites.flatMap(site => [site.id, site.apiId]));
    const programIds = new Set(programs.flatMap(program => [program.id, program.apiId]));
    const cohortIds = new Set(sites.flatMap(site => this.workspace.siteCohorts(site.id))
      .filter(cohort => programs.some(program => program.id === cohort.programId))
      .flatMap(cohort => [cohort.id, cohort.apiId]));
    return new Set(accounts.filter(account => {
      if (account.status !== "Active" || account.isInvitation) return false;
      const roles = [account.primaryRole, ...(account.roles ?? [])];
      const trainerRole = roles.some(role => /(?:trainer|formateur)/i.test(role ?? ""));
      if (!trainerRole) return false;
      if (organizationLevel) return true;
      return (account.assignments ?? []).some(assignment => {
        if (!assignment.active) return false;
        if (assignment.cohortId) return cohortIds.has(assignment.cohortId);
        if (assignment.programId) return programIds.has(assignment.programId);
        if (assignment.siteId) return siteIds.has(assignment.siteId);
        return assignment.scope === "organization";
      });
    }).map(account => account.id)).size;
  }

  openAttach(): void {
    if (!this.workspace.site()?.apiId || !this.access.can("programs.manage")) return;
    this.selectedSourceProgram.set("");
    this.attachOpen.set(true);
  }

  async attachExistingProgram(): Promise<void> {
    const programId = this.selectedSourceProgram();
    const siteId = this.workspace.site()?.id;
    if (!siteId || !programId || this.attaching() || !this.access.can("programs.manage")) return;
    const candidate = this.attachCandidates().find(item => item.id === programId);
    if (!candidate) return;
    this.attaching.set(true);
    try {
      const success = await this.store.toggleSite(programId, siteId);
      if (success) {
        this.attachOpen.set(false);
        this.selectedSourceProgram.set("");
      }
    } finally {
      this.attaching.set(false);
    }
  }

  addProgram(): void {
    this.editingProgram.set(null);
    this.drawerOpen.set(true);
  }

  editProgram(program: ProgramCatalogItem): void {
    this.editingProgram.set(program);
    this.drawerOpen.set(true);
  }

  async deleteProgram(program: ProgramCatalogItem): Promise<void> {
    if (!this.access.can("programs.delete")) return;
    const confirmed = typeof window === "undefined" || window.confirm(
      this.translate.instant("programs.delete.confirm", { name: program.name }),
    );
    if (!confirmed) return;
    await this.store.delete(program.id);
  }

  async saveProgram(value: ProgramFormValue): Promise<void> {
    const current = this.editingProgram();
    const saved = current
      ? await this.store.update(current.id, value)
      : await this.store.create(value);
    if (!saved) return;
    this.drawerOpen.set(false);
    this.editingProgram.set(null);
  }

  openProgram(program: ProgramCatalogItem): void {
    void this.router.navigate(["/formations", program.id]);
  }

  setCategory(value: string): void {
    this.category.set(value as "all" | ProgramCatalogCategory);
  }

  setStatus(value: string): void {
    this.status.set(value as "all" | ProgramCatalogStatus);
  }

  organizationSiteCount(program: ProgramCatalogItem): number {
    return program.siteIds.filter((siteId) => this.scopeSiteIds().includes(siteId)).length;
  }

  statusClass(status: ProgramCatalogStatus): string {
    return status === "active" ? "bg-[#e6f7ec] text-[#1b8f4d]" : status === "draft" ? "bg-[#fff1d2] text-[#8b6100]" : "bg-[#eef1f5] text-[#667085]";
  }
}
