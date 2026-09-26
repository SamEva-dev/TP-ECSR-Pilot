import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import type { AttendanceStudent } from "../models/attendance.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import {
  TrainingDeliveryApiService,
  type AttendanceEntryApi,
  type AttendanceSheetApi,
  type TrainingSessionApi,
} from "../training-delivery/training-delivery-api.service";
import { PARIS_ZONE, parisInstant } from "../training-delivery/paris-time";
import { TranslateService } from "../i18n/translate.service";
import { TrainingSessionApiStoreService } from "./training-session-api-store.service";

export interface AttendanceSessionView {
  id: string;
  date: string;
  start: string;
  end: string;
  promotion: string;
  title: string;
  trainer: string;
}

const EMPTY_SESSION: AttendanceSessionView = {
  id: "",
  date: "",
  start: "",
  end: "",
  promotion: "",
  title: "",
  trainer: "",
};

@Injectable({ providedIn: "root" })
export class AttendanceApiStoreService {
  private readonly api = inject(TrainingDeliveryApiService);
  private readonly sessions = inject(TrainingSessionApiStoreService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly realtime = inject(RealtimeService);
  private readonly translate = inject(TranslateService);

  private readonly sheetSignal = signal<AttendanceSheetApi | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  private generation = 0;

  readonly selectedSession = computed<TrainingSessionApi | null>(() =>
    this.pickSession(this.sessions.apiSessions()),
  );

  readonly session = computed<AttendanceSessionView>(() => {
    // Read locale so the date is recomputed after a language switch.
    const locale = this.translate.locale();
    const row = this.selectedSession();
    if (!row) return EMPTY_SESSION;
    return {
      id: this.text(row.id),
      date: this.longLocalDate(row.startsAtUtc, locale),
      start: this.localTime(row.startsAtUtc),
      end: this.localTime(row.endsAtUtc),
      promotion: this.text(this.sessions.cohortName(row.cohortId)),
      title: this.text(row.title),
      trainer: this.text(row.trainerDisplayName),
    };
  });

  readonly expectedHours = computed(() =>
    this.minutesToHours(this.number(this.sheetSignal()?.expectedMinutes)),
  );

  readonly students = computed<AttendanceStudent[]>(() =>
    (this.sheetSignal()?.entries ?? []).map((entry) => this.mapEntry(entry)),
  );

  constructor() {
    effect(() => {
      const sessionId = this.selectedSession()?.id ?? "";
      const generation = ++this.generation;
      this.sheetSignal.set(null);
      this.loadError.set(false);
      if (sessionId) void this.load(sessionId, generation);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.training\.attendance\./.test(event.typeKey)) return;
      untracked(() => {
        const sessionId = this.selectedSession()?.id ?? "";
        if (sessionId) void this.load(sessionId, this.generation, false);
      });
    });
  }

  async reload(): Promise<boolean> {
    const sessionId = this.selectedSession()?.id ?? "";
    if (!sessionId) {
      this.sheetSignal.set(null);
      return true;
    }
    return this.load(sessionId, this.generation);
  }

  async save(students: AttendanceStudent[]): Promise<boolean> {
    const row = this.selectedSession();
    if (!row?.id) {
      this.notifications.error("attendance.real.saveFailed", "/presences");
      return false;
    }

    const localDate = this.localIsoDate(row.startsAtUtc);
    if (!localDate) {
      this.notifications.error("attendance.real.saveFailed", "/presences");
      return false;
    }

    try {
      const entries = students
        .filter((student) => student.status !== "pending")
        .map((student) => {
          const arrivalAtUtc = student.arrival
            ? parisInstant(localDate, student.arrival)
            : null;
          const departureAtUtc = student.departure
            ? parisInstant(localDate, student.departure)
            : null;
          if ((student.arrival && !arrivalAtUtc) || (student.departure && !departureAtUtc)) {
            throw new Error("ATTENDANCE_TIME_INVALID");
          }
          return {
            enrollmentId: this.text(student.id),
            status: student.status as "present" | "late" | "absent" | "excused",
            arrivalAtUtc,
            departureAtUtc,
            presentMinutes: Math.max(0, Math.round(this.number(student.duration) * 60)),
            addToCatchup: Boolean(student.addToCatchup),
            comment: this.nullableText(student.comment),
          };
        });

      const saved = await this.api.saveAttendance(row.id, { entries });
      this.sheetSignal.set(this.normalizeSheet(saved));
      this.loadError.set(false);
      return true;
    } catch {
      this.notifications.error("attendance.real.saveFailed", "/presences");
      return false;
    }
  }

