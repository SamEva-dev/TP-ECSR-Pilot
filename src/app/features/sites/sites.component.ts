import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { SiteApiStoreService } from "../../core/api-data/site-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type { SiteFormValue, SiteOperationalStatus, SiteProfile } from "../../core/models/sites.models";
import { ApplicationNotificationService } from "../../core/notifications/application-notification.service";
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
  private readonly notifications = inject(ApplicationNotificationService);
  readonly workspace = inject(WorkspaceContextService);
  readonly store = inject(SiteApiStoreService);
  readonly query = signal("");
  readonly status = signal<"all" | SiteOperationalStatus>("all");
  readonly drawerOpen = signal(false);
  readonly editingSite = signal<SiteProfile | null>(null);

  readonly organizationSites = computed(() =>
    this.store.sites().filter((site) => site.organizationId === (this.workspace.organization()?.id ?? "")),
  );

  readonly filteredSites = computed(() => {
    const query = this.query().trim().toLocaleLowerCase("fr-FR");
    const status = this.status();
    return this.organizationSites().filter((site) => {
      const matchesQuery = !query || [site.name, site.city, site.code, site.manager]
        .map((value) => value ?? "")
        .some((value) => value.toLocaleLowerCase("fr-FR").includes(query));
      const matchesStatus = status === "all" || site.status === status;
      return matchesQuery && matchesStatus;
    });
  });

  readonly totals = computed(() => this.organizationSites().reduce(
    (acc, site) => ({
      students: acc.students + (site.students ?? 0),
      trainers: acc.trainers + (site.trainers ?? 0),
      programs: acc.programs + (site.programs ?? 0),
      alerts: acc.alerts + (site.alerts ?? 0),
    }),
    { students: 0, trainers: 0, programs: 0, alerts: 0 },
  ));

  constructor() {
    effect(() => {
      if (this.workspace.remoteWorkspaceError())
        this.notifications.error("sites.real.workspaceError", "/etablissements");
    });
  }

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

  async saveSite(value: SiteFormValue): Promise<void> {
    const current = this.editingSite();
    const saved = current
      ? await this.store.update(current.id, value)
      : await this.store.create(this.workspace.organization()?.id ?? "", value);
    if (!saved) return;
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
