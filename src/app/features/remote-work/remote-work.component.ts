import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { WorkforceApiService } from "../../core/workforce/workforce-api.service";
import type { RemoteWorkRequestApi } from "../../core/workforce/workforce.models";
import { RealtimeService } from "../../core/realtime/realtime.service";
import {
  REMOTE_WORK_ACTIVITIES,
  REMOTE_WORK_POLICY,
  REMOTE_WORK_REQUESTS,
  TEAM_WORK_MODE_WEEK,
} from "../../core/api-data/runtime-data.store";
import {
  RemoteWorkRequest,
  RemoteWorkStatus,
  RemoteWorkPeriod,
  RemoteActivityStatus,
  WorkMode,
} from "../../core/models/remote-work.models";

@Component({
  selector: "app-remote-work",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./remote-work.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemoteWorkComponent {
  readonly workspace = inject(WorkspaceContextService);

  readonly nextRemoteWorkDate = computed(() => {
    const upcoming = this.requests()
      .map((request: any) => request.date ?? request.startDate)
      .filter(Boolean)
      .map((value: string) => new Date(value))
      .filter(
        (date: Date) => !Number.isNaN(date.getTime()) && date >= new Date(),
      )
      .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

    return upcoming ? new Intl.DateTimeFormat("fr-FR").format(upcoming) : "—";
  });
  readonly session = inject(SessionService);
  private readonly api = inject(WorkforceApiService);
  private readonly realtime = inject(RealtimeService);
  readonly apiConnected = signal(false);
  readonly policy = signal({ ...REMOTE_WORK_POLICY });
  readonly requests = signal(REMOTE_WORK_REQUESTS.map((item) => ({ ...item })));
  readonly activities = signal(
    REMOTE_WORK_ACTIVITIES.map((item) => ({ ...item })),
  );
  readonly drawerOpen = signal(false);
  readonly selectedRequest = signal<RemoteWorkRequest | null>(null);
  readonly siteFilter = signal("all");
  readonly statusFilter = signal<"all" | RemoteWorkStatus>("all");
  readonly saved = signal(false);

  readonly isManager = computed(() => this.session.role() === "direction");
  readonly currentUserId = computed(() =>
    this.session.role() === "secretariat" ? "u2" : "u3",
  );
  readonly currentUserName = computed(() => {
    const user = this.session.session();
    return user ? `${user.firstName} ${user.lastName}` : "";
  });
  readonly currentSiteId = computed(
    () => this.workspace.site()?.id ?? "site-aftral-nice",
  );

  readonly visibleRequests = computed(() => {
    if (!this.isManager())
      return this.requests().filter(
        (item) => item.userId === this.currentUserId(),
      );
    return this.requests().filter((item) => {
      const siteOk =
        this.siteFilter() === "all" || item.siteId === this.siteFilter();
      const statusOk =
        this.statusFilter() === "all" || item.status === this.statusFilter();
      return siteOk && statusOk;
    });
  });

  readonly todayRemote = computed(
    () =>
      this.requests().filter(
        (item) => item.date === "2026-09-24" && item.status === "approved",
      ).length,
  );
  readonly pending = computed(
    () => this.requests().filter((item) => item.status === "requested").length,
  );
  readonly completedMonth = computed(
    () => this.requests().filter((item) => item.status === "completed").length,
  );
  readonly myCurrentRequest = computed(
    () =>
      this.requests().find(
        (item) =>
          item.userId === this.currentUserId() && item.date === "2026-09-24",
      ) ?? null,
  );
  readonly myActivities = computed(() => {
    const request = this.myCurrentRequest();
    return request
      ? this.activities().filter((item) => item.requestId === request.id)
      : [];
  });
  readonly activityProgress = computed(() => {
    const activities = this.myActivities();
    if (!activities.length) return 0;
    return Math.round(
      (activities.filter((item) => item.status === "done").length /
        activities.length) *
        100,
    );
  });
  readonly myCompletedActivities = computed(
    () => this.myActivities().filter((item) => item.status === "done").length,
  );
  readonly weekModes = computed(() =>
    TEAM_WORK_MODE_WEEK.filter((item) => item.siteId === this.currentSiteId()),
  );

  readonly requestForm = new FormGroup({
    date: new FormControl("2026-09-28", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    period: new FormControl<RemoteWorkPeriod>("full-day", {
      nonNullable: true,
    }),
    startTime: new FormControl("08:30", { nonNullable: true }),
    endTime: new FormControl("17:00", { nonNullable: true }),
    preparation: new FormControl(true, { nonNullable: true }),
    correction: new FormControl(true, { nonNullable: true }),
    followUp: new FormControl(false, { nonNullable: true }),
    meeting: new FormControl(false, { nonNullable: true }),
    admin: new FormControl(false, { nonNullable: true }),
    remoteTraining: new FormControl(false, { nonNullable: true }),
    comment: new FormControl("", { nonNullable: true }),
  });

  constructor() {
    void this.reloadFromApi();
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event?.typeKey.startsWith("pedagora.workforce.")) return;
      void this.reloadFromApi();
    });
  }

  private isUuid(value?: string): value is string {
    return Boolean(
      value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
    );
  }

  private backendSiteId(): string | undefined {
    const site = this.workspace.site();
    if (!site) return undefined;
    return site.apiId ?? site.id;
  }

  private mapRequest(item: RemoteWorkRequestApi): RemoteWorkRequest {
    const periodMap: Record<string, RemoteWorkPeriod> = {
      fullday: "full-day",
      morning: "morning",
      afternoon: "afternoon",
      custom: "custom",
    };
    const status = item.status.toLowerCase() as RemoteWorkStatus;
    return {
      id: item.id,
      userId: item.authGateUserId,
      userName: item.userDisplayName,
      roleKey: "common.roles.formateur",
      siteId: item.siteId,
      date: item.date,
      period: periodMap[item.period.toLowerCase()] ?? "full-day",
      startTime: item.startTime?.slice(0, 5) ?? "08:30",
      endTime: item.endTime?.slice(0, 5) ?? "17:00",
      status,
      activityCount: item.activities.length,
      completedActivities: item.activities.filter(
        (activity) => activity.status.toLowerCase() === "done",
      ).length,
      comment: item.comment ?? undefined,
      approver: item.approverDisplayName ?? undefined,
    };
  }

  private async reloadFromApi(): Promise<void> {
    const siteId = this.backendSiteId();
    if (!this.isUuid(siteId)) {
      this.apiConnected.set(false);
      return;
    }

    try {
      const rows = await this.api.list(siteId, !this.isManager());
      this.requests.set(rows.map((item) => this.mapRequest(item)));
      this.activities.set(
        rows.flatMap((item) =>
          item.activities.map((activity) => ({
            id: activity.id,
            requestId: item.id,
            titleKey: activity.label,
            typeKey: `remoteWork.activityTypes.${activity.code.toLowerCase()}`,
            status: activity.status
              .toLowerCase()
              .replace("inprogress", "in-progress") as RemoteActivityStatus,
          })),
        ),
      );
      this.apiConnected.set(true);
    } catch {
      this.apiConnected.set(false);
      // API is authoritative: no legacy mock fallback.
    }
  }

  openRequestDrawer(): void {
    this.selectedRequest.set(null);
    this.drawerOpen.set(true);
  }

  openDecisionDrawer(request: RemoteWorkRequest): void {
    this.selectedRequest.set(request);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedRequest.set(null);
  }

  async submitRequest(): Promise<void> {
    if (this.requestForm.invalid) return;
    const value = this.requestForm.getRawValue();
    const activityInputs = [
      value.preparation
        ? { code: "PREPARATION", label: "Préparation pédagogique" }
        : null,
      value.correction
        ? { code: "CORRECTION", label: "Correction des évaluations" }
        : null,
      value.followUp
        ? { code: "FOLLOW_UP", label: "Suivi des apprenants" }
        : null,
      value.meeting ? { code: "MEETING", label: "Réunion à distance" } : null,
      value.admin ? { code: "ADMIN", label: "Travaux administratifs" } : null,
      value.remoteTraining
        ? { code: "REMOTE_TRAINING", label: "Formation à distance" }
        : null,
    ].filter((item): item is { code: string; label: string } => item !== null);

    const siteId = this.backendSiteId();
    if (this.isUuid(siteId)) {
      try {
        const created = await this.api.create({
          siteId,
          date: value.date,
          period: value.period,
          startTime: value.startTime || null,
          endTime: value.endTime || null,
          comment: value.comment || null,
          activities: activityInputs,
        });
        this.requests.update((items) => [
          this.mapRequest(created),
          ...items.filter((item) => item.id !== created.id),
        ]);
        this.activities.update((items) => [
          ...created.activities.map((activity) => ({
            id: activity.id,
            requestId: created.id,
            titleKey: activity.label,
            typeKey: `remoteWork.activityTypes.${activity.code.toLowerCase()}`,
            status: activity.status
              .toLowerCase()
              .replace("inprogress", "in-progress") as RemoteActivityStatus,
          })),
          ...items,
        ]);
        this.apiConnected.set(true);
        this.saved.set(true);
        this.closeDrawer();
        window.setTimeout(() => this.saved.set(false), 1800);
        return;
      } catch {
        this.apiConnected.set(false);
      }
    }

    const activityCount = activityInputs.length;
    const next: RemoteWorkRequest = {
      id: `rw-demo-${this.requests().length + 1}`,
      userId: this.currentUserId(),
      userName: this.currentUserName(),
      roleKey:
        this.session.role() === "secretariat"
          ? "common.roles.secretariat"
          : "common.roles.formateur",
      siteId: this.currentSiteId(),
      date: value.date,
      period: value.period,
      startTime: value.startTime,
      endTime: value.endTime,
      status: this.policy().approvalRequired ? "requested" : "approved",
      activityCount,
      completedActivities: 0,
      comment: value.comment,
    };
    this.requests.update((items) => [next, ...items]);
    this.saved.set(true);
    this.closeDrawer();
    window.setTimeout(() => this.saved.set(false), 1800);
  }

  async approve(request: RemoteWorkRequest): Promise<void> {
    if (this.isUuid(request.id)) {
      try {
        const updated = await this.api.decide(request.id, true);
        this.requests.update((items) =>
          items.map((item) =>
            item.id === request.id ? this.mapRequest(updated) : item,
          ),
        );
        this.closeDrawer();
        return;
      } catch {
        await this.reloadFromApi();
      }
    }
    this.requests.update((items) =>
      items.map((item) =>
        item.id === request.id
          ? { ...item, status: "approved", approver: "Claire Berthier" }
          : item,
      ),
    );
    this.closeDrawer();
  }

  async reject(request: RemoteWorkRequest): Promise<void> {
    if (this.isUuid(request.id)) {
      try {
        const updated = await this.api.decide(request.id, false);
        this.requests.update((items) =>
          items.map((item) =>
            item.id === request.id ? this.mapRequest(updated) : item,
          ),
        );
        this.closeDrawer();
        return;
      } catch {
        await this.reloadFromApi();
      }
    }
    this.requests.update((items) =>
      items.map((item) =>
        item.id === request.id
          ? { ...item, status: "rejected", approver: "Claire Berthier" }
          : item,
      ),
    );
    this.closeDrawer();
  }

  async toggleActivity(id: string): Promise<void> {
    const activity = this.activities().find((item) => item.id === id);
    if (!activity) return;
    const nextStatus: RemoteActivityStatus =
      activity.status === "done" ? "todo" : "done";

    this.activities.update((items) =>
      items.map((item) =>
        item.id === id ? { ...item, status: nextStatus } : item,
      ),
    );

    if (this.isUuid(activity.requestId) && this.isUuid(id)) {
      try {
        await this.api.updateActivity(activity.requestId, id, nextStatus);
      } catch {
        await this.reloadFromApi();
      }
    }
  }

  setSiteFilter(event: Event): void {
    this.siteFilter.set((event.target as HTMLSelectElement).value);
  }

  setStatusFilter(event: Event): void {
    this.statusFilter.set(
      (event.target as HTMLSelectElement).value as "all" | RemoteWorkStatus,
    );
  }

  statusClass(status: RemoteWorkStatus): string {
    if (status === "approved" || status === "completed")
      return "bg-[#d8f8df] text-[#168c40]";
    if (status === "requested") return "bg-[#fff0c9] text-[#8a6100]";
    return "bg-[#ffe1df] text-[#d93434]";
  }

  activityStatusClass(status: RemoteActivityStatus): string {
    if (status === "done") return "bg-[#d8f8df] text-[#168c40]";
    if (status === "in-progress") return "bg-[#fff0c9] text-[#8a6100]";
    return "bg-[#f0f3f7] text-[#667085]";
  }

  workModeClass(mode: WorkMode): string {
    if (mode === "remote") return "bg-[#e6f2ff] text-[#2a64a2]";
    if (mode === "field") return "bg-[#fff0d6] text-[#b56700]";
    if (mode === "travel") return "bg-[#efe9ff] text-[#6f4ec7]";
    if (mode === "leave") return "bg-[#d8f8df] text-[#168c40]";
    if (mode === "absence") return "bg-[#ffe1df] text-[#d93434]";
    return "bg-[#f0f3f7] text-[#4f5d70]";
  }

  periodKey(period: RemoteWorkPeriod): string {
    return `remoteWork.periods.${period}`;
  }
}
