import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  PEDAGOGICAL_TEAM,
  PROMOTION_SUMMARIES,
  type PromotionStudentSummary,
  type PromotionSummary,
} from "../../core/mock-data/promotions.mock";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import {
  CreatePromotionDrawerComponent,
  type CreatePromotionPayload,
} from "./create-promotion-drawer/create-promotion-drawer.component";

@Component({
  selector: "app-promotions",
  imports: [
    RouterLink,
    TranslatePipe,
    ProgressBarComponent,
    CreatePromotionDrawerComponent,
  ],
  templateUrl: "./promotions.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionsComponent {
  readonly promotions = signal<PromotionSummary[]>([...PROMOTION_SUMMARIES]);
  readonly team = PEDAGOGICAL_TEAM;
  readonly drawerOpen = signal(false);
  readonly createdPromotionName = signal("");

  openCreateDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeCreateDrawer(): void {
    this.drawerOpen.set(false);
  }

  createPromotion(payload: CreatePromotionPayload): void {
    const promotion: PromotionSummary = {
      id: `p-${Date.now()}`,
      name: payload.name.trim(),
      start: this.formatDate(payload.startDate),
      end: this.formatDate(payload.endDate),
      manager: payload.manager,
      plannedHours: payload.plannedHours,
      completedHours: 0,
      remainingHours: 0,
      catchupHours: 0,
      attendanceRate: 0,
      averageProgress: 0,
      students: [],
    };

    this.promotions.update((items) => [promotion, ...items]);
    this.createdPromotionName.set(promotion.name);
    this.drawerOpen.set(false);
    setTimeout(() => this.createdPromotionName.set(""), 3500);
  }

  fullName(item: { firstName: string; lastName: string }) {
    return `${item.firstName} ${item.lastName}`;
  }

  initials(item: { firstName: string; lastName: string }) {
    return `${item.firstName.charAt(0)}${item.lastName.charAt(0)}`.toUpperCase();
  }

  statusKey(student: PromotionStudentSummary) {
    return `promotions.status.${student.status}`;
  }

  statusClasses(student: PromotionStudentSummary) {
    switch (student.status) {
      case "good":
        return "bg-[#d8f8df] text-[#18a547]";
      case "warning":
        return "bg-[#fff0c9] text-[#8b5e00]";
      case "late":
        return "bg-[#ffe1df] text-[#f22b2b]";
    }
  }

  private formatDate(value: string): string {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
}
