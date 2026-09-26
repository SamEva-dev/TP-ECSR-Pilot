import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { ProgramApiStoreService } from "../../../core/api-data/program-api-store.service";
import { SiteApiStoreService } from "../../../core/api-data/site-api-store.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { SiteFormValue } from "../../../core/models/sites.models";
import { ApplicationNotificationService } from "../../../core/notifications/application-notification.service";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";
import { SiteDrawerComponent } from "../site-drawer/site-drawer.component";

interface SiteAlertViewModel {
  id: string;
  level: "danger" | "warning" | "info";
  titleKey: string;
  detailKey: string;
}

@Component({
  selector: "app-site-detail",
  imports: [RouterLink, TranslatePipe, SiteDrawerComponent],
  templateUrl: "./site-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(ApplicationNotificationService);
  readonly workspace = inject(WorkspaceContextService);
  readonly store = inject(SiteApiStoreService);
  readonly programStore = inject(ProgramApiStoreService);
  readonly drawerOpen = signal(false);
  readonly siteId = this.route.snapshot.paramMap.get("id") ?? "";
  readonly site = computed(() => this.store.byId(this.siteId) ?? null);
  readonly alerts = computed<SiteAlertViewModel[]>(() => []);

  readonly programs = computed(() => {
    const cohorts = this.workspace.siteCohorts(this.siteId);
    return this.programStore.programs()
      .filter((program) => program.siteIds.includes(this.siteId))
      .map((program) => {
        const programCohorts = cohorts.filter((cohort) => cohort.programId === program.id);
        return {
          ...program,
          metric: {
            students: programCohorts.reduce((sum, cohort) => sum + (cohort.studentCount ?? 0), 0),
            trainers: 0,
            activeCohorts: programCohorts.filter((cohort) => cohort.status === "active").length,
            attendanceRate: 0,
            successRate: 0,
          },
        };
      });
  });

  readonly cohorts = computed(() =>
    this.workspace.siteCohorts(this.siteId).map((cohort) => ({
      ...cohort,
      programName: cohort.programName ?? "",
      name: cohort.name ?? "",
      shortName: cohort.shortName ?? "",
      start: cohort.start ?? "",
      end: cohort.end ?? "",
      studentCount: cohort.studentCount ?? 0,
    })),
  );

  constructor() {
    queueMicrotask(() => this.workspace.selectSite(this.siteId));
    effect(() => {
      if (this.workspace.remoteWorkspaceError())
        this.notifications.error("sites.real.workspaceError", `/etablissements/${this.siteId}`);
    });
  }

  edit(): void {
    this.drawerOpen.set(true);
  }

  async save(value: SiteFormValue): Promise<void> {
    if (await this.store.update(this.siteId, value)) this.drawerOpen.set(false);
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
