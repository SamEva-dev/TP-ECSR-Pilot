import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { AttendanceApiStoreService } from "../../core/api-data/attendance-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import {
  type AttendanceStatus,
  type AttendanceStudent,
} from "../../core/models/attendance.models";

const EMPTY_STUDENT: AttendanceStudent = {
  id: "",
  firstName: "",
  lastName: "",
  catchupHours: 0,
  absences: 0,
  status: "pending",
  arrival: "",
  departure: "",
  duration: 0,
  comment: "",
  missedHours: 0,
  addToCatchup: false,
};

@Component({
  selector: "app-attendance",
  imports: [TranslatePipe],
  templateUrl: "./attendance.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceComponent {
  readonly sessionService = inject(SessionService);
  readonly attendance = inject(AttendanceApiStoreService);
  readonly students = signal<AttendanceStudent[]>([]);
  readonly saved = signal(false);

  get session() {
    return this.attendance.session();
  }

  constructor() {
    effect(() => {
      this.students.set(this.attendance.students().map((student) => ({ ...student })));
      this.saved.set(false);
    });
  }

  readonly isStudent = computed(() => this.sessionService.role() === "stagiaire");
  readonly isSecretariat = computed(() => this.sessionService.role() === "secretariat");
  readonly canEdit = computed(() => !this.isStudent());
  readonly visibleStudents = computed(() => {
    const students = this.students();
    if (!this.isStudent()) return students;
    return [students[0] ?? EMPTY_STUDENT];
  });

  readonly metrics = computed(() => {
    const students = this.students();
    return {
      present: students.filter((student) => student.status === "present").length,
      late: students.filter((student) => student.status === "late").length,
      absent: students.filter((student) => student.status === "absent").length,
      excused: students.filter((student) => student.status === "excused").length,
      missedHours: this.roundHours(
        students.reduce((sum, student) => sum + this.number(student.missedHours), 0),
      ),
    };
  });

  readonly studentMetrics = computed(() => {
    const student = this.visibleStudents()[0] ?? EMPTY_STUDENT;
    return {
      completed: this.number(student.duration),
      missed: this.number(student.missedHours),
      catchup: this.number(student.catchupHours),
      absences: this.number(student.absences),
    };
  });

  initials(student: AttendanceStudent) {
    return `${this.text(student.firstName).charAt(0)}${this.text(student.lastName).charAt(0)}`.toUpperCase();
  }

  fullName(student: AttendanceStudent) {
    return `${this.text(student.firstName)} ${this.text(student.lastName)}`.trim();
  }

  setStatus(studentId: string, status: AttendanceStatus) {
    if (!this.canEdit() || !studentId) return;
    const expectedHours = this.attendance.expectedHours();
    this.students.update((students) =>
      students.map((student) => {
        if (student.id !== studentId) return student;
        const duration = status === "absent" || status === "excused"
          ? 0
          : status === "late"
            ? Math.min(this.number(student.duration) || expectedHours, expectedHours)
            : expectedHours;
        const missedHours = Math.max(0, expectedHours - duration);
        return {
          ...student,
          status,
          duration: this.roundHours(duration),
          missedHours: this.roundHours(missedHours),
          addToCatchup: status !== "excused" && (status === "absent" || status === "late") && missedHours > 0,
        };
      }),
    );
    this.saved.set(false);
  }

  updateField(studentId: string, field: "arrival" | "departure" | "comment", event: Event) {
    if (!this.canEdit() || !studentId) return;
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value ?? "";
    this.students.update((students) =>
      students.map((student) => {
        if (student.id !== studentId) return student;
        const updated = { ...student, [field]: value };
        if (field === "comment" || updated.status === "absent" || updated.status === "excused") return updated;
        const duration = this.durationBetween(updated.arrival, updated.departure, this.attendance.expectedHours());
        if (duration === null) return updated;
        const missedHours = Math.max(0, this.attendance.expectedHours() - duration);
        return {
          ...updated,
          duration: this.roundHours(duration),
          missedHours: this.roundHours(missedHours),
          addToCatchup: updated.status === "late" && missedHours > 0,
        };
      }),
    );
    this.saved.set(false);
  }

  async save() {
    if (!this.canEdit()) return;
    this.saved.set(await this.attendance.save(this.students()));
  }

  statusClasses(status: AttendanceStatus, active: boolean) {
    if (!active) return "border-[#dfe5ec] bg-white text-[#334155] hover:bg-[#f6f8fb]";
    if (status === "present") return "border-[#20a956] bg-[#20a956] text-white";
    if (status === "late") return "border-[#f5a11a] bg-[#f5a11a] text-white";
    if (status === "absent") return "border-[#ed2632] bg-[#ed2632] text-white";
    if (status === "excused") return "border-[#2b66a4] bg-[#2b66a4] text-white";
    return "border-[#dfe5ec] bg-white text-[#334155]";
  }

  statusLabelKey(status: AttendanceStatus) {
    return `attendance.status.${status || "pending"}`;
  }

  private durationBetween(arrival: string, departure: string, maximumHours: number): number | null {
    const start = this.clockMinutes(arrival);
    const end = this.clockMinutes(departure);
    if (start === null || end === null || end <= start) return null;
    return Math.min((end - start) / 60, Math.max(0, maximumHours));
  }

  private clockMinutes(value: string): number | null {
    if (!/^\d{2}:\d{2}$/.test(value)) return null;
    const [hour, minute] = value.split(":").map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  private roundHours(value: number): number {
    return Math.round(this.number(value) * 100) / 100;
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }
}
