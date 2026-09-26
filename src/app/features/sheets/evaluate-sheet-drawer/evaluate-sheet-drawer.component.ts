import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { SheetsApiStoreService } from "../../../core/api-data/sheets-api-store.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import {
  SHEET_EVALUATION_CRITERIA,
  type EvaluationLevel,
  type PedagogicalSheet,
} from "../../../core/models/sheets.models";

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
  readonly initialStudentId = input("");
  readonly closed = output<void>();
  readonly evaluationSaved = output<SheetEvaluationSavedEvent>();

  readonly store = inject(SheetsApiStoreService);
  get students() { return this.store.students(); }
  get evaluators() {
    const name = this.store.currentEvaluator();
    return [name];
  }
  readonly criteria = SHEET_EVALUATION_CRITERIA;
  readonly levels: EvaluationLevel[] = ["acquired", "in_progress", "review"];
  readonly sheets = this.store.sheets;

  readonly studentId = signal("");
  readonly sheetNumber = signal(0);
  readonly presentationDate = signal("");
  readonly durationMinutes = signal(0);
  readonly evaluator = signal("");
  readonly positivePoints = signal("");
  readonly improvements = signal("");
  readonly generalComment = signal("");
  readonly nextObjective = signal("");
  readonly decision = signal<FinalEvaluationDecision>("validated");
  readonly saved = signal(false);

  readonly evaluation = signal<Record<string, EvaluationLevel>>(
    this.defaultEvaluation(),
  );
  private hydratedSelection = "";

  readonly selectedStudent = computed(
    () => this.students.find((student) => student.id === this.studentId()) ?? {
      id: "",
      firstName: "",
      lastName: "",
    },
  );

  readonly acquiredCount = computed(
    () => Object.values(this.evaluation()).filter((level) => level === "acquired").length,
  );
  readonly inProgressCount = computed(
    () => Object.values(this.evaluation()).filter((level) => level === "in_progress").length,
  );
  readonly reviewCount = computed(
    () => Object.values(this.evaluation()).filter((level) => level === "review").length,
  );

  constructor() {
    effect(() => {
      const students = this.store.students();
      const current = this.studentId();
      const selected = students.some((student) => student.id === current)
        ? current
        : (students[0]?.id ?? "");
      if (selected !== current) {
        this.studentId.set(selected);
        this.store.selectStudent(selected);
      }
    });

    effect(() => {
      const available = this.sheets();
      const currentNumber = this.sheetNumber();
      const selectedNumber = available.some((sheet) => sheet.number === currentNumber)
        ? currentNumber
        : (available.find((sheet) => sheet.number === 32)?.number ?? available[0]?.number ?? 0);
      if (selectedNumber !== currentNumber) this.sheetNumber.set(selectedNumber);
      const selectedSheet = available.find((sheet) => sheet.number === selectedNumber) ?? null;
      const selectionKey = `${this.studentId()}|${selectedSheet?.topicId ?? ""}`;
      if (selectionKey !== this.hydratedSelection) {
        this.hydratedSelection = selectionKey;
        this.hydrate(selectedSheet);
      }
    });
  }

  ngOnInit(): void {
    const requested = this.initialStudentId() ?? "";
    const selected = this.students.some((student) => student.id === requested)
      ? requested
      : (this.students[0]?.id ?? "");
    this.studentId.set(selected);
    this.store.selectStudent(selected);
  }

  updateStudent(event: Event): void {
    const selected = (event.target as HTMLSelectElement).value ?? "";
    this.studentId.set(selected);
    this.sheetNumber.set(0);
    this.hydratedSelection = "";
    this.saved.set(false);
    this.store.selectStudent(selected);
  }

  updateSheet(event: Event): void {
    this.sheetNumber.set(Number((event.target as HTMLSelectElement).value || 0));
    this.saved.set(false);
  }

  updateDate(event: Event): void {
    this.presentationDate.set((event.target as HTMLInputElement).value ?? "");
    this.saved.set(false);
  }

  updateDuration(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value || 0);
    this.durationMinutes.set(Number.isFinite(value) ? value : 0);
    this.saved.set(false);
  }

  updateEvaluator(event: Event): void {
    this.evaluator.set((event.target as HTMLSelectElement).value ?? "");
    this.saved.set(false);
  }

  updateText(
    target: "positivePoints" | "improvements" | "generalComment" | "nextObjective",
    event: Event,
  ): void {
    const value = (event.target as HTMLTextAreaElement).value ?? "";
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

  async save(): Promise<void> {
    const updated = await this.store.saveEvaluation({
      studentId: this.studentId(),
      sheetNumber: this.sheetNumber(),
      presentationDate: this.presentationDate(),
      durationMinutes: this.durationMinutes(),
      levels: this.evaluation(),
      positivePoints: this.positivePoints(),
      improvements: this.improvements(),
      generalComment: this.generalComment(),
      nextObjective: this.nextObjective(),
      decision: this.decision(),
    });

    if (!updated) {
      this.saved.set(false);
      return;
    }

    this.applyUpdated(updated);
    this.saved.set(true);
    this.evaluationSaved.emit({
      studentId: this.studentId(),
      sheetNumber: updated.number,
      presentationDate: updated.presentationDate,
      durationMinutes: updated.durationMinutes,
      evaluator: updated.evaluator,
      levels: { ...updated.evaluationLevels },
      positivePoints: updated.positivePoints,
      improvements: updated.improvements,
      generalComment: updated.generalComment,
      nextObjective: updated.nextObjective,
      decision: updated.status === "rework" ? "rework" : "validated",
    });
  }

  close(): void {
    this.closed.emit();
  }

  private hydrate(sheet: PedagogicalSheet | null): void {
    this.presentationDate.set(sheet?.presentationDate ?? "");
    this.durationMinutes.set(sheet?.durationMinutes ?? 0);
    this.evaluator.set(sheet?.evaluator || this.store.currentEvaluator());
    this.positivePoints.set(sheet?.positivePoints ?? "");
    this.improvements.set(sheet?.improvements ?? "");
    this.generalComment.set(sheet?.generalComment ?? "");
    this.nextObjective.set(sheet?.nextObjective ?? "");
    this.decision.set(sheet?.status === "rework" ? "rework" : "validated");
    const existing = sheet?.evaluationLevels ?? {};
    this.evaluation.set(Object.fromEntries(
      this.criteria.map((criterion) => [criterion, existing[criterion] ?? "in_progress"]),
    ) as Record<string, EvaluationLevel>);
    this.saved.set(false);
  }

  private applyUpdated(sheet: PedagogicalSheet): void {
    this.presentationDate.set(sheet.presentationDate);
    this.durationMinutes.set(sheet.durationMinutes);
    this.evaluator.set(sheet.evaluator);
    this.positivePoints.set(sheet.positivePoints);
    this.improvements.set(sheet.improvements);
    this.generalComment.set(sheet.generalComment);
    this.nextObjective.set(sheet.nextObjective);
    this.decision.set(sheet.status === "rework" ? "rework" : "validated");
    this.evaluation.set({ ...sheet.evaluationLevels });
  }

  private defaultEvaluation(): Record<string, EvaluationLevel> {
    return Object.fromEntries(
      SHEET_EVALUATION_CRITERIA.map((criterion) => [criterion, "in_progress"]),
    ) as Record<string, EvaluationLevel>;
  }
}
