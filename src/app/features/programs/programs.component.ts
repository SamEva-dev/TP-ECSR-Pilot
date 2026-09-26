import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { ProgramApiStoreService } from "../../core/api-data/program-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
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
  private readonly notifications = inject(ApplicationNotificationService);
  readonly store = inject(ProgramApiStoreService);
  readonly workspace = inject(WorkspaceContextService);
  readonly query = signal("");
  readonly category = signal<"all" | ProgramCatalogCategory>("all");
  readonly status = signal<"all" | ProgramCatalogStatus>("all");
  readonly drawerOpen = signal(false);
  readonly editingProgram = signal<ProgramCatalogItem | null>(null);

  readonly organizationSiteIds = computed(() => this.workspace.sites().map((site) => site.id ?? ""));

  readonly programs = computed(() => this.store.programs().filter((program) =>
    program.siteIds.some((siteId) => this.organizationSiteIds().includes(siteId)) || program.siteIds.length === 0,
  ));

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

  readonly totals = computed(() => this.programs().reduce((acc, program) => ({
    students: acc.students + (program.students ?? 0),
    trainers: acc.trainers + (program.trainers ?? 0),
    cohorts: acc.cohorts + (program.activeCohorts ?? 0),
  }), { students: 0, trainers: 0, cohorts: 0 }));

  constructor() {
    effect(() => {
      if (this.workspace.remoteWorkspaceError())
        this.notifications.error("programs.real.workspaceError", "/formations");
    });
  }

  addProgram(): void {
    this.editingProgram.set(null);
    this.drawerOpen.set(true);
  }

  editProgram(program: ProgramCatalogItem): void {
    this.editingProgram.set(program);
    this.drawerOpen.set(true);
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
    return program.siteIds.filter((siteId) => this.organizationSiteIds().includes(siteId)).length;
  }

  statusClass(status: ProgramCatalogStatus): string {
    return status === "active" ? "bg-[#e6f7ec] text-[#1b8f4d]" : status === "draft" ? "bg-[#fff1d2] text-[#8b6100]" : "bg-[#eef1f5] text-[#667085]";
  }
}
