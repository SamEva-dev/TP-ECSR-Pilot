import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { ProgramApiStoreService } from "../../../core/api-data/program-api-store.service";
import { ReferentialApiStoreService } from "../../../core/api-data/referential-api-store.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { ProgramCatalogItem, ProgramFormValue } from "../../../core/models/programs.models";
import { ApplicationNotificationService } from "../../../core/notifications/application-notification.service";
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
  private readonly notifications = inject(ApplicationNotificationService);
  readonly store = inject(ProgramApiStoreService);
  readonly referentials = inject(ReferentialApiStoreService);
  readonly workspace = inject(WorkspaceContextService);
  readonly drawerOpen = signal(false);
  readonly programId = this.route.snapshot.paramMap.get("id") ?? "";

  readonly program = computed(() => this.store.programs().find((item) => item.id === this.programId) ?? null);
  readonly activeReferential = computed(() => this.referentials.items().find((item) => item.programId === this.programId && item.status === "active") ?? null);
  readonly organizationSites = computed(() => this.workspace.sites().map((site) => ({
    ...site,
    id: site.id ?? "",
    name: site.name ?? "",
    city: site.city ?? "",
    code: site.code ?? "",
  })));
  readonly offeredSites = computed(() => {
    const program = this.program();
    return this.organizationSites().map((site) => ({ ...site, enabled: !!program?.siteIds.includes(site.id) }));
  });
  readonly enabledSiteCount = computed(() => this.offeredSites().filter((site) => site.enabled).length);
  readonly cohorts = computed(() => {
    const program = this.program();
    if (!program) return [];
    return this.organizationSites().flatMap((site) =>
      this.workspace.siteCohorts(site.id)
        .filter((cohort) => cohort.programId === program.id)
        .map((cohort) => ({
          ...cohort,
          name: cohort.name ?? "",
          start: cohort.start ?? "",
          end: cohort.end ?? "",
          studentCount: cohort.studentCount ?? 0,
          siteName: site.name ?? "",
        })),
    );
  });

  constructor() {
    effect(() => {
      if (this.workspace.remoteWorkspaceError())
        this.notifications.error("programs.real.workspaceError", `/formations/${this.programId}`);
    });
    effect(() => {
      if (this.referentials.loadError())
        this.notifications.error("referentials.api.loadError", `/formations/${this.programId}`);
    });
  }

  edit(): void {
    this.drawerOpen.set(true);
  }

  async save(value: ProgramFormValue): Promise<void> {
    if (await this.store.update(this.programId, value)) this.drawerOpen.set(false);
  }

  async toggleSite(siteId: string): Promise<void> {
    await this.store.toggleSite(this.programId, siteId);
  }

  statusClass(status: ProgramCatalogItem["status"]): string {
    return status === "active" ? "bg-[#e6f7ec] text-[#1b8f4d]" : status === "draft" ? "bg-[#fff1d2] text-[#8b6100]" : "bg-[#eef1f5] text-[#667085]";
  }
}
