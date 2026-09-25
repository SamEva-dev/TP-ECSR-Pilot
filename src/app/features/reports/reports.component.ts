import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { STUDENT_DIRECTORY } from "../../core/api-data/runtime-data.store";
import { AUDIT_LOG } from "../../core/api-data/runtime-data.store";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import { StatusPillComponent } from "../../shared/ui/status-pill.component";

type ReportType =
  "individual" | "hours" | "absences" | "progress" | "promotion" | "internship";

@Component({
  selector: "app-reports",
  imports: [TranslatePipe, ProgressBarComponent, StatusPillComponent],
  templateUrl: "./reports.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent {
  readonly sessionService = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  readonly promotions = this.workspace.cohorts;
  readonly auditLog = AUDIT_LOG;
  readonly selectedReport = signal<ReportType>("individual");
  readonly promotionId = signal(this.workspace.selection().cohortId);

  readonly selectedPromotion = computed(
    () =>
      this.workspace
        .cohorts()
        .find((promotion) => promotion.id === this.promotionId()) ?? null,
  );

  readonly reportTypes: { key: ReportType; labelKey: string }[] = [
    { key: "individual", labelKey: "reports.types.individual" },
    { key: "hours", labelKey: "reports.types.hours" },
    { key: "absences", labelKey: "reports.types.absences" },
    { key: "progress", labelKey: "reports.types.progress" },
    { key: "promotion", labelKey: "reports.types.promotion" },
    { key: "internship", labelKey: "reports.types.internship" },
  ];

  readonly students = computed(() =>
    STUDENT_DIRECTORY.filter(
      (student) => student.promotionId === this.promotionId(),
    ),
  );

  readonly totalCompletedHours = computed(() =>
    this.students().reduce((sum, student) => sum + student.completedHours, 0),
  );
  readonly totalCatchupHours = computed(() =>
    this.students().reduce((sum, student) => sum + student.catchupHours, 0),
  );
  readonly averageProgress = computed(() => {
    const students = this.students();
    if (!students.length) return 0;
    return Math.round(
      students.reduce((sum, student) => sum + student.progress, 0) /
        students.length,
    );
  });

  readonly canSeeAudit = computed(() => {
    const role = this.sessionService.role();
    return role === "direction" || role === "secretariat";
  });

  selectReport(type: ReportType) {
    this.selectedReport.set(type);
  }

  updatePromotion(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.promotionId.set(value);
  }

  reportTitleKey() {
    return `reports.sections.${this.selectedReport()}.title`;
  }

  print() {
    window.print();
  }
}
