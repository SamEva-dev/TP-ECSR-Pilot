import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslateService } from "../../core/i18n/translate.service";
import { SessionService } from "../../core/session/session.service";
import { STUDENT_DIRECTORY } from "../../core/mock-data/students.mock";
import {
  ALL_SHEET_STATUSES,
  reworkCountFor,
  sheetsFor,
  type SheetStatus,
} from "../../core/mock-data/sheets.mock";
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
  private readonly translate = inject(TranslateService);

  readonly students = STUDENT_DIRECTORY;
  readonly statuses = ALL_SHEET_STATUSES;
  readonly query = signal("");
  readonly statusFilter = signal<"all" | SheetStatus>("all");
  readonly selectedStudentId = signal(
    this.sessionService.session()?.studentId ?? "s1",
  );
  readonly evaluationOpen = signal(false);

  readonly selectedStudent = computed(
    () =>
      STUDENT_DIRECTORY.find(
        (student) => student.id === this.selectedStudentId(),
      ) ?? STUDENT_DIRECTORY[0],
  );

  readonly allSheets = computed(() => sheetsFor(this.selectedStudent()));

  readonly filteredSheets = computed(() => {
    const q = this.query().trim().toLocaleLowerCase("fr");
    const status = this.statusFilter();
    return this.allSheets().filter((sheet) => {
      const translatedTitle = this.translate
        .instant(sheet.titleKey)
        .toLocaleLowerCase("fr");
      const matchesQuery =
        !q || translatedTitle.includes(q) || String(sheet.number) === q;
      const matchesStatus = status === "all" || sheet.status === status;
      return matchesQuery && matchesStatus;
    });
  });

  readonly reworkCount = computed(() => reworkCountFor(this.selectedStudent()));
  readonly preparedProgress = computed(
    () => (this.selectedStudent().preparedSheets / 58) * 100,
  );

  readonly counts = computed<Record<SheetStatus, number>>(() => {
    const rows = this.allSheets();
    return {
      not_started: rows.filter((sheet) => sheet.status === "not_started")
        .length,
      in_progress: rows.filter((sheet) => sheet.status === "in_progress")
        .length,
      ready: rows.filter((sheet) => sheet.status === "ready").length,
      presented: rows.filter((sheet) => sheet.status === "presented").length,
      validated: rows.filter((sheet) => sheet.status === "validated").length,
      rework: rows.filter((sheet) => sheet.status === "rework").length,
    };
  });

  readonly isStudent = computed(
    () => this.sessionService.role() === "stagiaire",
  );
  readonly canEvaluate = computed(() => {
    const role = this.sessionService.role();
    return role === "direction" || role === "formateur";
  });

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  updateStatus(event: Event): void {
    this.statusFilter.set(
      (event.target as HTMLSelectElement).value as "all" | SheetStatus,
    );
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
      case "validated":
        return "bg-[#d8f8df] text-[#18a547]";
      case "rework":
        return "bg-[#ffe1df] text-[#f04438]";
      case "in_progress":
        return "bg-[#fff0c9] text-[#8b5e00]";
      case "ready":
        return "bg-[#2b66a4] text-white";
      case "presented":
        return "bg-[#e5f2ff] text-[#2a64a2]";
      default:
        return "bg-[#f0f3f7] text-[#687589]";
    }
  }

  openEvaluation(): void {
    this.evaluationOpen.set(true);
  }

  closeEvaluation(): void {
    this.evaluationOpen.set(false);
  }
}
