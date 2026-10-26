import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import type { PlanningEvent, PlanningType } from "../models/planning.models";
import type { PedagogicalSessionType, ProgrammedSession, SessionModality } from "../models/sessions.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { PedagoraAccessApiService } from "../access/pedagora-access-api.service";
import { firstValueFrom } from "rxjs";
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

export interface TrainerOption { id: string; name: string; }

export interface CreateSessionValue {
  cohortId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: TrainingSessionType;
  modality: TrainingSessionModality;
  title: string;
  trainerAuthGateUserId: string;
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
  private readonly accessApi = inject(PedagoraAccessApiService);

  private readonly rowsSignal = signal<TrainingSessionApi[]>([]);
  private readonly trainersSignal = signal<TrainerOption[]>([]);
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
  readonly trainers = this.trainersSignal.asReadonly();

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const cohortApiIds = this.visibleCohortApiIds();
      const generation = ++this.generation;
      ++this.request;
      this.rowsSignal.set([]);
      this.loadError.set(false);
      if (ready && cohortApiIds.length) {
        void this.reload(generation, cohortApiIds);
        void this.loadEligibleTrainers(generation);
      } else {
        this.loading.set(false);
        this.trainersSignal.set([]);
      }
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.training\.session\./.test(event.typeKey)) return;
      untracked(() => {
        if (this.visibleCohortApiIds().length) void this.reload();
      });
    });
  }

  private visibleCohortApiIds(): string[] {
    const level = this.workspace.activeLevel();
    const selectedCohort = this.workspace.cohort();
    if (level === "cohort") {
      const cohort = this.workspace.cohorts().find((item) => item.id === selectedCohort?.id);
      return cohort?.apiId ? [this.text(cohort.apiId)] : [];
    }
    // At broader levels, workspace.cohorts() only covers the selected offering.
    // siteCohorts() enforces access rules for each site and exposes programId.
    const sites = level === "organization"
      ? this.workspace.sites()
      : this.workspace.site() ? [this.workspace.site()!] : [];
    const selectedProgramId = level === "program" ? this.workspace.program()?.id : null;
    const cohorts = sites.flatMap((site) => this.workspace.siteCohorts(site.id))
      .filter((cohort) => !selectedProgramId || cohort.programId === selectedProgramId);
    return [...new Set(cohorts.map((item) => this.text(item.apiId)).filter(Boolean))];
  }

  async reload(
    generation = this.generation,
    cohortApiIds: string[] = this.visibleCohortApiIds(),
  ): Promise<boolean> {
    const request = ++this.request;
    if (!cohortApiIds.length) {
      this.rowsSignal.set([]);
      this.loading.set(false);
      return true;
    }

    this.loading.set(true);
    try {
      const results = await Promise.allSettled(cohortApiIds.map((id) => this.api.list(id)));
      if (generation !== this.generation || request !== this.request) return false;
      const rows = results.flatMap((result) =>
        result.status === "fulfilled" && Array.isArray(result.value) ? result.value : [],
      );
      this.rowsSignal.set(
        [...new Map(rows.map((row) => [row.id, this.normalize(row)])).values()],
      );
      const failed = results.some((result) => result.status === "rejected");
      this.loadError.set(failed);
      if (failed) this.notifications.error("sessions.real.loadError", "/seances");
      return !failed;
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
    const allowedIds = new Set(this.visibleCohortApiIds());
    const cohort = this.workspace.cohorts().find((item) => item.id === value.cohortId)
      ?? this.workspace.sites().flatMap((site) => this.workspace.siteCohorts(site.id))
        .find((item) => item.id === value.cohortId);
    const cohortApiId = this.text(cohort?.apiId);
    const startsAtUtc = parisInstant(this.text(value.date), this.text(value.startTime));
    const endsAtUtc = parisInstant(this.text(value.date), this.text(value.endTime));

    if (!cohortApiId || !allowedIds.has(cohortApiId) || !startsAtUtc || !endsAtUtc || endsAtUtc <= startsAtUtc) {
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
      trainerAuthGateUserId: this.nullableText(value.trainerAuthGateUserId),
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

    // Ne jamais envoyer l'identité du Directeur (ou une identité obsolète)
    // à la place d'un formateur présent dans l'annuaire de l'organisation.
    const selectedTrainerId = this.text(request.trainerAuthGateUserId).trim();
    if (!selectedTrainerId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedTrainerId)) {
      this.notifications.error("sessions.real.saveError", errorPath);
      return null;
    }
    try {
      // Vérifier sur une liste fraîche au moment de l'écriture : le rôle ou le
      // rattachement organisationnel peut avoir changé depuis l'ouverture.
      const directory = await firstValueFrom(this.accessApi.trainers());
      const eligible = (Array.isArray(directory) ? directory : []).find((item) =>
        item.status === "Active"
        && !item.isInvitation
        && this.text(item.id).toLowerCase() === selectedTrainerId.toLowerCase()
      );
      if (!eligible) {
        this.notifications.error("sessions.real.saveError", errorPath);
        return null;
      }
      request.trainerAuthGateUserId = this.text(eligible.id);
      request.trainerDisplayName = [this.text(eligible.firstName), this.text(eligible.lastName)]
        .filter(Boolean).join(" ").trim();
      const created = this.normalize(await this.api.create(request));
      this.upsert(created);
      await this.reload();
      return created;
    } catch {
      this.notifications.error("sessions.real.saveError", errorPath);
      return null;
    }
  }


  private async loadEligibleTrainers(generation: number): Promise<void> {
    try {
      const rows = await firstValueFrom(this.accessApi.trainers());
      if (generation !== this.generation) return;
      this.trainersSignal.set((Array.isArray(rows) ? rows : [])
        .filter((row) => row.status === "Active" && !row.isInvitation)
        .map((row) => ({
        id: this.text(row.id),
        name: [this.text(row.firstName), this.text(row.lastName)].filter(Boolean).join(" ").trim(),
      })).filter((row) => !!row.id && !!row.name));
    } catch {
      if (generation !== this.generation) return;
      this.trainersSignal.set([]);
      this.notifications.error("sessions.real.loadError", "/seances");
    }
  }

  private visibleCohorts(): any[] {
    const ids = new Set(this.visibleCohortApiIds());
    return this.workspace.sites()
      .flatMap((site) => this.workspace.siteCohorts(site.id))
      .filter((cohort) => ids.has(this.text(cohort.apiId)));
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
      promotion: this.visibleCohorts().find((item) => item.apiId === row.cohortId)?.name ?? "",
      promotionId: this.visibleCohorts().find((item) => item.apiId === row.cohortId)?.id ?? "",
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
      promotionId: this.visibleCohorts().find((item) => item.apiId === row.cohortId)?.id ?? "",
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
    const day = (["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).includes(weekday as any)
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
