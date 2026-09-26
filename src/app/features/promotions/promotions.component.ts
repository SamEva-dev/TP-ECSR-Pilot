import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { CohortApiStoreService } from "../../core/api-data/cohort-api-store.service";
import { ReferentialApiStoreService } from "../../core/api-data/referential-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type { ContextualPromotionSummary } from "../../core/models/contextual-promotions.models";
import type { WorkspaceCohort } from "../../core/models/workspace.models";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import {
  CreatePromotionDrawerComponent,
  type CreatePromotionPayload,
} from "./create-promotion-drawer/create-promotion-drawer.component";

type PromotionStatusFilter = "all" | WorkspaceCohort["status"];

@Component({
  selector: "app-promotions",
  imports: [RouterLink, TranslatePipe, ProgressBarComponent, CreatePromotionDrawerComponent],
  templateUrl: "./promotions.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionsComponent {
  readonly workspace = inject(WorkspaceContextService);
  readonly store = inject(CohortApiStoreService);
  readonly referentials = inject(ReferentialApiStoreService);
  readonly drawerOpen = signal(false);
  readonly createdPromotionName = signal("");
  readonly statusFilter = signal<PromotionStatusFilter>("all");

  readonly siteProgramPromotions = computed(() =>
    [...this.store.promotions()].sort((a, b) => b.start.localeCompare(a.start)),
  );

  readonly filteredPromotions = computed(() => {
    const filter = this.statusFilter();
    return this.siteProgramPromotions().filter((item) => filter === "all" || item.status === filter);
  });

  readonly counts = computed(() => ({
    all: this.siteProgramPromotions().length,
    active: this.siteProgramPromotions().filter((item) => item.status === "active").length,
    planned: this.siteProgramPromotions().filter((item) => item.status === "planned").length,
    completed: this.siteProgramPromotions().filter((item) => item.status === "completed").length,
  }));

  readonly activeStudents = computed(() =>
    this.siteProgramPromotions()
      .filter((item) => item.status === "active")
      .reduce((total, item) => total + this.number(item.studentCount), 0),
  );

  readonly referentialLabel = computed(() => {
    const cohort = this.workspace.cohort();
    if (!cohort) return "";
    return this.referentials.items().find(
      (item) => item.apiId === cohort.referentialVersionId || item.id === cohort.referentialVersionId,
    )?.version ?? "";
  });

  openCreateDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeCreateDrawer(): void {
    this.drawerOpen.set(false);
  }

  setStatusFilter(filter: PromotionStatusFilter): void {
    this.statusFilter.set(filter);
  }

  selectPromotion(item: ContextualPromotionSummary): void {
    const cohort = this.workspace.cohorts().find((candidate) => candidate.id === item.id);
    if (cohort) this.workspace.selectCohort(cohort.id);
  }

  async createPromotion(payload: CreatePromotionPayload): Promise<void> {
    const created = await this.store.create({
      name: payload.name,
      startDate: payload.startDate,
      endDate: payload.endDate,
      capacity: payload.studentCount,
      referentialVersionId: payload.referentialVersionId,
      status: payload.status,
    });
    if (!created) return;

    this.createdPromotionName.set(created.name);
    this.drawerOpen.set(false);
    setTimeout(() => this.createdPromotionName.set(""), 3500);
  }

  formatDate(value: string): string {
    if (!value) return "";
    const [year = "", month = "", day = ""] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : "";
  }

  statusClass(status: WorkspaceCohort["status"]): string {
    switch (status) {
      case "active":
        return "bg-[#dff7e5] text-[#178344]";
      case "planned":
      case "draft":
        return "bg-[#e7f2ff] text-[#2a64a2]";
      case "completed":
      case "cancelled":
        return "bg-[#eef0f4] text-[#5d6878]";
    }
  }

  statusIcon(status: WorkspaceCohort["status"]): string {
    switch (status) {
      case "active":
        return "ph-play-circle";
      case "planned":
      case "draft":
        return "ph-calendar-plus";
      case "completed":
        return "ph-check-circle";
      case "cancelled":
        return "ph-x-circle";
    }
  }

  metricValue(value: number, suffix = ""): string {
    return `${this.number(value).toLocaleString("fr-FR")}${suffix}`;
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
}
