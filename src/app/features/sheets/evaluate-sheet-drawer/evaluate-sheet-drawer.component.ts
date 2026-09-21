import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
} from "@angular/core";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { STUDENT_DIRECTORY } from "../../../core/mock-data/students.mock";
import {
  EVALUATION_CRITERIA,
  EVALUATORS,
  sheetsFor,
  type EvaluationLevel,
} from "../../../core/mock-data/sheets.mock";

export type FinalEvaluationDecision = "validated" | "rework";

export interface SheetEvaluationSavedEvent {
  studentId: string;
  sheetNumber: number;
  presentationDate: string;
  durationMinutes: number;
  evaluator: string;
  levels: Record<string, EvaluationLevel>;
  positivePoints: string;
  improvements: string;
  generalComment: string;
  nextObjective: string;
  decision: FinalEvaluationDecision;
}

@Component({
  selector: "app-evaluate-sheet-drawer",
  imports: [TranslatePipe],
  templateUrl: "./evaluate-sheet-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluateSheetDrawerComponent implements OnInit {
  readonly initialStudentId = input("s1");
  readonly closed = output<void>();
  readonly evaluationSaved = output<SheetEvaluationSavedEvent>();

  readonly students = STUDENT_DIRECTORY;
  readonly evaluators = EVALUATORS;
  readonly criteria = EVALUATION_CRITERIA;
  readonly levels: EvaluationLevel[] = ["acquired", "in_progress", "review"];

  readonly studentId = signal("s1");
  readonly sheetNumber = signal(32);
  readonly presentationDate = signal("2026-09-21");
  readonly durationMinutes = signal(40);
  readonly evaluator = signal("Marc Dupont");
  readonly positivePoints = signal("");
  readonly improvements = signal("");
  readonly generalComment = signal("");
  readonly nextObjective = signal("");
  readonly decision = signal<FinalEvaluationDecision>("validated");
  readonly saved = signal(false);

  readonly evaluation = signal<Record<string, EvaluationLevel>>(
    Object.fromEntries(
      EVALUATION_CRITERIA.map((criterion) => [criterion, "in_progress"]),
    ) as Record<string, EvaluationLevel>,
  );

  readonly selectedStudent = computed(
    () =>
      this.students.find((student) => student.id === this.studentId()) ??
      this.students[0],
  );

  readonly sheets = computed(() => sheetsFor(this.selectedStudent()));

  readonly acquiredCount = computed(
    () =>
      Object.values(this.evaluation()).filter((level) => level === "acquired")
        .length,
  );
  readonly inProgressCount = computed(
    () =>
      Object.values(this.evaluation()).filter(
        (level) => level === "in_progress",
      ).length,
  );
  readonly reviewCount = computed(
    () =>
      Object.values(this.evaluation()).filter((level) => level === "review")
        .length,
  );

  ngOnInit(): void {
    this.studentId.set(this.initialStudentId());
    const available = this.sheets();
    this.sheetNumber.set(
      available.some((sheet) => sheet.number === 32)
        ? 32
        : (available[0]?.number ?? 1),
    );
  }

  updateStudent(event: Event): void {
    this.studentId.set((event.target as HTMLSelectElement).value);
    const available = this.sheets();
    this.sheetNumber.set(
      available.some((sheet) => sheet.number === 32)
        ? 32
        : (available[0]?.number ?? 1),
    );
    this.saved.set(false);
  }

  updateSheet(event: Event): void {
    this.sheetNumber.set(Number((event.target as HTMLSelectElement).value));
    this.saved.set(false);
  }

  updateDate(event: Event): void {
    this.presentationDate.set((event.target as HTMLInputElement).value);
  }

  updateDuration(event: Event): void {
    this.durationMinutes.set(
      Number((event.target as HTMLInputElement).value || 0),
    );
  }

  updateEvaluator(event: Event): void {
    this.evaluator.set((event.target as HTMLSelectElement).value);
  }

  updateText(
    target:
      "positivePoints" | "improvements" | "generalComment" | "nextObjective",
    event: Event,
  ): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this[target].set(value);
    this.saved.set(false);
  }

  setLevel(criterion: string, level: EvaluationLevel): void {
    this.evaluation.update((current) => ({ ...current, [criterion]: level }));
    this.saved.set(false);
  }

  setDecision(decision: FinalEvaluationDecision): void {
    this.decision.set(decision);
    this.saved.set(false);
  }

  levelClasses(criterion: string, level: EvaluationLevel): string {
    if (this.evaluation()[criterion] !== level) {
      return "border-[#dce3eb] bg-white text-[#475569] hover:border-[#b7c4d2] hover:bg-[#f8fafc]";
    }

    if (level === "acquired")
      return "border-[#22a84b] bg-[#dcf8e3] text-[#15803d] shadow-sm";
    if (level === "in_progress")
      return "border-[#f2aa2b] bg-[#fff1cb] text-[#825a00] shadow-sm";
    return "border-[#ef5a52] bg-[#ffe3e0] text-[#cf342d] shadow-sm";
  }

  decisionClasses(decision: FinalEvaluationDecision): string {
    if (this.decision() !== decision) {
      return "border-[#dce3eb] bg-white text-[#475569] hover:bg-[#f8fafc]";
    }

    return decision === "validated"
      ? "border-[#22a84b] bg-[#dcf8e3] text-[#15803d] shadow-sm"
      : "border-[#ef5a52] bg-[#ffe3e0] text-[#cf342d] shadow-sm";
  }

  save(): void {
    this.saved.set(true);
    this.evaluationSaved.emit({
      studentId: this.studentId(),
      sheetNumber: this.sheetNumber(),
      presentationDate: this.presentationDate(),
      durationMinutes: this.durationMinutes(),
      evaluator: this.evaluator(),
      levels: this.evaluation(),
      positivePoints: this.positivePoints(),
      improvements: this.improvements(),
      generalComment: this.generalComment(),
      nextObjective: this.nextObjective(),
      decision: this.decision(),
    });
  }

  close(): void {
    this.closed.emit();
  }
}
