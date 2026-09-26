import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { OrganizationDashboardApiStoreService } from "../../core/api-data/organization-dashboard-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";

@Component({
  selector: "app-organization-dashboard",
  imports: [TranslatePipe, RouterLink],
  templateUrl: "./organization-dashboard.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardComponent {
  private readonly router = inject(Router);
  readonly workspace = inject(WorkspaceContextService);
  private readonly dashboard = inject(OrganizationDashboardApiStoreService);

  readonly kpis = this.dashboard.kpis;
  readonly sites = this.dashboard.sites;
  readonly programs = this.dashboard.programs;
  readonly alerts = this.dashboard.alerts;
  readonly activity = this.dashboard.activity;

  openSite(siteId: string): void {
    if (!siteId) return;
    this.workspace.selectSite(siteId);
    void this.router.navigate(["/etablissements", siteId]);
  }

  openProgram(programId: string): void {
    if (!programId) return;
    const accessibleSite = this.workspace.sites().find((site) =>
      this.workspace.sitePrograms(site.id).some((program) => program.id === programId),
    );
    if (!accessibleSite) return;
    this.workspace.selectSite(accessibleSite.id);
    this.workspace.selectProgram(programId);
    void this.router.navigateByUrl("/accueil");
  }

  alertClass(level: "danger" | "warning" | "info"): string {
    return level === "danger"
      ? "bg-[#fee9e7] text-[#b42318]"
      : level === "warning"
        ? "bg-[#fff3d6] text-[#8a5c00]"
        : "bg-[#e9f3ff] text-[#245c97]";
  }

  alertIcon(level: "danger" | "warning" | "info"): string {
    return level === "info" ? "ph-info" : "ph-warning";
  }

  number(value: number): string {
    return new Intl.NumberFormat("fr-FR").format(Number.isFinite(value) ? value : 0);
  }
}
