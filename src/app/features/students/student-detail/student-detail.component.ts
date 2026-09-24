import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { SessionService } from "../../../core/session/session.service";
import { ProgressBarComponent } from "../../../shared/ui/progress-bar.component";
import { DRIVING_CRITERIA } from "../../../core/api-data/runtime-data.store";
import type { DrivingLevel } from "../../../core/models/driving.models";
import { SKILL_DEFINITIONS } from "../../../core/api-data/runtime-data.store";
import type { SkillCriterionLevel } from "../../../core/models/skills.models";
import type { SheetStatus } from "../../../core/models/sheets.models";
import type { InternshipStatus } from "../../../core/models/internships.models";
import { certificationCandidateByStudentId, EXAM_SESSIONS } from "../../../core/api-data/runtime-data.store";
import { STUDENT_DETAIL_TABS, studentAuditHistory, studentDetailById, studentDrivingHistory, studentInternships, studentSheets } from "../../../core/api-data/runtime-data.store";
import type { StudentDetailTab } from "../../../core/models/student-detail.models";

@Component({
  selector: "app-student-detail",
  imports: [RouterLink, TranslatePipe, ProgressBarComponent],
  templateUrl: "./student-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetailComponent {
  private readonly route = inject(ActivatedRoute);
  readonly sessionService = inject(SessionService);

  readonly selectedTab = signal<StudentDetailTab>("overview");
  readonly tabs = STUDENT_DETAIL_TABS;
  readonly skillDefinitions = SKILL_DEFINITIONS;
  readonly drivingCriteria = DRIVING_CRITERIA;

  private readonly requestedId = this.route.snapshot.paramMap.get("id") ?? "";
  readonly effectiveStudentId =
    this.sessionService.role() === "stagiaire"
      ? (this.sessionService.session()?.studentId ?? "s1")
      : this.requestedId;

  readonly student = studentDetailById(this.effectiveStudentId);
  readonly sheets = studentSheets(this.effectiveStudentId);
  readonly drivingHistory = studentDrivingHistory(this.effectiveStudentId);
  readonly internships = studentInternships(this.effectiveStudentId);
  readonly auditHistory = studentAuditHistory(this.effectiveStudentId);
  readonly certification = certificationCandidateByStudentId(
    this.effectiveStudentId,
  );
  readonly examSession = EXAM_SESSIONS[0];

  readonly completedHours = computed(() => this.student?.completedHours ?? 0);
  readonly remainingHours = computed(() =>
    Math.max((this.student?.plannedHours ?? 0) - this.completedHours(), 0),
  );
  readonly isSelfView = computed(
    () => this.sessionService.role() === "stagiaire",
  );

  selectTab(tab: StudentDetailTab): void {
    this.selectedTab.set(tab);
  }

  initials(): string {
    const student = this.student;
    if (!student) return "--";
    return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
  }

  studentStatusClasses(): string {
    const status = this.student?.status;
    return status === "good"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "warning"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f22b2b]";
  }

  studentStatusKey(): string {
    return `students.status.${this.student?.status ?? "good"}`;
  }

  skillProgress(code: "C1" | "C2" | "C3" | "C4"): number {
    return this.student?.skills[code] ?? 0;
  }

  skillCriterionLevel(
    code: "C1" | "C2" | "C3" | "C4",
    index: number,
  ): SkillCriterionLevel {
    const pct = this.skillProgress(code);
    if (pct > 80) return "acquired";
    if (pct > 55) return index < 2 ? "acquired" : "in_progress";
    return index === 0 ? "in_progress" : "rework";
  }

  skillLevelClasses(level: SkillCriterionLevel): string {
    return level === "acquired"
      ? "bg-[#d8f8df] text-[#18a547]"
      : level === "in_progress"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f22b2b]";
  }

  drivingLevelClasses(level: DrivingLevel): string {
    return level === "acquired"
      ? "bg-[#d8f8df] text-[#18a547]"
      : level === "progress"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f22b2b]";
  }

  drivingLevelKey(level: DrivingLevel): string {
    return `drivingSession.levels.${level}`;
  }

  criterionLabelKey(criterionId: string): string {
    return (
      this.drivingCriteria.find((criterion) => criterion.id === criterionId)
        ?.labelKey ?? criterionId
    );
  }

  sheetStatusClasses(status: SheetStatus): string {
    switch (status) {
      case "validated":
        return "bg-[#d8f8df] text-[#18a547]";
      case "rework":
        return "bg-[#ffe1df] text-[#f22b2b]";
      case "presented":
        return "bg-[#e5f2ff] text-[#2a64a2]";
      case "ready":
        return "bg-[#2a64a2] text-white";
      case "in_progress":
        return "bg-[#fff0c9] text-[#8b5e00]";
      default:
        return "bg-[#eef2f6] text-[#64748b]";
    }
  }

  attendanceClasses(status: "present" | "late" | "absent" | "excused"): string {
    return status === "present"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "late"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : status === "absent"
          ? "bg-[#ffe1df] text-[#f22b2b]"
          : "bg-[#e5f2ff] text-[#2a64a2]";
  }

  internshipClasses(status: InternshipStatus): string {
    return status === "completed"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "incomplete"
        ? "bg-[#ffe1df] text-[#f22b2b]"
        : status === "inProgress"
          ? "bg-[#e5f2ff] text-[#2a64a2]"
          : "bg-[#eef2f6] text-[#64748b]";
  }

  evaluationClasses(tone: "success" | "warning" | "danger" | "info"): string {
    return tone === "success"
      ? "bg-[#d8f8df] text-[#18a547]"
      : tone === "warning"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : tone === "danger"
          ? "bg-[#ffe1df] text-[#f22b2b]"
          : "bg-[#e5f2ff] text-[#2a64a2]";
  }

  timelineDot(tone: "success" | "danger" | "warning" | "info"): string {
    return tone === "success"
      ? "bg-[#22a84b]"
      : tone === "danger"
        ? "bg-[#ed2e38]"
        : tone === "warning"
          ? "bg-[#f8a11a]"
          : "bg-[#2a64a2]";
  }

  internshipProgress(completed: number, planned: number): number {
    return planned > 0
      ? Math.min(100, Math.round((completed / planned) * 100))
      : 0;
  }

  formatDate(value?: string): string {
    if (!value) return "—";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-");
      return `${day}/${month}/${year}`;
    }
    return value;
  }
}
