import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { SkillsApiStoreService, type SkillStudentOption } from "../../core/api-data/skills-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type { SkillCriterionLevel, SkillDefinition } from "../../core/models/skills.models";
import { SessionService } from "../../core/session/session.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";

const EMPTY_STUDENT: SkillStudentOption = { id: "", firstName: "", lastName: "" };
const EMPTY_DEFINITION: SkillDefinition = {
  definitionId: "",
  code: "",
  titleKey: "",
  criteria: [],
};

@Component({
  selector: "app-skills",
  imports: [TranslatePipe, ProgressBarComponent],
  templateUrl: "./skills.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsComponent {
  readonly sessionService = inject(SessionService);
  readonly store = inject(SkillsApiStoreService);
  readonly students = this.store.students;
  readonly isStudent = computed(() => this.sessionService.role() === "stagiaire");
  readonly selectedStudentId = signal("");
  readonly selectedSkill = signal("");

  readonly definitions = computed<SkillDefinition[]>(() =>
    this.store.definitionsFor(this.selectedStudentId()),
  );

  constructor() {
    effect(() => {
      const students = this.students();
      const current = this.selectedStudentId();
      const selected = students.some((student) => student.id === current)
        ? current
        : (students[0]?.id ?? "");
      if (selected !== current) this.selectedStudentId.set(selected);
      this.store.selectStudent(selected);
    });

    effect(() => {
      const definitions = this.definitions();
      if (!definitions.some((definition) => definition.code === this.selectedSkill())) {
        this.selectedSkill.set(definitions[0]?.code ?? "");
      }
    });
  }

  readonly selectedStudent = computed(
    () => this.students().find((student) => student.id === this.selectedStudentId()) ?? EMPTY_STUDENT,
  );

  readonly selectedDefinition = computed(
    () => this.definitions().find((item) => item.code === this.selectedSkill()) ?? EMPTY_DEFINITION,
  );

  readonly linkedSessions = computed(() =>
    this.store.linkedSessions(this.selectedStudentId(), this.selectedSkill()),
  );

  selectSkill(code: string): void {
    this.selectedSkill.set(code ?? "");
  }

  updateStudent(event: Event): void {
    const value = (event.target as HTMLSelectElement).value ?? "";
    this.selectedStudentId.set(value);
    this.store.selectStudent(value);
  }

  skillValue(code: string, student = this.selectedStudent()): number {
    return this.store.skillValue(code ?? "", student?.id ?? "");
  }

  criterionLabelKey(level: SkillCriterionLevel): string {
    return `skills.level.${level}`;
  }

  criterionClasses(level: SkillCriterionLevel): string {
    return level === "acquired"
      ? "bg-[#d8f8df] text-[#18a547]"
      : level === "in_progress" || level === "not_assessed"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f04438]";
  }

  cardClasses(code: string): string {
    return code === this.selectedSkill()
      ? "border-[#79aee3] bg-[#eaf4ff] shadow-sm"
      : "border-[#dfe5ec] bg-white shadow-sm hover:border-[#b8cee5]";
  }
}
