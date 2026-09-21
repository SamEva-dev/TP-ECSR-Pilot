import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { STUDENTS } from "../../core/mock-data/dashboard.mock";
import {
  SKILL_DEFINITIONS,
  SKILL_LINKED_SESSIONS,
  type SkillCode,
  type SkillCriterionLevel,
} from "../../core/mock-data/skills.mock";
import { SessionService } from "../../core/session/session.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";

@Component({
  selector: "app-skills",
  imports: [TranslatePipe, ProgressBarComponent],
  templateUrl: "./skills.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsComponent {
  readonly sessionService = inject(SessionService);
  readonly definitions = SKILL_DEFINITIONS;
  readonly students = STUDENTS;
  readonly isStudent = computed(
    () => this.sessionService.role() === "stagiaire",
  );
  readonly selectedStudentId = signal(
    this.sessionService.session()?.studentId ?? "s1",
  );
  readonly selectedSkill = signal<SkillCode>("C1");

  readonly selectedStudent = computed(
    () =>
      STUDENTS.find((student) => student.id === this.selectedStudentId()) ??
      STUDENTS[0],
  );

  readonly selectedDefinition = computed(
    () =>
      SKILL_DEFINITIONS.find((item) => item.code === this.selectedSkill()) ??
      SKILL_DEFINITIONS[0],
  );

  readonly linkedSessions = computed(() =>
    SKILL_LINKED_SESSIONS.filter((item) => item.skill === this.selectedSkill()),
  );

  selectSkill(code: SkillCode): void {
    this.selectedSkill.set(code);
  }

  updateStudent(event: Event): void {
    this.selectedStudentId.set((event.target as HTMLSelectElement).value);
  }

  skillValue(code: SkillCode, student = this.selectedStudent()): number {
    return student.skills[code];
  }

  criterionLabelKey(level: SkillCriterionLevel): string {
    return `skills.level.${level}`;
  }

  criterionClasses(level: SkillCriterionLevel): string {
    return level === "acquired"
      ? "bg-[#d8f8df] text-[#18a547]"
      : level === "in_progress"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f04438]";
  }

  cardClasses(code: SkillCode): string {
    return code === this.selectedSkill()
      ? "border-[#79aee3] bg-[#eaf4ff] shadow-sm"
      : "border-[#dfe5ec] bg-white shadow-sm hover:border-[#b8cee5]";
  }
}
