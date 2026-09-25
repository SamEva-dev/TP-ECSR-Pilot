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
import type {
  AttendanceStatus,
  AttendanceStudent,
} from "../../core/models/attendance.models";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";
import {
  TrainingDeliveryApiService,
  type TrainingSessionApi,
} from "../../core/training-delivery/training-delivery-api.service";
import { StudentProfileApiService } from "../../core/students/student-profile-api.service";
import { firstValueFrom } from "rxjs";
import { ActivatedRoute } from "@angular/router";

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
  private readonly profileApi = inject(StudentProfileApiService);
  private readonly route = inject(ActivatedRoute);
  readonly remoteSession = signal<TrainingSessionApi | null>(null);
  readonly remoteSessions = signal<TrainingSessionApi[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly saveError = signal(false);
  private loadGeneration = 0;
  private sessionGeneration = 0;
  private originalTimes = new Map<
    string,
    { arrival: string | null; departure: string | null }
  >();
  readonly students = signal<AttendanceStudent[]>([]);
  readonly saved = signal(false);

  get session() {
    const remote = this.remoteSession();
    if (remote) {
      const start = new Date(remote.startsAtUtc);
      const end = new Date(remote.endsAtUtc);
      const dateFormat = new Intl.DateTimeFormat("fr-FR", {
        timeZone: remote.timeZoneId,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const timeFormat = new Intl.DateTimeFormat("fr-FR", {
        timeZone: remote.timeZoneId,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
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
      date: "—",
      start: "—",
      end: "—",
      promotion: this.contextData.activeCohortName(),
      title: "—",
      trainer: "—",
    };
  }

  constructor() {
    effect((onCleanup) => {
      const cohort = this.contextData.cohort();
      const user = this.sessionService.session();
      const generation = ++this.loadGeneration;
      this.saved.set(false);
      this.saveError.set(false);
      this.loadError.set(false);
      this.remoteSessions.set([]);
      this.sessionGeneration++;
      this.remoteSession.set(null);
      this.students.set([]);
      this.originalTimes.clear();
      this.loading.set(false);
      if (user?.role === "stagiaire" || cohort?.apiId) {
        this.loading.set(true);
        void this.loadSessions(
          user?.role === "stagiaire" ? null : (cohort?.apiId ?? null),
          generation,
        );
      }
      onCleanup(() => {
        this.loadGeneration++;
      });
    });
  }

  private async loadSessions(
    cohortApiId: string | null,
    generation: number,
  ): Promise<void> {
    try {
      if (!cohortApiId)
        cohortApiId = (await firstValueFrom(this.profileApi.self())).cohortId;
      const sessions = await this.trainingApi.list(cohortApiId);
      if (generation !== this.loadGeneration) return;
      const available = sessions
        .filter((item) => item.status !== "cancelled")
        .sort((a, b) => b.startsAtUtc.localeCompare(a.startsAtUtc));
      this.remoteSessions.set(available);
      const requested = this.route.snapshot.queryParamMap.get("sessionId");
      const selected =
        available.find((item) => item.id === requested) ??
        available.find((item) => Date.parse(item.startsAtUtc) <= Date.now()) ??
        available.at(-1);
      if (selected) await this.selectSession(selected.id, generation);
    } catch {
      if (generation === this.loadGeneration) this.loadError.set(true);
    } finally {
      if (generation === this.loadGeneration) this.loading.set(false);
    }
  }

  async selectSession(
    id: string,
    generation = this.loadGeneration,
  ): Promise<void> {
    const selected = this.remoteSessions().find((item) => item.id === id);
    if (!selected) return;
    const requestId = ++this.sessionGeneration;
    this.loading.set(true);
    this.saved.set(false);
    this.saveError.set(false);
    try {
      const sheet = await this.trainingApi.getAttendance(id);
      if (
        generation !== this.loadGeneration ||
        requestId !== this.sessionGeneration
      )
        return;
      this.originalTimes = new Map(
        sheet.entries.map((entry) => [
          entry.enrollmentId,
          {
            arrival: entry.arrivalAtUtc ?? null,
            departure: entry.departureAtUtc ?? null,
          },
        ]),
      );
      this.remoteSession.set(selected);
      this.students.set(
        sheet.entries.map((entry) => ({
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
        })),
      );
      this.loadError.set(false);
    } catch {
      if (
        generation === this.loadGeneration &&
        requestId === this.sessionGeneration
      ) {
        this.loadError.set(true);
        this.remoteSession.set(null);
        this.students.set([]);
      }
    } finally {
      if (
        generation === this.loadGeneration &&
        requestId === this.sessionGeneration
      )
        this.loading.set(false);
    }
  }

  updateSession(event: Event): void {
    void this.selectSession((event.target as HTMLSelectElement).value);
  }
  sessionDate(item: TrainingSessionApi): string {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: item.timeZoneId,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(item.startsAtUtc));
  }

  private timeValue(
    value: string | null | undefined,
    timeZoneId: string,
  ): string {
    if (!value) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: timeZoneId,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  private localTimeToIso(time: string, original: string | null): string | null {
    const remote = this.remoteSession();
    if (!remote || !time) return null;
    if (original && this.timeValue(original, remote.timeZoneId) === time)
      return original;
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: remote.timeZoneId,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const read = (value: Date) =>
      Object.fromEntries(
        formatter.formatToParts(value).map((part) => [part.type, part.value]),
      );
    const day = read(new Date(remote.startsAtUtc));
    const [hour, minute] = time.split(":").map(Number);
    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour > 23 ||
      minute > 59
    )
      throw new Error("Invalid time");
    const desired = Date.UTC(
      Number(day["year"]),
      Number(day["month"]) - 1,
      Number(day["day"]),
      hour,
      minute,
    );
    let candidate = desired;
    for (let attempt = 0; attempt < 4; attempt++) {
      const actual = read(new Date(candidate));
      const actualWallClock = Date.UTC(
        Number(actual["year"]),
        Number(actual["month"]) - 1,
        Number(actual["day"]),
        Number(actual["hour"]),
        Number(actual["minute"]),
      );
      candidate += desired - actualWallClock;
    }
    const final = read(new Date(candidate));
    if (
      Date.UTC(
        Number(final["year"]),
        Number(final["month"]) - 1,
        Number(final["day"]),
        Number(final["hour"]),
        Number(final["minute"]),
      ) !== desired
    )
      throw new Error("Invalid time zone transition");
    return new Date(candidate).toISOString();
  }

  readonly isStudent = computed(
    () => this.sessionService.role() === "stagiaire",
  );
  readonly isSecretariat = computed(
    () => this.sessionService.role() === "secretariat",
  );
  readonly canEdit = computed(() =>
    ["direction", "secretariat", "formateur"].includes(
      this.sessionService.role(),
    ),
  );
  readonly visibleStudents = computed(() => {
    if (!this.isStudent()) return this.students();
    // The backend restricts the attendance sheet to this authenticated enrollment.
    return this.students();
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
        const expectedHours = (this.remoteSession()?.plannedMinutes ?? 0) / 60;
        const missedHours =
          status === "absent" || status === "excused"
            ? expectedHours
            : status === "late"
              ? student.missedHours
              : 0;
        return {
          ...student,
          status,
          duration:
            status === "absent" || status === "excused"
              ? 0
              : status === "late"
                ? student.duration
                : expectedHours,
          missedHours,
          catchupHours:
            status === "absent" || status === "late" ? missedHours : 0,
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
      students.map((student) => {
        if (student.id !== studentId) return student;
        const updated = { ...student, [field]: value };
        if (
          field !== "comment" &&
          updated.arrival &&
          updated.departure &&
          this.remoteSession()
        ) {
          const [startHour, startMinute] = updated.arrival
            .split(":")
            .map(Number);
          const [endHour, endMinute] = updated.departure.split(":").map(Number);
          const durationMinutes =
            endHour * 60 + endMinute - startHour * 60 - startMinute;
          if (durationMinutes > 0) {
            const planned = this.remoteSession()!.plannedMinutes;
            updated.duration = Math.min(planned, durationMinutes) / 60;
            updated.missedHours = Math.max(0, planned - durationMinutes) / 60;
            updated.catchupHours = updated.addToCatchup
              ? updated.missedHours
              : 0;
          }
        }
        return updated;
      }),
    );
    this.saved.set(false);
  }

  async save() {
    if (!this.canEdit() || this.loading()) return;
    const remote = this.remoteSession();
    if (!remote) return;
    this.saveError.set(false);
    if (
      this.students().some(
        (student) =>
          student.status === "late" && (!student.arrival || !student.departure),
      )
    ) {
      this.saveError.set(true);
      return;
    }
    try {
      const entries = this.students()
        .filter((student) => student.status !== "pending")
        .map((student) => ({
          enrollmentId: student.id,
          status: student.status as "present" | "late" | "absent" | "excused",
          arrivalAtUtc: this.localTimeToIso(
            student.arrival,
            this.originalTimes.get(student.id)?.arrival ?? null,
          ),
          departureAtUtc: this.localTimeToIso(
            student.departure,
            this.originalTimes.get(student.id)?.departure ?? null,
          ),
          presentMinutes: Math.round(student.duration * 60),
          addToCatchup: student.addToCatchup,
          comment: student.comment || null,
        }));
      await this.trainingApi.saveAttendance(remote.id, { entries });
      await this.selectSession(remote.id);
      if (this.loadError()) return;
      this.saved.set(true);
    } catch {
      this.saved.set(false);
      this.saveError.set(true);
    }
  }

  statusClasses(status: AttendanceStatus, active: boolean) {
    if (!active)
      return "border-[#dfe5ec] bg-white text-[#334155] hover:bg-[#f6f8fb]";
    if (status === "pending")
      return "border-[#cbd5e1] bg-[#f1f5f9] text-[#64748b]";
    if (status === "present") return "border-[#20a956] bg-[#20a956] text-white";
    if (status === "late") return "border-[#f5a11a] bg-[#f5a11a] text-white";
    if (status === "absent") return "border-[#ed2632] bg-[#ed2632] text-white";
    return "border-[#2b66a4] bg-[#2b66a4] text-white";
  }

  statusLabelKey(status: AttendanceStatus) {
    return `attendance.status.${status}`;
  }
}
