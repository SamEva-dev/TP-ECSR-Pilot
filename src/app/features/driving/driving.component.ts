import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type WritableSignal,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import {
  DRIVING_COMPETENCIES,
  DRIVING_CRITERIA,
  DRIVING_HISTORY,
  DRIVING_STUDENTS,
  DRIVING_SUB_SKILLS,
  DRIVING_TRAINERS,
  DRIVING_VEHICLES,
  type DrivingLevel,
} from "../../core/mock-data/driving.mock";

@Component({
  selector: "app-driving",
  imports: [TranslatePipe],
  templateUrl: "./driving.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrivingComponent {
  readonly sessionService = inject(SessionService);
  readonly students = DRIVING_STUDENTS;
  readonly trainers = DRIVING_TRAINERS;
  readonly vehicles = DRIVING_VEHICLES;
  readonly competencies = DRIVING_COMPETENCIES;
  readonly criteria = DRIVING_CRITERIA;

  readonly selectedStudentId = signal(
    this.sessionService.role() === "stagiaire" ? "s1" : "s1",
  );
  readonly selectedTrainerId = signal(
    this.sessionService.role() === "formateur" ? "f1" : "f1",
  );
  readonly selectedVehicleId = signal("v1");
  readonly selectedCompetence = signal<"C1" | "C2" | "C3" | "C4">("C3");
  readonly selectedSubSkill = signal("bends");
  readonly date = signal("2026-09-21");
  readonly start = signal("08:00");
  readonly end = signal("10:00");
  readonly duration = signal("2 h");
  readonly objective = signal("drivingSession.defaults.objective");
  readonly positive = signal("drivingSession.defaults.positive");
  readonly difficulties = signal("drivingSession.defaults.difficulties");
  readonly errors = signal("drivingSession.defaults.errors");
  readonly advice = signal("drivingSession.defaults.advice");
  readonly nextGoal = signal("drivingSession.defaults.nextGoal");
  readonly freeObservation = signal("");
  readonly saved = signal(false);

  readonly evaluation = signal<Record<string, DrivingLevel>>({
    information: "acquired",
    speed: "progress",
    position: "work",
    gaze: "progress",
    anticipation: "progress",
    communication: "progress",
    autonomy: "progress",
    stress: "progress",
  });

  readonly isStudent = computed(
    () => this.sessionService.role() === "stagiaire",
  );
  readonly isTrainer = computed(
    () => this.sessionService.role() === "formateur",
  );
  readonly canEdit = computed(
    () =>
      this.sessionService.role() === "direction" ||
      this.sessionService.role() === "formateur",
  );

  readonly selectedStudent = computed(
    () =>
      this.students.find((s) => s.id === this.selectedStudentId()) ??
      this.students[0],
  );
  readonly selectedTrainer = computed(
    () =>
      this.trainers.find((t) => t.id === this.selectedTrainerId()) ??
      this.trainers[0],
  );
  readonly selectedVehicle = computed(
    () =>
      this.vehicles.find((v) => v.id === this.selectedVehicleId()) ??
      this.vehicles[0],
  );
  readonly selectedCompetenceInfo = computed(
    () =>
      this.competencies.find((c) => c.id === this.selectedCompetence()) ??
      this.competencies[2],
  );
  readonly subSkills = computed(
    () => DRIVING_SUB_SKILLS[this.selectedCompetence()],
  );
  readonly latestHistory = computed(
    () =>
      DRIVING_HISTORY.find(
        (item) => item.studentId === this.selectedStudentId(),
      ) ?? DRIVING_HISTORY[0],
  );
  readonly visibleHistory = computed(() => {
    if (this.isStudent())
      return DRIVING_HISTORY.filter((item) => item.studentId === "s1");
    if (this.isTrainer())
      return DRIVING_HISTORY.filter((item) => item.trainer === "Marc Dupont");
    return DRIVING_HISTORY;
  });

  updateStudent(event: Event) {
    if (this.isStudent()) return;
    this.selectedStudentId.set((event.target as HTMLSelectElement).value);
  }

  updateTrainer(event: Event) {
    if (this.isTrainer()) return;
    this.selectedTrainerId.set((event.target as HTMLSelectElement).value);
  }

  updateVehicle(event: Event) {
    this.selectedVehicleId.set((event.target as HTMLSelectElement).value);
  }

  updateText(target: WritableSignal<string>, event: Event) {
    target.set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  selectCompetence(id: "C1" | "C2" | "C3" | "C4") {
    if (!this.canEdit()) return;
    this.selectedCompetence.set(id);
    this.selectedSubSkill.set(DRIVING_SUB_SKILLS[id][0]?.id ?? "");
  }

  selectSubSkill(id: string) {
    if (!this.canEdit()) return;
    this.selectedSubSkill.set(id);
  }

  setLevel(criterionId: string, level: DrivingLevel) {
    if (!this.canEdit()) return;
    this.evaluation.update((current) => ({ ...current, [criterionId]: level }));
  }

  levelClasses(criterionId: string, level: DrivingLevel) {
    const selected = this.evaluation()[criterionId] === level;
    if (!selected) return "bg-white text-[#243044] border-[#e5eaf0]";
    return level === "acquired"
      ? "bg-[#1fad55] text-white border-[#1fad55]"
      : level === "progress"
        ? "bg-[#f6a51e] text-white border-[#f6a51e]"
        : "bg-[#ed1f2b] text-white border-[#ed1f2b]";
  }

  historyLevelClasses(level: DrivingLevel) {
    return level === "acquired"
      ? "bg-[#d8f8df] text-[#18a547]"
      : level === "progress"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f22b2b]";
  }

  labelForCriterion(id: string) {
    return (
      this.criteria.find((criterion) => criterion.id === id)?.labelKey ?? id
    );
  }

  save() {
    if (!this.canEdit()) return;
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1800);
  }

  scrollToHistory() {
    document
      .getElementById("driving-history")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
