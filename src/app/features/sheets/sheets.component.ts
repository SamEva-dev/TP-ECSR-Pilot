import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { SheetsApiStoreService } from "../../core/api-data/sheets-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslateService } from "../../core/i18n/translate.service";
import { ALL_SHEET_STATUSES, type SheetStatus } from "../../core/models/sheets.models";
import { SessionService } from "../../core/session/session.service";
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
  readonly store = inject(SheetsApiStoreService);
  private readonly translate = inject(TranslateService);

  readonly students = this.store.students;
  readonly statuses = ALL_SHEET_STATUSES;
  readonly query = signal("");
  readonly statusFilter = signal<"all" | SheetStatus>("all");
  readonly selectedStudentId = signal("");
  readonly evaluationOpen = signal(false);
  readonly sheetTotal = this.store.sheetTotal;

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
  }

  readonly selectedStudent = computed(() =>
    this.store.studentSummary(this.selectedStudentId()),
  );

  readonly allSheets = this.store.sheets;

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

  readonly reworkCount = computed(() => this.store.reworkCount());
  readonly preparedProgress = computed(() => {
    const total = this.sheetTotal();
    return total > 0 ? (this.selectedStudent().preparedSheets / total) * 100 : 0;
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
    this.query.set((event.target as HTMLInputElement).value ?? "");
  }

  updateStatus(event: Event): void {
    this.statusFilter.set(((event.target as HTMLSelectElement).value || "all") as "all" | SheetStatus);
  }

  updateStudent(event: Event): void {
    const value = (event.target as HTMLSelectElement).value ?? "";
    this.selectedStudentId.set(value);
    this.store.selectStudent(value);
  }

  formatDate(value?: string): string {
    const raw = value ?? "";
    if (!raw) return "";
    const [year, month, day] = raw.split("-");
    return year && month && day ? `${day}/${month}/${year}` : "";
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
