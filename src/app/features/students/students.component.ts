import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type { StudentDirectoryItem } from "../../core/models/students.models";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";
import { TrainingCatalogApiService } from "../../core/training/training-catalog-api.service";
import { firstValueFrom } from "rxjs";
import {
  AddStudentDrawerComponent,
  type CreateStudentPayload,
} from "./add-student-drawer/add-student-drawer.component";

@Component({
  selector: "app-students",
  imports: [RouterLink, TranslatePipe, AddStudentDrawerComponent],
  templateUrl: "./students.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsComponent {
  readonly contextData = inject(ContextualTrainingDataService);
  private readonly api = inject(TrainingCatalogApiService);
  readonly saving = signal(false);
  readonly error = signal("");
  readonly drawerOpen = signal(false);
  readonly createdStudentName = signal("");
  readonly search = signal("");
  readonly promotionId = signal("all");
  readonly status = signal<
    "all" | NonNullable<StudentDirectoryItem["enrollmentStatus"]>
  >("all");

  readonly promotions = computed(() => {
    const cohort = this.contextData.cohort();
    return cohort ? [{ id: cohort.id, name: cohort.name }] : [];
  });

  readonly students = this.contextData.students;

  readonly filteredStudents = computed(() => {
    const query = this.search().trim().toLocaleLowerCase("fr");
    const promotionId = this.promotionId();
    const status = this.status();

    return this.students().filter((student) => {
      const fullName =
        `${student.firstName} ${student.lastName}`.toLocaleLowerCase("fr");
      const matchesSearch = !query || fullName.includes(query);
      const matchesPromotion =
        promotionId === "all" || student.promotionId === promotionId;
      const matchesStatus =
        status === "all" || student.enrollmentStatus === status;
      return matchesSearch && matchesPromotion && matchesStatus;
    });
  });

  readonly total = computed(() => this.students().length);

  openAddDrawer() {
    this.drawerOpen.set(true);
  }

  closeAddDrawer() {
    this.drawerOpen.set(false);
  }

  async createStudent(payload: CreateStudentPayload): Promise<void> {
    const cohort = this.contextData.cohort();
    if (this.saving()) return;
    if (!cohort?.apiId || cohort.id !== payload.promotionId) {
      this.error.set("students.api.invalidContext");
      return;
    }
    this.saving.set(true);
    this.error.set("");
    try {
      await firstValueFrom(
        this.api.enroll(cohort.apiId, {
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          email: payload.email.trim().toLowerCase(),
          phone: payload.phone.trim() || null,
          birthDate: payload.birthDate || null,
          enrolledOn: payload.startDate,
          authGateUserId: null,
          personExternalKey: null,
          learnerExternalKey: null,
          enrollmentExternalKey: null,
        }),
      );
      await this.contextData.workspace.reload();
      if (!this.contextData.workspace.remoteWorkspaceLoaded())
        this.error.set("students.api.refreshFailed");
      this.createdStudentName.set(
        `${payload.firstName.trim()} ${payload.lastName.trim()}`,
      );
      this.drawerOpen.set(false);
      setTimeout(() => this.createdStudentName.set(""), 3500);
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? error.status
          : 0;
      this.error.set(
        status === 409
          ? "students.api.conflict"
          : status === 403
            ? "students.api.forbidden"
            : "students.api.createFailed",
      );
    } finally {
      this.saving.set(false);
    }
  }

  updateSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  updatePromotion(event: Event) {
    this.promotionId.set((event.target as HTMLSelectElement).value);
  }

  updateStatus(event: Event) {
    this.status.set(
      (event.target as HTMLSelectElement).value as
        "all" | NonNullable<StudentDirectoryItem["enrollmentStatus"]>,
    );
  }

  initials(student: StudentDirectoryItem) {
    return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
  }

  statusLabelKey(status: StudentDirectoryItem["enrollmentStatus"]) {
    return `students.enrollmentStatus.${status ?? "pending"}`;
  }

  statusClasses(status: StudentDirectoryItem["enrollmentStatus"]) {
    return status === "active"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "completed"
        ? "bg-[#e7f2ff] text-[#2a64a2]"
        : "bg-[#fff0c9] text-[#8b5e00]";
  }
}
