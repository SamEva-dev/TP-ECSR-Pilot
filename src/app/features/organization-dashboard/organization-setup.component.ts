import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ReferentialApiStoreService } from "../../core/api-data/referential-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";

/** S01: read-only, server-backed onboarding. The UI never creates entities or claims unverified writes. */
@Component({
  selector: "app-organization-setup",
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: "./organization-setup.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSetupComponent {
  private readonly router = inject(Router);
  readonly workspace = inject(WorkspaceContextService);
  readonly referentials = inject(ReferentialApiStoreService);

  readonly ready = computed(() => this.workspace.remoteWorkspaceLoaded() && this.referentials.remoteLoaded());
  readonly steps = computed(() => {
    const sites = this.workspace.sites();
    const programs = sites.flatMap(site => this.workspace.sitePrograms(site.id));
    const uniquePrograms = new Set(programs.map(program => program.id));
    const versions = this.referentials.items().filter(item => uniquePrograms.has(item.programId));
    const cohorts = sites.flatMap(site => this.workspace.siteCohorts(site.id));
    const sitesReady = sites.length > 0;
    const programsReady = programs.length > 0;
    const referencesReady = versions.length > 0;
    const cohortsReady = cohorts.length > 0;
    return [
      // Access provisioning is verified in S02; never falsely mark it completed.
      { key: "access", href: "/acces", complete: false, verifiable: false, count: null },
      { key: "sites", href: "/etablissements", complete: sitesReady, verifiable: true, count: sites.length },
      { key: "programs", href: "/formations", complete: programsReady, verifiable: true, count: uniquePrograms.size },
      { key: "referentials", href: "/referentiels", complete: referencesReady, verifiable: true, count: versions.length },
      { key: "cohorts", href: "/promotions", complete: cohortsReady, verifiable: true, count: cohorts.length },
      { key: "students", href: "/stagiaires", complete: false, verifiable: false, count: null },
      { key: "planning", href: "/planning", complete: false, verifiable: false, count: null },
    ];
  });
  /** First unfinished verifiable prerequisite; unverified steps remain informational. */
  readonly nextStepKey = computed(() => this.steps().find(step => step.verifiable && !step.complete)?.key ?? "");
  readonly stepOrder = computed(() => this.steps().map((step, index) => ({ ...step, number: index + 1 })));
  readonly verifiedCount = computed(() => this.steps().filter(step => step.verifiable && step.complete).length);
  readonly totalVerifiable = computed(() => this.steps().filter(step => step.verifiable).length);

  /** This is an organization-scoped UI preference, never a business completion flag. */
  private readonly displayPreference = signal<{ organizationId: string; expanded: boolean } | null>(null);
  readonly currentOrganizationId = computed(() => this.workspace.organization()?.id ?? "");
  readonly completed = computed(() => this.ready() && this.totalVerifiable() > 0 && this.verifiedCount() === this.totalVerifiable());
  readonly expanded = computed(() => {
    const id = this.currentOrganizationId();
    if (!id) return false;
    const current = this.displayPreference();
    if (current !== null && current.organizationId === id) return current.expanded;
    const saved = this.readPreference(id);
    return saved ?? !this.completed();
  });

  toggleExpanded(): void {
    const organizationId = this.currentOrganizationId();
    if (!organizationId) return;
    const expanded = !this.expanded();
    this.displayPreference.set({ organizationId, expanded });
    try { localStorage.setItem(this.preferenceKey(organizationId), expanded ? "expanded" : "collapsed"); } catch { /* Private browsing or storage disabled. */ }
  }

  private preferenceKey(id: string): string {
    return `pedagora.organization-setup.v1.${id}`;
  }

  private readPreference(id: string): boolean | null {
    try {
      const value = localStorage.getItem(this.preferenceKey(id));
      if (value === "expanded") return true;
      if (value === "collapsed") return false;
    } catch { /* Storage is optional. */ }
    return null;
  }


  /** Safe context preselection only when an unambiguous single child exists. */
  go(key: string, href: string): void {
    const sites = this.workspace.sites();
    if (["access", "sites"].includes(key) && this.workspace.organization()) {
      this.workspace.selectOrganization(this.workspace.organization()!.id);
    }
    if (["programs", "referentials", "cohorts", "students", "planning"].includes(key) && !this.workspace.site() && sites.length === 1) {
      this.workspace.selectSite(sites[0].id);
    }
    if (["referentials", "cohorts", "students", "planning"].includes(key) && this.workspace.site() && !this.workspace.program()) {
      const programs = this.workspace.sitePrograms(this.workspace.site()!.id);
      if (programs.length === 1) this.workspace.selectProgram(programs[0].id);
    }
    if (["students", "planning"].includes(key) && this.workspace.program() && !this.workspace.cohort()) {
      const cohorts = this.workspace.cohorts();
      if (cohorts.length === 1) this.workspace.selectCohort(cohorts[0].id);
    }
    void this.router.navigateByUrl(href);
  }
}
