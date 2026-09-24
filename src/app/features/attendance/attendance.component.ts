import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import type { AttendanceStatus, AttendanceStudent } from "../../core/models/attendance.models";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";
import { TrainingDeliveryApiService, type TrainingSessionApi } from "../../core/training-delivery/training-delivery-api.service";

@Component({
  selector: "app-attendance",
  imports: [TranslatePipe],
  templateUrl: "./attendance.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceComponent {
  readonly sessionService = inject(SessionService);
  readonly contextData = inject(ContextualTrainingDataService);
  readonly trainingApi = inject(TrainingDeliveryApiService);
  readonly remoteSession = signal<TrainingSessionApi | null>(null);
  readonly apiMode = signal(false);
  readonly students = signal<AttendanceStudent[]>([]);
  readonly saved = signal(false);

  get session() {
    const remote = this.remoteSession();
    if (remote) {
      const start = new Date(remote.startsAtUtc);
      const end = new Date(remote.endsAtUtc);
      const dateFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: remote.timeZoneId, day: "2-digit", month: "2-digit", year: "numeric" });
      const timeFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: remote.timeZoneId, hour: "2-digit", minute: "2-digit", hour12: false });
      return {
        date: dateFormat.format(start),
        start: timeFormat.format(start),
        end: timeFormat.format(end),
        promotion: this.contextData.activeCohortName(),
        title: remote.title,
        trainer: remote.trainerDisplayName ?? "—",
      };
    }
    return {
      date: "21/09/2026",
      start: "08:00",
      end: "12:00",
      promotion: this.contextData.activeCohortName(),
      title: this.contextData.isEcsr()
        ? "Les intersections et les priorités"
        : `${this.contextData.program()?.name ?? "Formation"} · Séance pédagogique`,
      trainer: "Yanis Morel",
    };
  }

  constructor() {
    effect(() => {
      const cohort = this.contextData.cohort();
      this.saved.set(false);
      if (cohort?.apiId) {
        void this.loadRemoteAttendance(cohort.apiId);
      } else {
        this.apiMode.set(true);
        this.remoteSession.set(null);
        this.students.set([]);
      }
    });
  }

  private async loadRemoteAttendance(cohortApiId: string) {
    try {
      const sessions = await this.trainingApi.list(cohortApiId);
      const selected = sessions.find((item) => item.status !== "cancelled") ?? sessions[0] ?? null;
      if (!selected) {
        this.apiMode.set(true);
        this.remoteSession.set(null);
        this.students.set([]);
        return;
      }
      const sheet = await this.trainingApi.getAttendance(selected.id);
      this.remoteSession.set(selected);
      this.students.set(sheet.entries.map((entry) => ({
        id: entry.enrollmentId,
        firstName: entry.firstName,
        lastName: entry.lastName,
        catchupHours: Math.round((entry.catchupMinutes / 60) * 100) / 100,
        absences: entry.status === "absent" ? 1 : 0,
        status: entry.status,
        arrival: this.timeValue(entry.arrivalAtUtc, selected.timeZoneId),
        departure: this.timeValue(entry.departureAtUtc, selected.timeZoneId),
        duration: Math.round((entry.presentMinutes / 60) * 100) / 100,
        comment: entry.comment ?? "",
        missedHours: Math.round((entry.missedMinutes / 60) * 100) / 100,
        addToCatchup: entry.addToCatchup,
      })));
      this.apiMode.set(true);
    } catch {
      this.apiMode.set(true);
      this.remoteSession.set(null);
      this.students.set([]);
    }
  }

  private timeValue(value: string | null | undefined, timeZoneId: string): string {
    if (!value) return "";
    return new Intl.DateTimeFormat("fr-FR", { timeZone: timeZoneId, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
  }

  private localTimeToIso(time: string): string | null {
    const remote = this.remoteSession();
    if (!remote || !time) return null;
    const sessionDate = new Date(remote.startsAtUtc);
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: remote.timeZoneId, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(sessionDate);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (!year || !month || !day) return null;
    return new Date(`${year}-${month}-${day}T${time}:00`).toISOString();
  }

  readonly isStudent = computed(() => this.sessionService.role() === "stagiaire");
  readonly isSecretariat = computed(() => this.sessionService.role() === "secretariat");
  readonly canEdit = computed(() => !this.isStudent());
  readonly visibleStudents = computed(() => {
    if (!this.isStudent()) return this.students();
    const id = this.sessionService.session()?.studentId ?? "s1";
    return this.students().filter((student) => student.id === id);
  });

  readonly metrics = computed(() => {
    const students = this.students();
    return {
      present: students.filter((student) => student.status === "present").length,
      late: students.filter((student) => student.status === "late").length,
      absent: students.filter((student) => student.status === "absent").length,
      excused: students.filter((student) => student.status === "excused").length,
      missedHours: students.reduce((sum, student) => sum + student.missedHours, 0),
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
        const expectedHours = (this.remoteSession()?.plannedMinutes ?? 240) / 60;
        const latePenalty = Math.min(0.5, expectedHours);
        const missedHours = status === "absent" ? expectedHours : status === "late" ? latePenalty : 0;
        return {
          ...student,
          status,
          duration: status === "absent" || status === "excused" ? 0 : status === "late" ? Math.max(0, expectedHours - latePenalty) : expectedHours,
          missedHours,
          addToCatchup: status === "absent" || status === "late",
        };
      }),
    );
    this.saved.set(false);
  }

  updateField(studentId: string, field: "arrival" | "departure" | "comment", event: Event) {
    if (!this.canEdit()) return;
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.students.update((students) =>
      students.map((student) => (student.id === studentId ? { ...student, [field]: value } : student)),
    );
    this.saved.set(false);
  }

  async save() {
    if (!this.canEdit()) return;
    const remote = this.remoteSession();
    if (remote && this.apiMode()) {
      const entries = this.students()
        .filter((student) => student.status !== "pending")
        .map((student) => ({
          enrollmentId: student.id,
          status: student.status as "present" | "late" | "absent" | "excused",
          arrivalAtUtc: this.localTimeToIso(student.arrival),
          departureAtUtc: this.localTimeToIso(student.departure),
          presentMinutes: Math.round(student.duration * 60),
          addToCatchup: student.addToCatchup,
          comment: student.comment || null,
        }));
      try {
        await this.trainingApi.saveAttendance(remote.id, { entries });
      } catch {
        this.saved.set(false);
        return;
      }
    }
    this.saved.set(true);
  }

  statusClasses(status: AttendanceStatus, active: boolean) {
    if (!active) return "border-[#dfe5ec] bg-white text-[#334155] hover:bg-[#f6f8fb]";
    if (status === "pending") return "border-[#cbd5e1] bg-[#f1f5f9] text-[#64748b]";
    if (status === "present") return "border-[#20a956] bg-[#20a956] text-white";
    if (status === "late") return "border-[#f5a11a] bg-[#f5a11a] text-white";
    if (status === "absent") return "border-[#ed2632] bg-[#ed2632] text-white";
    return "border-[#2b66a4] bg-[#2b66a4] text-white";
  }

  statusLabelKey(status: AttendanceStatus) {
    return `attendance.status.${status}`;
  }
}
