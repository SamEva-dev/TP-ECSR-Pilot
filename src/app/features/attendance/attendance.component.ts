import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import {
  ATTENDANCE_SESSION,
  ATTENDANCE_STUDENTS,
  type AttendanceStatus,
  type AttendanceStudent,
} from "../../core/mock-data/attendance.mock";

@Component({
  selector: "app-attendance",
  imports: [TranslatePipe],
  templateUrl: "./attendance.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceComponent {
  readonly sessionService = inject(SessionService);
  readonly session = ATTENDANCE_SESSION;
  readonly students = signal(
    ATTENDANCE_STUDENTS.map((student) => ({ ...student })),
  );
  readonly saved = signal(false);

  readonly isStudent = computed(
    () => this.sessionService.role() === "stagiaire",
  );
  readonly isSecretariat = computed(
    () => this.sessionService.role() === "secretariat",
  );
  readonly canEdit = computed(() => !this.isStudent());
  readonly visibleStudents = computed(() => {
    if (!this.isStudent()) return this.students();
    const id = this.sessionService.session()?.studentId ?? "s1";
    return this.students().filter((student) => student.id === id);
  });

  readonly metrics = computed(() => {
    const students = this.students();
    return {
      present: students.filter((student) => student.status === "present")
        .length,
      late: students.filter((student) => student.status === "late").length,
      absent: students.filter((student) => student.status === "absent").length,
      excused: students.filter((student) => student.status === "excused")
        .length,
      missedHours: students.reduce(
        (sum, student) => sum + student.missedHours,
        0,
      ),
    };
  });

  readonly studentMetrics = computed(() => {
    const student = this.visibleStudents()[0];
    if (!student) return { completed: 0, missed: 0, catchup: 0, absences: 0 };
    return {
      completed: student.duration,
      missed: student.missedHours,
      catchup: student.catchupHours,
      absences: student.absences,
    };
  });

  initials(student: AttendanceStudent) {
    return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
  }

  fullName(student: AttendanceStudent) {
    return `${student.firstName} ${student.lastName}`;
  }

  setStatus(studentId: string, status: AttendanceStatus) {
    if (!this.canEdit()) return;
    this.students.update((students) =>
      students.map((student) => {
        if (student.id !== studentId) return student;
        const missedHours =
          status === "absent" ? 4 : status === "late" ? 0.5 : 0;
        return {
          ...student,
          status,
          duration:
            status === "absent" || status === "excused"
              ? 0
              : status === "late"
                ? 3.5
                : 4,
          missedHours,
          addToCatchup: status === "absent" || status === "late",
        };
      }),
    );
    this.saved.set(false);
  }

  updateField(
    studentId: string,
    field: "arrival" | "departure" | "comment",
    event: Event,
  ) {
    if (!this.canEdit()) return;
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement)
      .value;
    this.students.update((students) =>
      students.map((student) =>
        student.id === studentId ? { ...student, [field]: value } : student,
      ),
    );
    this.saved.set(false);
  }

  save() {
    if (!this.canEdit()) return;
    this.saved.set(true);
  }

  statusClasses(status: AttendanceStatus, active: boolean) {
    if (!active)
      return "border-[#dfe5ec] bg-white text-[#334155] hover:bg-[#f6f8fb]";
    if (status === "present") return "border-[#20a956] bg-[#20a956] text-white";
    if (status === "late") return "border-[#f5a11a] bg-[#f5a11a] text-white";
    if (status === "absent") return "border-[#ed2632] bg-[#ed2632] text-white";
    return "border-[#2b66a4] bg-[#2b66a4] text-white";
  }

  statusLabelKey(status: AttendanceStatus) {
    return `attendance.status.${status}`;
  }
}
