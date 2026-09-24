import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslateService } from "../../core/i18n/translate.service";
import { SessionService } from "../../core/session/session.service";
import { ALL_SHEET_STATUSES, reworkCountFor, sheetsFor } from "../../core/api-data/runtime-data.store";
import type { SheetStatus } from "../../core/models/sheets.models";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import { EvaluateSheetDrawerComponent } from "./evaluate-sheet-drawer/evaluate-sheet-drawer.component";

@Component({
  selector: "app-sheets",
  imports: [TranslatePipe, ProgressBarComponent, EvaluateSheetDrawerComponent],
  templateUrl: "./sheets.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetsComponent {
  readonly sessionService = inject(SessionService);
  readonly contextData = inject(ContextualTrainingDataService);
  private readonly translate = inject(TranslateService);

  readonly students = this.contextData.students;
  readonly statuses = ALL_SHEET_STATUSES;
  readonly query = signal("");
  readonly statusFilter = signal<"all" | SheetStatus>("all");
  readonly selectedStudentId = signal(this.sessionService.session()?.studentId ?? "s1");
  readonly evaluationOpen = signal(false);

  constructor() {
    effect(() => {
      const students = this.students();
      if (!students.some((student) => student.id === this.selectedStudentId())) {
        this.selectedStudentId.set(students[0]?.id ?? "s1");
      }
    });
  }

  readonly selectedStudent = computed(
    () => this.students().find((student) => student.id === this.selectedStudentId()) ?? this.students()[0],
  );

  readonly allSheets = computed(() => {
    const student = this.selectedStudent();
    return student ? sheetsFor(student.id) : [];
  });

  readonly filteredSheets = computed(() => {
    const q = this.query().trim().toLocaleLowerCase("fr");
    const status = this.statusFilter();
    return this.allSheets().filter((sheet) => {
      const translatedTitle = this.translate.instant(sheet.titleKey).toLocaleLowerCase("fr");
      const matchesQuery = !q || translatedTitle.includes(q) || String(sheet.number) === q;
      const matchesStatus = status === "all" || sheet.status === status;
      return matchesQuery && matchesStatus;
    });
  });

  readonly reworkCount = computed(() => {
    const student = this.selectedStudent();
    return student ? reworkCountFor(student.id) : 0;
  });
  readonly preparedProgress = computed(() => {
    const student = this.selectedStudent();
    const total = this.contextData.referential()?.sheetCount ?? 58;
    return student && total ? (student.preparedSheets / total) * 100 : 0;
  });

  readonly counts = computed<Record<SheetStatus, number>>(() => {
    const rows = this.allSheets();
    return {
      not_started: rows.filter((sheet) => sheet.status === "not_started").length,
      in_progress: rows.filter((sheet) => sheet.status === "in_progress").length,
      ready: rows.filter((sheet) => sheet.status === "ready").length,
      presented: rows.filter((sheet) => sheet.status === "presented").length,
      validated: rows.filter((sheet) => sheet.status === "validated").length,
      rework: rows.filter((sheet) => sheet.status === "rework").length,
    };
  });

  readonly isStudent = computed(() => this.sessionService.role() === "stagiaire");
  readonly canEvaluate = computed(() => {
    const role = this.sessionService.role();
    return role === "direction" || role === "formateur";
  });

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  updateStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as "all" | SheetStatus);
  }

  updateStudent(event: Event): void {
    this.selectedStudentId.set((event.target as HTMLSelectElement).value);
  }

  formatDate(value?: string): string {
    return value ? value.split("-").reverse().join("/") : "—";
  }

  statusLabelKey(status: SheetStatus): string {
    return `sheets.status.${status}`;
  }

  statusClasses(status: SheetStatus): string {
    switch (status) {
      case "validated": return "bg-[#d8f8df] text-[#18a547]";
      case "rework": return "bg-[#ffe1df] text-[#f04438]";
      case "in_progress": return "bg-[#fff0c9] text-[#8b5e00]";
      case "ready": return "bg-[#2b66a4] text-white";
      case "presented": return "bg-[#e5f2ff] text-[#2a64a2]";
      default: return "bg-[#f0f3f7] text-[#687589]";
    }
  }

  openEvaluation(): void {
    this.evaluationOpen.set(true);
  }

  closeEvaluation(): void {
    this.evaluationOpen.set(false);
  }
}
