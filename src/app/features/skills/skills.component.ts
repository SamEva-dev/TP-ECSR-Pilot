import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SKILL_LINKED_SESSIONS } from "../../core/api-data/runtime-data.store";
import type { SkillCriterionLevel } from "../../core/models/skills.models";
import { SessionService } from "../../core/session/session.service";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import type { StudentDirectoryItem } from "../../core/models/students.models";

interface UiSkillDefinition {
  code: string;
  titleKey: string;
  criteria: { labelKey: string; level: SkillCriterionLevel }[];
}

@Component({
  selector: "app-skills",
  imports: [TranslatePipe, ProgressBarComponent],
  templateUrl: "./skills.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsComponent {
  readonly sessionService = inject(SessionService);
  readonly contextData = inject(ContextualTrainingDataService);
  readonly students = this.contextData.students;
  readonly isStudent = computed(() => this.sessionService.role() === "stagiaire");
  readonly selectedStudentId = signal(this.sessionService.session()?.studentId ?? "s1");
  readonly selectedSkill = signal("");

  readonly definitions = computed<UiSkillDefinition[]>(() =>
    (this.contextData.referential()?.competencies ?? []).map((competency, competencyIndex) => ({
      code: competency.code,
      titleKey: competency.label,
      criteria: competency.subCompetencies.map((criterion, criterionIndex) => ({
        labelKey: criterion.label,
        level:
          (competencyIndex + criterionIndex) % 4 === 0
            ? "acquired"
            : (competencyIndex + criterionIndex) % 3 === 0
              ? "rework"
              : "in_progress",
      })),
    })),
  );

  constructor() {
    effect(() => {
      const students = this.students();
      if (!students.some((student) => student.id === this.selectedStudentId())) {
        this.selectedStudentId.set(students[0]?.id ?? "s1");
      }
      const definitions = this.definitions();
      if (!definitions.some((definition) => definition.code === this.selectedSkill())) {
        this.selectedSkill.set(definitions[0]?.code ?? "");
      }
    });
  }

  readonly selectedStudent = computed(
    () => this.students().find((student) => student.id === this.selectedStudentId()) ?? this.students()[0],
  );

  readonly selectedDefinition = computed(
    () => this.definitions().find((item) => item.code === this.selectedSkill()) ?? this.definitions()[0],
  );

  readonly linkedSessions = computed(() => {
    if (this.contextData.isEcsr()) {
      return SKILL_LINKED_SESSIONS.filter((item) => item.skill === this.selectedSkill());
    }
    const student = this.selectedStudent();
    if (!student || !this.selectedSkill()) return [];
    return [
      {
        id: `${this.selectedSkill()}-ctx-1`,
        date: "20/09/2026",
        studentName: `${student.firstName} ${student.lastName}`,
        subjectKey: "workspaceOperational.skills.sessionSubject",
        positiveKey: "workspaceOperational.skills.positive",
        workOnKey: "workspaceOperational.skills.workOn",
        nextGoalKey: "workspaceOperational.skills.nextGoal",
      },
    ];
  });

  selectSkill(code: string): void {
    this.selectedSkill.set(code);
  }

  updateStudent(event: Event): void {
    this.selectedStudentId.set((event.target as HTMLSelectElement).value);
  }

  skillValue(code: string, student = this.selectedStudent()): number {
    if (!student) return 0;
    const index = Math.max(0, this.definitions().findIndex((item) => item.code === code));
    return Math.max(0, Math.min(100, student.progress + 12 - index * 9));
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

  cardClasses(code: string): string {
    return code === this.selectedSkill()
      ? "border-[#79aee3] bg-[#eaf4ff] shadow-sm"
      : "border-[#dfe5ec] bg-white shadow-sm hover:border-[#b8cee5]";
  }
}
