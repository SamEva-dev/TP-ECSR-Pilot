import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import type { PlanningEvent, PlanningType } from "../models/planning.models";
import type { PedagogicalSessionType, ProgrammedSession, SessionModality } from "../models/sessions.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionService } from "../session/session.service";
import {
  TrainingDeliveryApiService,
  type CreateTrainingSessionApiRequest,
  type TrainingSessionApi,
  type TrainingSessionModality,
  type TrainingSessionType,
} from "../training-delivery/training-delivery-api.service";
import { PARIS_ZONE, parisInstant } from "../training-delivery/paris-time";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

export interface CreateSessionValue {
  cohortId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: TrainingSessionType;
  modality: TrainingSessionModality;
  title: string;
  trainerDisplayName: string;
  location: string;
  objective: string;
  supports: string;
  comments: string;
}

@Injectable({ providedIn: "root" })
export class TrainingSessionApiStoreService {
  private readonly api = inject(TrainingDeliveryApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly realtime = inject(RealtimeService);
  private readonly session = inject(SessionService);
  private readonly notifications = inject(ApplicationNotificationService);

  private readonly rowsSignal = signal<TrainingSessionApi[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  private generation = 0;
  private request = 0;

  readonly apiSessions = this.rowsSignal.asReadonly();
  readonly sessions = computed<ProgrammedSession[]>(() =>
    this.rowsSignal().map((row) => this.toSession(row)),
  );
  readonly planningEvents = computed<PlanningEvent[]>(() =>
    this.rowsSignal().map((row) => this.toPlanning(row)).filter((row): row is PlanningEvent => row !== null),
  );
  readonly drivingProgrammed = computed<PlanningEvent[]>(() =>
    this.planningEvents().filter((row) => row.type === "driving"),
  );
  readonly trainers = computed<string[]>(() => {
    const current = this.currentUserName();
    return [...new Set([
      current,
      ...this.rowsSignal().map((row) => this.text(row.trainerDisplayName)),
    ].filter(Boolean))];
  });

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const cohortApiId = this.workspace.cohort()?.apiId ?? "";
      const ready = this.workspace.remoteWorkspaceLoaded();
      const generation = ++this.generation;
      this.rowsSignal.set([]);
      this.loadError.set(false);
      if (ready && cohortApiId) void this.reload(generation, cohortApiId);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.training\.session\./.test(event.typeKey)) return;
      untracked(() => {
        if (this.workspace.cohort()?.apiId) void this.reload();
      });
    });
  }

  async reload(
    generation = this.generation,
    cohortApiId = this.workspace.cohort()?.apiId ?? "",
  ): Promise<boolean> {
    if (!cohortApiId) {
      this.rowsSignal.set([]);
      return true;
    }

    const request = ++this.request;
    this.loading.set(true);
    try {
      const rows = await this.api.list(cohortApiId);
      if (generation !== this.generation || request !== this.request) return false;
      this.rowsSignal.set((Array.isArray(rows) ? rows : []).map((row) => this.normalize(row)));
      this.loadError.set(false);
      return true;
    } catch {
      if (generation === this.generation && request === this.request) {
        this.rowsSignal.set([]);
        this.loadError.set(true);
        this.notifications.error("sessions.real.loadError", "/seances");
      }
      return false;
    } finally {
      if (generation === this.generation && request === this.request) this.loading.set(false);
    }
  }

  async create(value: CreateSessionValue, errorPath = "/seances"): Promise<TrainingSessionApi | null> {
    const cohort = this.workspace.cohorts().find((item) => item.id === value.cohortId);
    const cohortApiId = this.text(cohort?.apiId);
    const startsAtUtc = parisInstant(this.text(value.date), this.text(value.startTime));
    const endsAtUtc = parisInstant(this.text(value.date), this.text(value.endTime));

    if (!cohortApiId || !startsAtUtc || !endsAtUtc || endsAtUtc <= startsAtUtc) {
      this.notifications.error("sessions.real.saveError", errorPath);
      return null;
    }

    const request: CreateTrainingSessionApiRequest = {
      cohortId: cohortApiId,
      type: this.type(value.type),
      modality: this.modality(value.modality),
      title: this.text(value.title).trim(),
      startsAtUtc,
      endsAtUtc,
      timeZoneId: PARIS_ZONE,
      trainerAuthGateUserId: null,
      trainerDisplayName: this.nullableText(value.trainerDisplayName),
      location: this.nullableText(value.location),
      objective: this.nullableText(value.objective),
      supports: this.nullableText(value.supports),
      comments: this.nullableText(value.comments),
      audienceMode: "whole-cohort",
      participantEnrollmentIds: [],
      externalKey: null,
    };

    if (!request.title) {
      this.notifications.error("sessions.real.saveError", errorPath);
      return null;
    }

    try {
      const created = this.normalize(await this.api.create(request));
      this.upsert(created);
      await this.reload();
      return created;
    } catch {
      this.notifications.error("sessions.real.saveError", errorPath);
      return null;
    }
  }

  cohortName(cohortApiId: string): string {
    return this.workspace.cohortNameByApiId(this.text(cohortApiId)) ?? "";
  }

  private upsert(row: TrainingSessionApi): void {
    this.rowsSignal.update((items) => [row, ...items.filter((item) => item.id !== row.id)]);
  }

  private toSession(row: TrainingSessionApi): ProgrammedSession {
    const local = this.localParts(row.startsAtUtc, row.endsAtUtc);
    return {
      id: this.text(row.id),
      titleKey: this.text(row.title),
      date: local.displayDate,
      start: local.start,
      end: local.end,
      trainer: this.text(row.trainerDisplayName),
      promotion: this.workspace.cohortNameByApiId(this.text(row.cohortId)) ?? this.text(this.workspace.cohort()?.name),
      promotionId: this.workspace.cohorts().find((item) => item.apiId === row.cohortId)?.id ?? this.text(this.workspace.cohort()?.id),
      type: this.type(row.type) as PedagogicalSessionType,
      modality: this.modality(row.modality) as SessionModality,
      objectiveKey: this.text(row.objective),
      supportsKey: this.text(row.supports),
      present: this.number(row.presentLearners),
      expected: this.number(row.expectedLearners),
    };
  }

  private toPlanning(row: TrainingSessionApi): PlanningEvent | null {
    const local = this.localParts(row.startsAtUtc, row.endsAtUtc);
    if (!local.day) return null;
    const trainer = this.text(row.trainerDisplayName);
    const location = this.text(row.location);
    return {
      id: this.text(row.id),
      day: local.day,
      promotionId: this.workspace.cohorts().find((item) => item.apiId === row.cohortId)?.id ?? this.text(this.workspace.cohort()?.id),
      type: this.type(row.type) as PlanningType,
      titleKey: this.text(row.title),
      time: `${local.start}–${local.end}`,
      meta: [trainer, location].filter(Boolean).join(" · "),
      date: local.displayDate,
      competence: this.text(row.objective),
    };
  }

  private localParts(startsAtUtc: unknown, endsAtUtc: unknown): {
    displayDate: string;
    start: string;
    end: string;
    day: PlanningEvent["day"] | null;
  } {
    const start = this.date(startsAtUtc);
    const end = this.date(endsAtUtc);
    if (!start || !end) return { displayDate: "", start: "", end: "", day: null };
    const dateFormatter = new Intl.DateTimeFormat("fr-FR", { timeZone: PARIS_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
    const timeFormatter = new Intl.DateTimeFormat("fr-FR", { timeZone: PARIS_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: PARIS_ZONE, weekday: "long" }).format(start).toLowerCase();
    const day = (["monday", "tuesday", "wednesday", "thursday", "friday"] as const).includes(weekday as any)
      ? weekday as PlanningEvent["day"]
      : null;
    return { displayDate: dateFormatter.format(start), start: timeFormatter.format(start), end: timeFormatter.format(end), day };
  }

  private normalize(row: TrainingSessionApi): TrainingSessionApi {
    return {
      id: this.text(row?.id),
      organizationId: this.text(row?.organizationId),
      siteId: this.text(row?.siteId),
      cohortId: this.text(row?.cohortId),
      type: this.type(row?.type),
      modality: this.modality(row?.modality),
      title: this.text(row?.title),
      startsAtUtc: this.text(row?.startsAtUtc),
      endsAtUtc: this.text(row?.endsAtUtc),
      timeZoneId: this.text(row?.timeZoneId) || PARIS_ZONE,
      trainerAuthGateUserId: this.nullableText(row?.trainerAuthGateUserId),
      trainerDisplayName: this.nullableText(row?.trainerDisplayName),
      location: this.nullableText(row?.location),
      objective: this.nullableText(row?.objective),
      supports: this.nullableText(row?.supports),
      comments: this.nullableText(row?.comments),
      status: row?.status === "inprogress" || row?.status === "completed" || row?.status === "cancelled" ? row.status : "planned",
      audienceMode: row?.audienceMode === "selected-enrollments" ? "selected-enrollments" : "whole-cohort",
      participantEnrollmentIds: Array.isArray(row?.participantEnrollmentIds) ? row.participantEnrollmentIds.filter((id): id is string => typeof id === "string") : [],
      plannedMinutes: this.number(row?.plannedMinutes),
      expectedLearners: this.number(row?.expectedLearners),
      presentLearners: this.number(row?.presentLearners),
      externalKey: this.nullableText(row?.externalKey),
    };
  }

  private currentUserName(): string {
    const user = this.session.session();
    return [this.text(user?.firstName), this.text(user?.lastName)].filter(Boolean).join(" ").trim();
  }

  private type(value: unknown): TrainingSessionType {
    return value === "distance" || value === "driving" || value === "evaluation" || value === "internship" || value === "presentation" || value === "catchup" || value === "sensitization" || value === "event" ? value : "classroom";
  }
  private modality(value: unknown): TrainingSessionModality {
    return value === "remote-live" || value === "remote-async" || value === "practical" ? value : "onsite";
  }
  private text(value: unknown): string { return typeof value === "string" ? value : ""; }
  private nullableText(value: unknown): string | null { const text = this.text(value).trim(); return text || null; }
  private number(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
  private date(value: unknown): Date | null { const d = new Date(this.text(value)); return Number.isNaN(d.getTime()) ? null : d; }
}
