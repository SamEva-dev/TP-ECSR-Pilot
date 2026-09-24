import { ProgramApiStoreService } from "../../../core/api-data/program-api-store.service";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";

import type { ProgramCatalogItem, ProgramFormValue } from "../../../core/models/programs.models";
import { PROGRAM_OFFERINGS, WORKSPACE_COHORTS } from "../../../core/api-data/runtime-data.store";
import { TRAINING_REFERENTIALS } from "../../../core/api-data/runtime-data.store";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";
import { ProgramDrawerComponent } from "../program-drawer/program-drawer.component";

@Component({
  selector: "app-program-detail",
  imports: [RouterLink, TranslatePipe, ProgramDrawerComponent],
  templateUrl: "./program-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramDetailComponent {
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(ProgramApiStoreService);
  readonly workspace = inject(WorkspaceContextService);
  readonly drawerOpen = signal(false);
  readonly programId = this.route.snapshot.paramMap.get("id") ?? "";

  readonly program = computed(() => this.store.programs().find((item) => item.id === this.programId) ?? null);
  readonly activeReferential = computed(() => TRAINING_REFERENTIALS.find((item) => item.programId === this.programId && item.status === "active") ?? null);
  readonly organizationSites = computed(() => this.workspace.sites());
  readonly offeredSites = computed(() => {
    const program = this.program();
    return this.organizationSites().map((site) => ({ ...site, enabled: !!program?.siteIds.includes(site.id) }));
  });
  readonly enabledSiteCount = computed(() => this.offeredSites().filter((site) => site.enabled).length);
  readonly cohorts = computed(() => {
    const program = this.program();
    if (!program) return [];
    return WORKSPACE_COHORTS.flatMap((cohort) => {
      const offering = PROGRAM_OFFERINGS.find((item) => item.id === cohort.offeringId && item.programId === program.id);
      if (!offering) return [];
      const site = this.workspace.sites().find((item) => item.id === offering.siteId);
      if (!site || site.organizationId !== this.workspace.organization()?.id) return [];
      return [{ ...cohort, siteName: site.name }];
    });
  });

  edit(): void { this.drawerOpen.set(true); }
  save(value: ProgramFormValue): void {
    this.store.update(this.programId, value);
    this.drawerOpen.set(false);
  }
  toggleSite(siteId: string): void { this.store.toggleSite(this.programId, siteId); }

  statusClass(status: ProgramCatalogItem["status"]): string {
    return status === "active" ? "bg-[#e6f7ec] text-[#1b8f4d]" : status === "draft" ? "bg-[#fff1d2] text-[#8b6100]" : "bg-[#eef1f5] text-[#667085]";
  }
}
