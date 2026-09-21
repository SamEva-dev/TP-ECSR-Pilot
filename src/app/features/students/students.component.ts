import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  type StudentDirectoryItem,
} from "../../core/mock-data/students.mock";
import type { StudentStatus } from "../../core/models/app.models";
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
  readonly createdStudents = signal<StudentDirectoryItem[]>([]);
  readonly drawerOpen = signal(false);
  readonly createdStudentName = signal("");
  readonly search = signal("");
  readonly promotionId = signal("all");
  readonly status = signal<"all" | StudentStatus>("all");

  readonly promotions = computed(() => {
    const cohort = this.contextData.cohort();
    return cohort ? [{ id: cohort.id, name: cohort.name }] : [];
  });

  readonly students = computed(() => [
    ...this.createdStudents(),
    ...this.contextData.students(),
  ]);

  readonly filteredStudents = computed(() => {
    const query = this.search().trim().toLocaleLowerCase("fr");
    const promotionId = this.promotionId();
    const status = this.status();

    return this.students().filter((student) => {
      const fullName = `${student.firstName} ${student.lastName}`.toLocaleLowerCase("fr");
      const matchesSearch = !query || fullName.includes(query);
      const matchesPromotion = promotionId === "all" || student.promotionId === promotionId;
      const matchesStatus = status === "all" || student.status === status;
      return matchesSearch && matchesPromotion && matchesStatus;
    });
  });

  readonly total = computed(
    () => this.contextData.cohort()?.studentCount ?? this.students().length,
  );

  openAddDrawer() {
    this.drawerOpen.set(true);
  }

  closeAddDrawer() {
    this.drawerOpen.set(false);
  }

  createStudent(payload: CreateStudentPayload) {
    const cohort = this.contextData.cohort();
    if (!cohort) return;
    const student: StudentDirectoryItem = {
      id: `local-${Date.now()}`,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      promotionId: cohort.id,
      promotionName: cohort.name,
      progress: 0,
      completedHours: 0,
      catchupHours: 0,
      preparedSheets: 0,
      presentedSheets: 0,
      validatedSheets: 0,
      status: "good",
    };

    this.createdStudents.update((items) => [student, ...items]);
    this.createdStudentName.set(`${student.firstName} ${student.lastName}`);
    this.drawerOpen.set(false);
    setTimeout(() => this.createdStudentName.set(""), 3500);
  }

  updateSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  updatePromotion(event: Event) {
    this.promotionId.set((event.target as HTMLSelectElement).value);
  }

  updateStatus(event: Event) {
    this.status.set((event.target as HTMLSelectElement).value as "all" | StudentStatus);
  }

  initials(student: StudentDirectoryItem) {
    return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
  }

  statusLabelKey(status: StudentStatus) {
    return `students.status.${status}`;
  }

  statusClasses(status: StudentStatus) {
    return status === "good"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "warning"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f22b2b]";
  }
}
