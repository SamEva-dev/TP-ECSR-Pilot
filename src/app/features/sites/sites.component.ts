import { SiteApiStoreService } from "../../core/api-data/site-api-store.service";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";

import type { SiteFormValue, SiteOperationalStatus, SiteProfile } from "../../core/models/sites.models";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { SiteDrawerComponent } from "./site-drawer/site-drawer.component";

@Component({
  selector: "app-sites",
  imports: [TranslatePipe, SiteDrawerComponent],
  templateUrl: "./sites.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SitesComponent {
  private readonly router = inject(Router);
  readonly workspace = inject(WorkspaceContextService);
  readonly store = inject(SiteApiStoreService);
  readonly query = signal("");
  readonly status = signal<"all" | SiteOperationalStatus>("all");
  readonly drawerOpen = signal(false);
  readonly editingSite = signal<SiteProfile | null>(null);

  readonly organizationSites = computed(() =>
    this.store.sites().filter((site) => site.organizationId === this.workspace.organization()?.id),
  );

  readonly filteredSites = computed(() => {
    const query = this.query().trim().toLocaleLowerCase("fr-FR");
    const status = this.status();
    return this.organizationSites().filter((site) => {
      const matchesQuery = !query || [site.name, site.city, site.code, site.manager].some((value) => value.toLocaleLowerCase("fr-FR").includes(query));
      const matchesStatus = status === "all" || site.status === status;
      return matchesQuery && matchesStatus;
    });
  });

  readonly totals = computed(() => this.organizationSites().reduce(
    (acc, site) => ({
      students: acc.students + site.students,
      trainers: acc.trainers + site.trainers,
      programs: acc.programs + site.programs,
      alerts: acc.alerts + site.alerts,
    }),
    { students: 0, trainers: 0, programs: 0, alerts: 0 },
  ));

  setStatus(value: string): void {
    this.status.set(value as "all" | SiteOperationalStatus);
  }

  addSite(): void {
    this.editingSite.set(null);
    this.drawerOpen.set(true);
  }

  editSite(site: SiteProfile): void {
    this.editingSite.set(site);
    this.drawerOpen.set(true);
  }

  saveSite(value: SiteFormValue): void {
    const current = this.editingSite();
    if (current) this.store.update(current.id, value);
    else this.store.create(this.workspace.organization()?.id ?? "org-aftral", value);
    this.drawerOpen.set(false);
    this.editingSite.set(null);
  }

  openSite(site: SiteProfile): void {
    this.workspace.selectSite(site.id);
    void this.router.navigate(["/etablissements", site.id]);
  }

  statusClass(status: SiteOperationalStatus): string {
    return status === "active"
      ? "bg-[#e6f7ec] text-[#1b8f4d]"
      : status === "attention"
        ? "bg-[#fff1d2] text-[#8b6100]"
        : "bg-[#eef1f5] text-[#667085]";
  }
}