  private async load(sessionId: string, generation: number, notify = true): Promise<boolean> {
    this.loading.set(true);
    try {
      const sheet = await this.api.getAttendance(sessionId);
      if (generation !== this.generation || sessionId !== (this.selectedSession()?.id ?? "")) return false;
      this.sheetSignal.set(this.normalizeSheet(sheet));
      this.loadError.set(false);
      return true;
    } catch {
      if (generation === this.generation && sessionId === (this.selectedSession()?.id ?? "")) {
        this.sheetSignal.set(null);
        this.loadError.set(true);
        if (notify) this.notifications.error("attendance.real.failed", "/presences");
      }
      return false;
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  private pickSession(rows: TrainingSessionApi[]): TrainingSessionApi | null {
    const candidates = (Array.isArray(rows) ? rows : [])
      .filter((row) => row?.status !== "cancelled" && Boolean(this.text(row?.id)))
      .slice();
    if (!candidates.length) return null;

    const now = Date.now();
    const started = candidates
      .filter((row) => this.time(row.startsAtUtc) <= now)
      .sort((a, b) => this.time(b.startsAtUtc) - this.time(a.startsAtUtc));
    if (started.length) return started[0] ?? null;

    return candidates.sort((a, b) => this.time(a.startsAtUtc) - this.time(b.startsAtUtc))[0] ?? null;
  }

  private normalizeSheet(sheet: AttendanceSheetApi | null | undefined): AttendanceSheetApi {
    return {
      id: this.text(sheet?.id),
      sessionId: this.text(sheet?.sessionId),
      cohortId: this.text(sheet?.cohortId),
      expectedMinutes: this.number(sheet?.expectedMinutes),
      presentCount: this.number(sheet?.presentCount),
      lateCount: this.number(sheet?.lateCount),
      absentCount: this.number(sheet?.absentCount),
      excusedCount: this.number(sheet?.excusedCount),
      totalMissedMinutes: this.number(sheet?.totalMissedMinutes),
      entries: Array.isArray(sheet?.entries)
        ? sheet!.entries.map((entry) => ({
            enrollmentId: this.text(entry?.enrollmentId),
            learnerProfileId: this.text(entry?.learnerProfileId),
            personId: this.text(entry?.personId),
            firstName: this.text(entry?.firstName),
            lastName: this.text(entry?.lastName),
            displayName: this.text(entry?.displayName),
            status: this.attendanceStatus(entry?.status),
            arrivalAtUtc: this.nullableText(entry?.arrivalAtUtc),
            departureAtUtc: this.nullableText(entry?.departureAtUtc),
            expectedMinutes: this.number(entry?.expectedMinutes),
            presentMinutes: this.number(entry?.presentMinutes),
            missedMinutes: this.number(entry?.missedMinutes),
            catchupMinutes: this.number(entry?.catchupMinutes),
            addToCatchup: Boolean(entry?.addToCatchup),
            comment: this.nullableText(entry?.comment),
          }))
        : [],
    };
  }

  private mapEntry(entry: AttendanceEntryApi): AttendanceStudent {
    return {
      id: this.text(entry.enrollmentId),
      firstName: this.text(entry.firstName),
      lastName: this.text(entry.lastName),
      catchupHours: this.minutesToHours(entry.catchupMinutes),
      absences: 0,
      status: this.attendanceStatus(entry.status),
      arrival: this.localTime(entry.arrivalAtUtc),
      departure: this.localTime(entry.departureAtUtc),
      duration: this.minutesToHours(entry.presentMinutes),
      comment: this.text(entry.comment),
      missedHours: this.minutesToHours(entry.missedMinutes),
      addToCatchup: Boolean(entry.addToCatchup),
    };
  }

  private attendanceStatus(value: unknown): AttendanceStudent["status"] {
    return value === "present" || value === "late" || value === "absent" || value === "excused"
      ? value
      : "pending";
  }

  private longLocalDate(value: unknown, locale: "fr" | "en"): string {
    const date = this.date(value);
    if (!date) return "";
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
      timeZone: PARIS_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  private localIsoDate(value: unknown): string {
    const date = this.date(value);
    if (!date) return "";
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: PARIS_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date).map((part) => [part.type, part.value]),
    );
    return `${parts["year"] ?? ""}-${parts["month"] ?? ""}-${parts["day"] ?? ""}`;
  }

  private localTime(value: unknown): string {
    const date = this.date(value);
    if (!date) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: PARIS_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  }

  private date(value: unknown): Date | null {
    if (typeof value !== "string" || !value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private time(value: unknown): number {
    return this.date(value)?.getTime() ?? Number.POSITIVE_INFINITY;
  }

  private minutesToHours(value: unknown): number {
    return Math.round((this.number(value) / 60) * 100) / 100;
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private nullableText(value: unknown): string | null {
    const text = this.text(value).trim();
    return text || null;
  }
}
