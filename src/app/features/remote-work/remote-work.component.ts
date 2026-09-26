import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from "@angular/forms";
import { RemoteWorkApiStoreService } from "../../core/api-data/remote-work-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type {
  RemoteActivityStatus,
  RemoteWorkPeriod,
  RemoteWorkRequest,
  RemoteWorkStatus,
  WorkMode,
  TeamWorkModeDay,
} from "../../core/models/remote-work.models";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";

@Component({
  selector: "app-remote-work",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./remote-work.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemoteWorkComponent {
  readonly session = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  private readonly store = inject(RemoteWorkApiStoreService);
  readonly policy = this.store.policy;
  readonly requests = this.store.requests;
  readonly activities = this.store.activities;
  readonly drawerOpen = signal(false);
  readonly selectedRequest = signal<RemoteWorkRequest | null>(null);
  readonly siteFilter = signal("all");
  readonly statusFilter = signal<"all" | RemoteWorkStatus>("all");
  readonly saved = signal(false);

  readonly isManager = computed(() => this.session.role() === "direction");
  readonly currentUserId = computed(() => this.session.session()?.userId ?? "");
  readonly currentSiteId = computed(() => this.workspace.site()?.id ?? "");
  readonly siteFilterOptions = computed(() => this.workspace.sites());
  readonly today = computed(() => this.localIsoDate(new Date()));

  readonly visibleRequests = computed(() => {
    if (!this.isManager()) {
      const userId = this.currentUserId();
      return userId ? this.requests().filter((item) => item.userId === userId) : [];
    }
    return this.requests().filter((item) => {
      const siteOk = this.siteFilter() === "all" || item.siteId === this.siteFilter();
      const statusOk = this.statusFilter() === "all" || item.status === this.statusFilter();
      return siteOk && statusOk;
    });
  });

  readonly todayRemote = computed(() =>
    this.requests().filter(
      (item) => item.date === this.today() && (item.status === "approved" || item.status === "completed"),
    ).length,
  );
  readonly pending = computed(() => this.requests().filter((item) => item.status === "requested").length);
  readonly onsiteCount = computed(() => 0);
  readonly absentCount = computed(() => 0);
  readonly completedMonth = computed(() => {
    const userId = this.currentUserId();
    const month = this.today().slice(0, 7);
    if (!userId || !month) return 0;
    return this.requests().filter(
      (item) =>
        item.userId === userId &&
        item.date.startsWith(month) &&
        (item.status === "approved" || item.status === "completed"),
    ).length;
  });
  readonly myCurrentRequest = computed(() => {
    const userId = this.currentUserId();
    return userId
      ? this.requests().find((item) => item.userId === userId && item.date === this.today()) ?? null
      : null;
  });
  readonly employeeStatusKey = computed(() => {
    const status = this.myCurrentRequest()?.status ?? "";
    return status ? `remoteWork.status.${status}` : "";
  });
  readonly nextRequestDate = computed(() => {
    const userId = this.currentUserId();
    const today = this.today();
    if (!userId || !today) return "";
    return this.requests()
      .filter(
        (item) =>
          item.userId === userId &&
          item.date >= today &&
          (item.status === "requested" || item.status === "approved"),
      )
      .map((item) => item.date)
      .sort((a, b) => a.localeCompare(b))[0] ?? "";
  });
  readonly myActivities = computed(() => {
    const request = this.myCurrentRequest();
    return request ? this.activities().filter((item) => item.requestId === request.id) : [];
  });
  readonly activityProgress = computed(() => {
    const activities = this.myActivities();
    if (!activities.length) return 0;
    return Math.round((activities.filter((item) => item.status === "done").length / activities.length) * 100);
  });
  readonly myCompletedActivities = computed(() => this.myActivities().filter((item) => item.status === "done").length);
  readonly weekModes = computed<TeamWorkModeDay[]>(() => []);

  readonly requestForm = new FormGroup({
    date: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    period: new FormControl<RemoteWorkPeriod>("full-day", { nonNullable: true }),
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

  openRequestDrawer(): void {
    this.selectedRequest.set(null);
    this.requestForm.patchValue({ date: "", comment: "" });
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
    const activities = [
      value.preparation ? { code: "PREPARATION", label: "remoteWork.activityTypes.preparation" } : null,
      value.correction ? { code: "CORRECTION", label: "remoteWork.activityTypes.correction" } : null,
      value.followUp ? { code: "FOLLOW_UP", label: "remoteWork.activityTypes.followUp" } : null,
      value.meeting ? { code: "MEETING", label: "remoteWork.activityTypes.meeting" } : null,
      value.admin ? { code: "ADMIN", label: "remoteWork.activityTypes.admin" } : null,
      value.remoteTraining ? { code: "REMOTE_TRAINING", label: "remoteWork.activityTypes.remoteTraining" } : null,
    ].filter((item): item is { code: string; label: string } => item !== null);

    const ok = await this.store.create({
      date: value.date,
      period: value.period,
      startTime: value.startTime,
      endTime: value.endTime,
      comment: value.comment,
      activities,
    });
    if (!ok) return;
    this.saved.set(true);
    this.closeDrawer();
    window.setTimeout(() => this.saved.set(false), 1800);
  }

  async approve(request: RemoteWorkRequest): Promise<void> {
    if (await this.store.decide(request.id, true)) this.closeDrawer();
  }

  async reject(request: RemoteWorkRequest): Promise<void> {
    if (await this.store.decide(request.id, false)) this.closeDrawer();
  }

  async toggleActivity(id: string): Promise<void> {
    const activity = this.activities().find((item) => item.id === id);
    if (!activity) return;
    const status: RemoteActivityStatus = activity.status === "done" ? "todo" : "done";
    await this.store.updateActivity(id, status);
  }

  setSiteFilter(event: Event): void {
    this.siteFilter.set((event.target as HTMLSelectElement).value || "all");
  }

  setStatusFilter(event: Event): void {
    this.statusFilter.set(((event.target as HTMLSelectElement).value || "all") as "all" | RemoteWorkStatus);
  }

  statusClass(status: RemoteWorkStatus): string {
    if (status === "approved" || status === "completed") return "bg-[#d8f8df] text-[#168c40]";
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

  private localIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
