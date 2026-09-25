import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  ORGANIZATION_ACTIVITY,
  ORGANIZATION_ALERTS,
  ORGANIZATION_KPIS,
  PROGRAM_PERFORMANCES,
  SITE_PERFORMANCES,
} from "../../core/api-data/runtime-data.store";
import { PROGRAM_OFFERINGS } from "../../core/api-data/runtime-data.store";
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

  readonly organizationId = computed(
    () => this.workspace.organization()?.id ?? "org-aftral",
  );
  readonly kpis = computed(
    () =>
      ORGANIZATION_KPIS.find(
        (item) => item.organizationId === this.organizationId(),
      ) ?? ORGANIZATION_KPIS[0],
  );
  readonly sites = computed(() =>
    SITE_PERFORMANCES.filter(
      (item) => item.organizationId === this.organizationId(),
    ),
  );
  readonly programs = computed(() =>
    PROGRAM_PERFORMANCES.filter(
      (item) => item.organizationId === this.organizationId(),
    ),
  );
  readonly alerts = computed(() =>
    ORGANIZATION_ALERTS.filter(
      (item) => item.organizationId === this.organizationId(),
    ),
  );
  readonly activity = computed(() =>
    ORGANIZATION_ACTIVITY.filter(
      (item) => item.organizationId === this.organizationId(),
    ),
  );

  openSite(siteId: string): void {
    this.workspace.selectSite(siteId);
    void this.router.navigate(["/etablissements", siteId]);
  }

  openProgram(programId: string): void {
    const accessibleSite = this.workspace
      .sites()
      .find((site) =>
        PROGRAM_OFFERINGS.some(
          (offering) =>
            offering.siteId === site.id &&
            offering.programId === programId &&
            offering.active,
        ),
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
    return new Intl.NumberFormat("fr-FR").format(value);
  }
}
