import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import type {
  RemoteActivityStatus,
  RemoteWorkActivity,
  RemoteWorkPeriod,
  RemoteWorkPolicy,
  RemoteWorkRequest,
} from "../models/remote-work.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionService } from "../session/session.service";
import { WorkforceApiService } from "../workforce/workforce-api.service";
import type { CreateRemoteWorkRequestApi, RemoteWorkRequestApi } from "../workforce/workforce.models";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

const EMPTY_POLICY: RemoteWorkPolicy = {
  enabled: false,
  approvalRequired: false,
  maxDaysPerWeek: 0,
  halfDayAllowed: false,
  endOfDayReport: false,
};

@Injectable({ providedIn: "root" })
export class RemoteWorkApiStoreService {
  private readonly api = inject(WorkforceApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly session = inject(SessionService);
  private readonly realtime = inject(RealtimeService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly requestsSignal = signal<RemoteWorkRequest[]>([]);
  private readonly policySignal = signal<RemoteWorkPolicy>({ ...EMPTY_POLICY });

  readonly requests = this.requestsSignal.asReadonly();
  readonly policy = this.policySignal.asReadonly();
  readonly activities = computed<RemoteWorkActivity[]>(() =>
    this.requestsSignal().flatMap((request) =>
      this.rawActivities.get(request.id) ?? [],
    ),
  );
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly remoteLoaded = signal(false);

  private rawActivities = new Map<string, RemoteWorkActivity[]>();
  private generation = 0;
  private requestSequence = 0;

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const user = this.session.session();
      const ready = this.workspace.remoteWorkspaceLoaded();
      const siteApiId = this.workspace.site()?.apiId ?? "";
      const generation = ++this.generation;
      this.requestsSignal.set([]);
      this.rawActivities = new Map();
      this.policySignal.set({ ...EMPTY_POLICY });
      this.loadError.set(false);
      this.remoteLoaded.set(false);
      if (user && ready) void this.reload(generation, siteApiId);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !event.typeKey.startsWith("pedagora.workforce.remote-work.")) return;
      untracked(() => {
        if (this.workspace.remoteWorkspaceLoaded()) void this.reload();
      });
    });
  }

  async reload(
    generation = this.generation,
    siteApiId = this.workspace.site()?.apiId ?? "",
  ): Promise<void> {
    const requestSequence = ++this.requestSequence;
    this.loading.set(true);
    try {
      const isPlatform = (this.session.session()?.roles ?? []).some((role) =>
        /superadmin|platformadministrator|platformadmin/i.test(role),
      );
      const [requestsResult, policyResult] = await Promise.allSettled([
        this.api.list(isPlatform ? siteApiId || undefined : undefined, false),
        this.api.policy(),
      ]);
      if (generation !== this.generation || requestSequence !== this.requestSequence) return;

      let failed = false;
      if (requestsResult.status === "fulfilled") {
        this.replaceRequests(requestsResult.value ?? []);
      } else {
        this.requestsSignal.set([]);
        this.rawActivities = new Map();
        failed = true;
      }

      if (policyResult.status === "fulfilled") {
        const value = policyResult.value;
        this.policySignal.set({
          enabled: value?.enabled === true,
          approvalRequired: value?.approvalRequired === true,
          maxDaysPerWeek: this.number(value?.maxDaysPerWeek),
          halfDayAllowed: value?.halfDayAllowed === true,
          endOfDayReport: value?.endOfDayReport === true,
        });
      } else {
        this.policySignal.set({ ...EMPTY_POLICY });
        failed = true;
      }

      this.remoteLoaded.set(true);
      this.loadError.set(failed);
      if (failed) this.notifications.error("remoteWork.real.loadError", "/teletravail");
    } catch {
      if (generation === this.generation && requestSequence === this.requestSequence) {
        this.requestsSignal.set([]);
        this.rawActivities = new Map();
        this.policySignal.set({ ...EMPTY_POLICY });
        this.loadError.set(true);
        this.notifications.error("remoteWork.real.loadError", "/teletravail");
      }
    } finally {
      if (generation === this.generation && requestSequence === this.requestSequence)
        this.loading.set(false);
    }
  }

  retry(): void {
    void this.reload();
  }

  async create(input: {
    date: string;
    period: RemoteWorkPeriod;
    startTime: string;
    endTime: string;
    comment: string;
    activities: Array<{ code: string; label: string }>;
  }): Promise<boolean> {
    try {
      const siteId = this.text(this.workspace.site()?.apiId);
      if (!siteId || !input.date) throw new Error("Remote work scope unavailable");
      const payload: CreateRemoteWorkRequestApi = {
        siteId,
        date: input.date,
        period: input.period,
        startTime: this.apiTime(input.startTime),
        endTime: this.apiTime(input.endTime),
        comment: input.comment.trim() || null,
        activities: Array.isArray(input.activities) ? input.activities : [],
      };
      const created = await this.api.create(payload);
      this.upsert(created);
      await this.reload();
      return true;
    } catch {
      this.notifications.error("remoteWork.real.actionError", "/teletravail");
      return false;
    }
  }

  async decide(id: string, approved: boolean): Promise<boolean> {
    try {
      if (!id) throw new Error("Remote work request unavailable");
      const saved = await this.api.decide(id, approved);
      this.upsert(saved);
      await this.reload();
      return true;
    } catch {
      this.notifications.error("remoteWork.real.actionError", "/teletravail");
      return false;
    }
  }

  async updateActivity(activityId: string, status: RemoteActivityStatus): Promise<boolean> {
    try {
      const activity = this.activities().find((item) => item.id === activityId);
      if (!activity) throw new Error("Remote work activity unavailable");
      const saved = await this.api.updateActivity(activity.requestId, activity.id, this.apiActivityStatus(status));
      this.upsert(saved);
      return true;
    } catch {
      this.notifications.error("remoteWork.real.actionError", "/teletravail");
      return false;
    }
  }

  private replaceRequests(rows: RemoteWorkRequestApi[]): void {
    const activities = new Map<string, RemoteWorkActivity[]>();
    const mapped = (rows ?? []).map((row) => {
      const request = this.mapRequest(row);
      activities.set(request.id, this.mapActivities(row, request.id));
      return request;
    });
    this.rawActivities = activities;
    this.requestsSignal.set(mapped);
  }

  private upsert(row: RemoteWorkRequestApi): void {
    const mapped = this.mapRequest(row);
    this.rawActivities = new Map(this.rawActivities);
    this.rawActivities.set(mapped.id, this.mapActivities(row, mapped.id));
    this.requestsSignal.update((items) => {
      const index = items.findIndex((item) => item.id === mapped.id);
      if (index < 0) return [mapped, ...items];
      return items.map((item) => item.id === mapped.id ? mapped : item);
    });
  }

  private mapRequest(row: RemoteWorkRequestApi): RemoteWorkRequest {
    const activities = Array.isArray(row?.activities) ? row.activities : [];
    const siteApiId = this.text(row?.siteId);
    const siteKey = this.workspace.sites().find((site) => site.apiId === siteApiId)?.id ?? siteApiId;
    return {
      id: this.text(row?.id),
      userId: this.text(row?.authGateUserId),
      userName: this.text(row?.userDisplayName),
      roleKey: "",
      siteId: siteKey,
      date: this.text(row?.date),
      period: this.period(row?.period),
      startTime: this.time(row?.startTime),
      endTime: this.time(row?.endTime),
      status: this.status(row?.status),
      activityCount: activities.length,
      completedActivities: activities.filter((item) => this.activityStatus(item?.status) === "done").length,
      comment: this.text(row?.comment),
      approver: this.text(row?.approverDisplayName),
    };
  }

  private mapActivities(row: RemoteWorkRequestApi, requestId: string): RemoteWorkActivity[] {
    return (Array.isArray(row?.activities) ? row.activities : []).map((activity) => ({
      id: this.text(activity?.id),
      requestId,
      titleKey: this.text(activity?.label),
      typeKey: this.activityTypeKey(activity?.code),
      relatedLabel: "",
      status: this.activityStatus(activity?.status),
    }));
  }

  private activityTypeKey(code: unknown): string {
    const normalized = this.text(code).replace(/[_\s-]/g, "").toLowerCase();
    const map: Record<string, string> = {
      preparation: "remoteWork.activityTypes.preparation",
      correction: "remoteWork.activityTypes.correction",
      followup: "remoteWork.activityTypes.followUp",
      meeting: "remoteWork.activityTypes.meeting",
      admin: "remoteWork.activityTypes.admin",
      remotetraining: "remoteWork.activityTypes.remoteTraining",
    };
    return map[normalized] ?? "";
  }

  private status(value: unknown): RemoteWorkRequest["status"] {
    switch (this.text(value).toLowerCase()) {
      case "approved": return "approved";
      case "rejected": return "rejected";
      case "completed": return "completed";
      case "cancelled": return "cancelled";
      default: return "requested";
    }
  }

  private period(value: unknown): RemoteWorkPeriod {
    switch (this.text(value).replace(/[_\s-]/g, "").toLowerCase()) {
      case "morning": return "morning";
      case "afternoon": return "afternoon";
      case "custom": return "custom";
      default: return "full-day";
    }
  }

  private activityStatus(value: unknown): RemoteActivityStatus {
    switch (this.text(value).replace(/[_\s-]/g, "").toLowerCase()) {
      case "done": return "done";
      case "inprogress": return "in-progress";
      default: return "todo";
    }
  }

  private apiActivityStatus(status: RemoteActivityStatus): string {
    if (status === "in-progress") return "InProgress";
    if (status === "done") return "Done";
    return "Todo";
  }

  private time(value: unknown): string {
    const text = this.text(value);
    return /^\d{2}:\d{2}/.test(text) ? text.slice(0, 5) : "";
  }

  private apiTime(value: string): string | null {
    const text = value.trim();
    if (!text) return null;
    return /^\d{2}:\d{2}$/.test(text) ? `${text}:00` : text;
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
}
