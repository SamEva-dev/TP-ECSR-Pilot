import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { StudentApiStoreService } from "../../core/api-data/student-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type { StudentStatus } from "../../core/models/app.models";
import type { StudentDirectoryItem } from "../../core/models/students.models";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import {
  AddStudentDrawerComponent,
  type CreateStudentPayload,
} from "./add-student-drawer/add-student-drawer.component";

@Component({
  selector: "app-students",
  imports: [
    RouterLink,
    TranslatePipe,
    ProgressBarComponent,
    AddStudentDrawerComponent,
  ],
  templateUrl: "./students.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsComponent {
  readonly contextData = inject(ContextualTrainingDataService);
  readonly store = inject(StudentApiStoreService);
  readonly drawerOpen = signal(false);
  readonly createdStudentName = signal("");
  readonly search = signal("");
  readonly promotionId = signal("all");
  readonly status = signal<"all" | StudentStatus>("all");

  readonly promotions = computed(() => {
    const cohort = this.contextData.cohort();
    return cohort ? [{ id: cohort.id ?? "", name: cohort.name ?? "" }] : [];
  });

  readonly students = computed(() => this.store.students());

  readonly filteredStudents = computed(() => {
    const query = this.search().trim().toLocaleLowerCase("fr");
    const promotionId = this.promotionId();
    const status = this.status();

    return this.students().filter((student) => {
      const fullName = `${student.firstName ?? ""} ${student.lastName ?? ""}`.toLocaleLowerCase("fr");
      const matchesSearch = !query || fullName.includes(query);
      const matchesPromotion = promotionId === "all" || (student.promotionId ?? "") === promotionId;
      const matchesStatus = status === "all" || student.status === status;
      return matchesSearch && matchesPromotion && matchesStatus;
    });
  });

  readonly total = computed(() => this.students().length);

  openAddDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeAddDrawer(): void {
    this.drawerOpen.set(false);
  }

  async createStudent(payload: CreateStudentPayload): Promise<void> {
    const student = await this.store.create(payload);
    if (!student) return;

    this.createdStudentName.set(`${student.firstName} ${student.lastName}`.trim());
    this.drawerOpen.set(false);
    setTimeout(() => this.createdStudentName.set(""), 3500);
  }

  updateSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value ?? "");
  }

  updatePromotion(event: Event): void {
    this.promotionId.set((event.target as HTMLSelectElement).value ?? "all");
  }

  updateStatus(event: Event): void {
    this.status.set(((event.target as HTMLSelectElement).value || "all") as "all" | StudentStatus);
  }

  initials(student: StudentDirectoryItem): string {
    const first = student.firstName?.charAt(0) ?? "";
    const last = student.lastName?.charAt(0) ?? "";
    return `${first}${last}`.toUpperCase();
  }

  statusLabelKey(status: StudentStatus): string {
    return `students.status.${status}`;
  }

  statusClasses(status: StudentStatus): string {
    return status === "good"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "warning"
        ? "bg-[#fff1d2] text-[#a16a00]"
        : "bg-[#ffe3e3] text-[#c33c3c]";
  }
}
