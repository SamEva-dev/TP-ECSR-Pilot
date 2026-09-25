import { SiteApiStoreService } from "../../../core/api-data/site-api-store.service";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";

import {
  SITE_ALERTS,
  SITE_PROGRAM_METRICS,
} from "../../../core/api-data/runtime-data.store";
import type { SiteFormValue } from "../../../core/models/sites.models";
import {
  PROGRAM_OFFERINGS,
  TRAINING_PROGRAMS,
  WORKSPACE_COHORTS,
} from "../../../core/api-data/runtime-data.store";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";
import { SiteDrawerComponent } from "../site-drawer/site-drawer.component";

@Component({
  selector: "app-site-detail",
  imports: [RouterLink, TranslatePipe, SiteDrawerComponent],
  templateUrl: "./site-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteDetailComponent {
  private readonly route = inject(ActivatedRoute);
  readonly workspace = inject(WorkspaceContextService);
  readonly store = inject(SiteApiStoreService);
  readonly drawerOpen = signal(false);
  readonly siteId = this.route.snapshot.paramMap.get("id") ?? "";
  readonly site = computed(() => this.store.byId(this.siteId) ?? null);
  readonly alerts = computed(() =>
    SITE_ALERTS.filter((item) => item.siteId === this.siteId),
  );

  readonly programs = computed(() => {
    const offeringProgramIds = PROGRAM_OFFERINGS.filter(
      (offering) => offering.siteId === this.siteId && offering.active,
    ).map((offering) => offering.programId);
    return TRAINING_PROGRAMS.filter((program) =>
      offeringProgramIds.includes(program.id),
    ).map((program) => ({
      ...program,
      metric: SITE_PROGRAM_METRICS.find(
        (metric) =>
          metric.siteId === this.siteId && metric.programId === program.id,
      ),
    }));
  });

  readonly cohorts = computed(() => {
    const offeringIds = PROGRAM_OFFERINGS.filter(
      (offering) => offering.siteId === this.siteId,
    ).map((offering) => offering.id);
    return WORKSPACE_COHORTS.filter((cohort) =>
      offeringIds.includes(cohort.offeringId),
    ).map((cohort) => {
      const offering = PROGRAM_OFFERINGS.find(
        (item) => item.id === cohort.offeringId,
      );
      const program = TRAINING_PROGRAMS.find(
        (item) => item.id === offering?.programId,
      );
      return { ...cohort, programName: program?.name ?? "—" };
    });
  });

  constructor() {
    queueMicrotask(() => this.workspace.selectSite(this.siteId));
  }

  edit(): void {
    this.drawerOpen.set(true);
  }

  save(value: SiteFormValue): void {
    this.store.update(this.siteId, value);
    this.drawerOpen.set(false);
  }

  statusClass(status: string): string {
    return status === "active"
      ? "bg-[#e6f7ec] text-[#1b8f4d]"
      : status === "attention"
        ? "bg-[#fff1d2] text-[#8b6100]"
        : "bg-[#eef1f5] text-[#667085]";
  }

  alertClass(level: "danger" | "warning" | "info"): string {
    return level === "danger"
      ? "bg-[#fee9e7] text-[#b42318]"
      : level === "warning"
        ? "bg-[#fff3d6] text-[#8a5c00]"
        : "bg-[#e9f3ff] text-[#245c97]";
  }
}
