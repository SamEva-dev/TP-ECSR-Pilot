import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { KeyValuePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { ALERTS, DRIVING_OBSERVATIONS, PROMOTION_METRICS, PROMOTIONS, SAM_TIMELINE, STUDENTS, TRAINER_AGENDA } from "../../core/api-data/runtime-data.store";
import type { AlertLevel } from "../../core/models/app.models";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import { StatusPillComponent } from "../../shared/ui/status-pill.component";
import { TypeBadgeComponent } from "../../shared/ui/type-badge.component";

@Component({
  selector: "app-home",
  imports: [
    RouterLink,
    KeyValuePipe,
    TranslatePipe,
    ProgressBarComponent,
    StatusPillComponent,
    TypeBadgeComponent,
  ],
  templateUrl: "./home.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly sessionService = inject(SessionService);
  readonly alerts = ALERTS;
  readonly trainerAgenda = TRAINER_AGENDA;
  readonly observations = DRIVING_OBSERVATIONS;
  readonly timeline = SAM_TIMELINE;
  readonly sam = STUDENTS[0];

  readonly promotion = computed(
    () =>
      PROMOTIONS.find((p) => p.id === this.sessionService.promotionId()) ??
      PROMOTIONS[0],
  );
  readonly students = computed(() =>
    STUDENTS.filter((s) => s.promotionId === this.sessionService.promotionId()),
  );
  readonly metrics = computed(
    () =>
      PROMOTION_METRICS.find((item) => item.cohortId === this.sessionService.promotionId())
      ?? PROMOTION_METRICS[0]
      ?? { trainers: 0, attendanceRate: 0, completedHours: 0, remainingHours: 0, catchupHours: 0, progress: 0, totalPlannedHours: 0 },
  );
  readonly studentsToWatch = computed(() =>
    [...this.students()]
      .sort((a, b) => b.catchupHours - a.catchupHours)
      .slice(0, 6),
  );
  readonly trainerStudents = computed(() => [...this.students()].slice(0, 6));
  readonly statusCounts = computed(() => ({
    good: this.students().filter((s) => s.status === "good").length,
    warning: this.students().filter((s) => s.status === "warning").length,
    late: this.students().filter((s) => s.status === "late").length,
  }));

  fullName(s: { firstName: string; lastName: string }) {
    return `${s.firstName} ${s.lastName}`;
  }

  roleIsDirection() {
    const r = this.sessionService.role();
    return r === "direction" || r === "secretariat";
  }

  roleIsTrainer() {
    return this.sessionService.role() === "formateur";
  }

  alertClasses(l: AlertLevel) {
    return l === "danger"
      ? "bg-[#fee3df]"
      : l === "warning"
        ? "bg-[#ffefc9]"
        : "bg-[#e5f2ff]";
  }

  alertIcon(l: AlertLevel) {
    return l === "info" ? "ph-info" : "ph-warning";
  }

  alertIconClass(l: AlertLevel) {
    return l === "danger"
      ? "text-[#f04438]"
      : l === "warning"
        ? "text-[#79550c]"
        : "text-[#2b66a4]";
  }

  dot(s: "valid" | "absence" | "driving" | "classroom") {
    return s === "valid"
      ? "bg-[#22a84b]"
      : s === "absence"
        ? "bg-[#ed2e38]"
        : s === "driving"
          ? "bg-[#f8a11a]"
          : "bg-[#2a64a2]";
  }
}
