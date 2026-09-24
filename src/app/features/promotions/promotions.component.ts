import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TRAINING_REFERENTIALS } from "../../core/api-data/runtime-data.store";
import { CONTEXTUAL_PROMOTIONS } from "../../core/api-data/runtime-data.store";
import type { ContextualPromotionSummary } from "../../core/models/contextual-promotions.models";
import { PROGRAM_OFFERINGS } from "../../core/api-data/runtime-data.store";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import {
  CreatePromotionDrawerComponent,
  type CreatePromotionPayload,
} from "./create-promotion-drawer/create-promotion-drawer.component";
import type { WorkspaceCohort } from "../../core/models/workspace.models";

type PromotionStatusFilter = "all" | WorkspaceCohort["status"];

@Component({
  selector: "app-promotions",
  imports: [RouterLink, TranslatePipe, ProgressBarComponent, CreatePromotionDrawerComponent],
  templateUrl: "./promotions.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionsComponent {
  readonly workspace = inject(WorkspaceContextService);
  readonly drawerOpen = signal(false);
  readonly createdPromotionName = signal("");
  readonly statusFilter = signal<PromotionStatusFilter>("all");
  readonly localPromotions = signal<ContextualPromotionSummary[]>([]);

  readonly siteProgramPromotions = computed(() => {
    const siteId = this.workspace.site()?.id;
    const programId = this.workspace.program()?.id;
    if (!siteId || !programId) return [];
    return [...CONTEXTUAL_PROMOTIONS, ...this.localPromotions()]
      .filter((item) => item.siteId === siteId && item.programId === programId)
      .sort((a, b) => b.start.localeCompare(a.start));
  });

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
      .reduce((total, item) => total + item.studentCount, 0),
  );

  readonly referentialLabel = computed(() => {
    const cohort = this.workspace.cohort();
    return TRAINING_REFERENTIALS.find((item) => item.id === cohort?.referentialVersionId)?.version ?? "—";
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

  createPromotion(payload: CreatePromotionPayload): void {
    const organization = this.workspace.organization();
    const site = this.workspace.site();
    const program = this.workspace.program();
    if (!organization || !site || !program) return;

    const offering = PROGRAM_OFFERINGS.find(
      (item) => item.siteId === site.id && item.programId === program.id && item.active,
    );
    const referential = TRAINING_REFERENTIALS.find((item) => item.id === payload.referentialVersionId);
    if (!offering || !referential) return;

    const totalPlannedHours = referential.totalHours * payload.studentCount;
    const promotion: ContextualPromotionSummary = {
      id: `cohort-ui-${Date.now()}`,
      offeringId: offering.id,
      organizationId: organization.id,
      organizationName: organization.name,
      siteId: site.id,
      siteName: site.name,
      siteCity: site.city,
      programId: program.id,
      programName: program.name,
      programCode: program.code,
      programIcon: program.icon,
      referentialVersionId: referential.id,
      referentialVersion: referential.version,
      referentialCode: referential.code,
      name: payload.name.trim(),
      shortName: payload.name.trim(),
      start: payload.startDate,
      end: payload.endDate,
      status: payload.status,
      studentCount: payload.studentCount,
      manager: payload.manager,
      plannedHours: totalPlannedHours,
      completedHours: 0,
      remainingHours: totalPlannedHours,
      catchupHours: 0,
      attendanceRate: 0,
      averageProgress: 0,
    };

    this.localPromotions.update((items) => [promotion, ...items]);
    this.createdPromotionName.set(promotion.name);
    this.drawerOpen.set(false);
    setTimeout(() => this.createdPromotionName.set(""), 3500);
  }

  formatDate(value: string): string {
    if (!value) return "—";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  statusClass(status: WorkspaceCohort["status"]): string {
    switch (status) {
      case "active":
        return "bg-[#dff7e5] text-[#178344]";
      case "planned":
        return "bg-[#e7f2ff] text-[#2a64a2]";
      case "completed":
        return "bg-[#eef0f4] text-[#5d6878]";
    }
  }

  statusIcon(status: WorkspaceCohort["status"]): string {
    switch (status) {
      case "active":
        return "ph-play-circle";
      case "planned":
        return "ph-calendar-plus";
      case "completed":
        return "ph-check-circle";
    }
  }

  metricValue(value: number, suffix = ""): string {
    return value > 0 ? `${value.toLocaleString("fr-FR")}${suffix}` : "—";
  }
}
