import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  untracked,
  inject,
  signal,
} from "@angular/core";
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SignatureApiService, type SignatureEnvelope } from '../../core/signatures/signature-api.service';
import { ApplicationNotificationService } from '../../core/notifications/application-notification.service';
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
  imports: [TranslatePipe, RouterLink],
  templateUrl: "./attendance.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceComponent {
  readonly sessionService = inject(SessionService);
  readonly attendance = inject(AttendanceApiStoreService);
  private readonly signaturesApi = inject(SignatureApiService);
  private readonly notifications = inject(ApplicationNotificationService);
  readonly signatureHistory = signal<SignatureEnvelope[]>([]);
  readonly mySignatures = signal<SignatureEnvelope[]>([]);
  readonly selectedForSignature = signal<ReadonlySet<string>>(new Set<string>());
  readonly sendingSignatures = signal(false);
  readonly signatureBatchResult = signal<{ sent: number; failed: number } | null>(null);
  private signatureLoadGeneration = 0;
  readonly students = signal<AttendanceStudent[]>([]);
  readonly saved = signal(false);
  readonly saving = signal(false);

  get session() {
    return this.attendance.session();
  }

  constructor() {
    effect(() => {
      const sessionId = this.attendance.session().id;
      // Invalidate the previous session's data synchronously to avoid cross-session leakage.
      this.signatureHistory.set([]);
      this.selectedForSignature.set(new Set<string>());
      this.signatureBatchResult.set(null);
      const generation = ++this.signatureLoadGeneration;
      if (sessionId && this.canViewSignatures()) {
        untracked(() => void this.loadSignatureHistory(sessionId, generation));
      }
      if (this.isStudent()) {
        untracked(() => void this.loadMySignatures(generation));
      } else {
        this.mySignatures.set([]);
      }
    });
    effect(() => {
      this.students.set(
        this.attendance.students().map((student) => ({ ...student })),
      );
      this.saved.set(false);
    });
  }

  readonly isStudent = computed(
    () => this.sessionService.role() === "stagiaire",
  );
  readonly isSecretariat = computed(
    () => this.sessionService.role() === "secretariat",
  );
  readonly canEdit = computed(() => !this.isStudent());
  readonly visibleStudents = computed(() => {
    const students = this.students();
    if (!this.isStudent()) return students;
    // Backend self-view contract yields at most one attendee. Never substitute another record.
    return students.length === 1 ? [students[0]] : [];
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
      missedHours: this.roundHours(
        students.reduce(
          (sum, student) => sum + this.number(student.missedHours),
          0,
        ),
      ),
    };
  });

  readonly canViewSignatures = computed(() => {
    const permissions = this.sessionService.session()?.permissions ?? [];
    return !this.isStudent() && permissions.some((value) =>
      /^(pedagora\.)?signatures\.view$/i.test(value));
  });

  readonly canRequestSignature = computed(() => {
    const permissions = this.sessionService.session()?.permissions ?? [];
    return !this.isStudent() && permissions.some((value) =>
      /^(pedagora\.)?signatures\.request$/i.test(value));
  });

  readonly unsavedChanges = computed(() =>
    JSON.stringify(this.students()) !== JSON.stringify(this.attendance.students()));

  readonly readyForSignature = computed(() =>
    this.canRequestSignature() && !this.saving() && !this.sendingSignatures() &&
    !this.attendance.loading() && !this.attendance.loadError() &&
    !this.unsavedChanges() && Boolean(this.session.id));

  readonly signableStudents = computed(() =>
    this.students().filter((student) => Boolean(student.id) &&
      (student.status === 'present' || student.status === 'late') &&
      this.attendance.students().some((row) => row.id === student.id && row.status === student.status) &&
      !this.isRequested(student.id)));

  readonly studentMetrics = computed(() => {
    const student = this.visibleStudents()[0] ?? EMPTY_STUDENT;
    return {
      completed: this.number(student.duration),
      missed: this.number(student.missedHours),
      catchup: this.number(student.catchupHours),
      absences: this.number(student.absences),
    };
  });

  isRequested(enrollmentId: string): boolean {
    const envelope = this.signatureHistory().find((row) => row.enrollmentId === enrollmentId);
    return envelope?.status === 'pending' || envelope?.status === 'viewed' || envelope?.status === 'signed';
  }

  statusForSignature(enrollmentId: string): string {
    return this.signatureHistory().find((row) => row.enrollmentId === enrollmentId)?.status ?? '';
  }

  async loadSignatureHistory(sessionId: string, generation = this.signatureLoadGeneration): Promise<void> {
    if (!this.canViewSignatures()) {
      if (generation === this.signatureLoadGeneration) this.signatureHistory.set([]);
      return;
    }
    try {
      const rows = await firstValueFrom(this.signaturesApi.attendanceBySession(sessionId));
      if (generation === this.signatureLoadGeneration && sessionId === this.session.id && this.canViewSignatures())
        this.signatureHistory.set(Array.isArray(rows) ? rows : []);
    } catch {
      if (generation === this.signatureLoadGeneration) {
        this.signatureHistory.set([]);
        this.notifications.error('signatures.errors.load', '/presences');
      }
    }
  }

  async loadMySignatures(generation = this.signatureLoadGeneration): Promise<void> {
    try {
      const rows = await firstValueFrom(this.signaturesApi.myAttendance());
      if (generation === this.signatureLoadGeneration && this.isStudent())
        this.mySignatures.set(Array.isArray(rows) ? rows : []);
    } catch {
      if (generation === this.signatureLoadGeneration && this.isStudent()) {
        this.mySignatures.set([]);
        this.notifications.error('signatures.errors.load', '/presences');
      }
    }
  }

  toggleSignatureSelection(enrollmentId: string, checked: boolean): void {
    if (!this.readyForSignature() || !this.signableStudents().some((s) => s.id === enrollmentId)) return;
    this.selectedForSignature.update((current) => {
      const next = new Set(current);
      if (checked) next.add(enrollmentId); else next.delete(enrollmentId);
      return next;
    });
  }

  sendSelectedSignatures(): void {
    void this.sendSignature([...this.selectedForSignature()]);
  }

  async sendSignature(enrollmentIds: string[]): Promise<void> {
    if (!this.readyForSignature()) return;
    const ids = [...new Set(enrollmentIds)].filter((id) =>
      this.signableStudents().some((s) => s.id === id));
    if (!ids.length) return;
    const sessionId = this.session.id;
    const generation = this.signatureLoadGeneration;
    this.sendingSignatures.set(true);
    this.signatureBatchResult.set(null);
    let sent = 0, failed = 0;
    try {
      for (const enrollmentId of ids) {
        try {
          if (this.session.id !== sessionId || generation !== this.signatureLoadGeneration) break;
          const draft = await firstValueFrom(this.signaturesApi.createDraft({
            sourceType: 'attendance', sourceId: sessionId, enrollmentId,
          }));
          if (!draft?.id) throw new Error('SIGNATURE_DRAFT_ID_MISSING');
          await firstValueFrom(this.signaturesApi.requestAttendance(draft.id));
          sent++;
        } catch { failed++; }
      }
      if (generation === this.signatureLoadGeneration && sessionId === this.session.id) {
        this.signatureBatchResult.set({ sent, failed });
        this.selectedForSignature.set(new Set<string>());
        await this.loadSignatureHistory(sessionId, generation);
        if (failed) this.notifications.error('signatures.errors.request', '/presences');
      }
    } finally { this.sendingSignatures.set(false); }
  }

  initials(student: AttendanceStudent) {
    return `${this.text(student.firstName).charAt(0)}${this.text(student.lastName).charAt(0)}`.toUpperCase();
  }

  fullName(student: AttendanceStudent) {
    return `${this.text(student.firstName)} ${this.text(student.lastName)}`.trim();
  }

  setStatus(studentId: string, status: AttendanceStatus) {
    if (!this.canEdit() || this.saving() || this.sendingSignatures() || !studentId) return;
    const expectedHours = this.attendance.expectedHours();
    this.students.update((students) =>
      students.map((student) => {
        if (student.id !== studentId) return student;
        const duration =
          status === "absent" || status === "excused"
            ? 0
            : status === "late"
              ? student.arrival && student.departure
                ? this.durationBetween(student.arrival, student.departure, expectedHours) ?? 0
                : 0
              : expectedHours;
        const missedHours = Math.max(0, expectedHours - duration);
        return {
          ...student,
          status,
          arrival: status === "absent" || status === "excused" ? "" : student.arrival,
          departure: status === "absent" || status === "excused" ? "" : student.departure,
          duration: this.roundHours(duration),
          missedHours: this.roundHours(missedHours),
          addToCatchup:
            status !== "excused" &&
            (status === "absent" || status === "late") &&
            missedHours > 0,
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
    if (!this.canEdit() || this.saving() || this.sendingSignatures() || !studentId) return;
    const value =
      (event.target as HTMLInputElement | HTMLTextAreaElement).value ?? "";
    this.students.update((students) =>
      students.map((student) => {
        if (student.id !== studentId) return student;
        const updated = { ...student, [field]: value };
        if (
          field === "comment" ||
          updated.status === "absent" ||
          updated.status === "excused"
        )
          return updated;
        const duration = this.durationBetween(
          updated.arrival,
          updated.departure,
          this.attendance.expectedHours(),
        );
        if (duration === null) return updated;
        const missedHours = Math.max(
          0,
          this.attendance.expectedHours() - duration,
        );
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
    if (!this.canEdit() || this.saving() || this.sendingSignatures()) return;
    this.saving.set(true);
    this.saved.set(false);
    try {
      const success = await this.attendance.save(this.students());
      this.saved.set(success);
      if (success) {
        this.selectedForSignature.set(new Set<string>());
        if (this.session.id) await this.loadSignatureHistory(this.session.id);
      }
    } finally {
      this.saving.set(false);
    }
  }

  statusClasses(status: AttendanceStatus, active: boolean) {
    if (!active)
      return "border-[#dfe5ec] bg-white text-[#334155] hover:bg-[#f6f8fb]";
    if (status === "present") return "border-[#20a956] bg-[#20a956] text-white";
    if (status === "late") return "border-[#f5a11a] bg-[#f5a11a] text-white";
    if (status === "absent") return "border-[#ed2632] bg-[#ed2632] text-white";
    if (status === "excused") return "border-[#2b66a4] bg-[#2b66a4] text-white";
    return "border-[#dfe5ec] bg-white text-[#334155]";
  }

  statusLabelKey(status: AttendanceStatus) {
    return `attendance.status.${status || "pending"}`;
  }

  private durationBetween(
    arrival: string,
    departure: string,
    maximumHours: number,
  ): number | null {
    const start = this.clockMinutes(arrival);
    const end = this.clockMinutes(departure);
    if (start === null || end === null || end <= start) return null;
    return Math.min((end - start) / 60, Math.max(0, maximumHours));
  }

  private clockMinutes(value: string): number | null {
    if (!/^\d{2}:\d{2}$/.test(value)) return null;
    const [hour, minute] = value.split(":").map(Number);
    if (
      !Number.isFinite(hour) ||
      !Number.isFinite(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    )
      return null;
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
