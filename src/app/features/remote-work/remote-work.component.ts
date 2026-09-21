import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from "@angular/forms";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import {
  REMOTE_WORK_ACTIVITIES,
  REMOTE_WORK_POLICY,
  REMOTE_WORK_REQUESTS,
  TEAM_WORK_MODE_WEEK,
  type RemoteActivityStatus,
  type RemoteWorkPeriod,
  type RemoteWorkRequest,
  type RemoteWorkStatus,
  type WorkMode,
} from "../../core/mock-data/remote-work.mock";

@Component({
  selector: "app-remote-work",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./remote-work.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemoteWorkComponent {
  readonly session = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  readonly policy = signal({ ...REMOTE_WORK_POLICY });
  readonly requests = signal(REMOTE_WORK_REQUESTS.map((item) => ({ ...item })));
  readonly activities = signal(REMOTE_WORK_ACTIVITIES.map((item) => ({ ...item })));
  readonly drawerOpen = signal(false);
  readonly selectedRequest = signal<RemoteWorkRequest | null>(null);
  readonly siteFilter = signal("all");
  readonly statusFilter = signal<"all" | RemoteWorkStatus>("all");
  readonly saved = signal(false);

  readonly isManager = computed(() => this.session.role() === "direction");
  readonly currentUserId = computed(() => this.session.role() === "secretariat" ? "u2" : "u3");
  readonly currentUserName = computed(() => {
    const user = this.session.session();
    return user ? `${user.firstName} ${user.lastName}` : "";
  });
  readonly currentSiteId = computed(() => this.workspace.site()?.id ?? "site-aftral-nice");

  readonly visibleRequests = computed(() => {
    if (!this.isManager()) return this.requests().filter((item) => item.userId === this.currentUserId());
    return this.requests().filter((item) => {
      const siteOk = this.siteFilter() === "all" || item.siteId === this.siteFilter();
      const statusOk = this.statusFilter() === "all" || item.status === this.statusFilter();
      return siteOk && statusOk;
    });
  });

  readonly todayRemote = computed(() => this.requests().filter((item) => item.date === "2026-09-24" && item.status === "approved").length);
  readonly pending = computed(() => this.requests().filter((item) => item.status === "requested").length);
  readonly completedMonth = computed(() => this.requests().filter((item) => item.status === "completed").length);
  readonly myCurrentRequest = computed(() => this.requests().find((item) => item.userId === this.currentUserId() && item.date === "2026-09-24") ?? null);
  readonly myActivities = computed(() => {
    const request = this.myCurrentRequest();
    return request ? this.activities().filter((item) => item.requestId === request.id) : [];
  });
  readonly activityProgress = computed(() => {
    const activities = this.myActivities();
    if (!activities.length) return 0;
    return Math.round((activities.filter((item) => item.status === "done").length / activities.length) * 100);
  });
  readonly myCompletedActivities = computed(() =>
    this.myActivities().filter((item) => item.status === "done").length,
  );
  readonly weekModes = computed(() => TEAM_WORK_MODE_WEEK.filter((item) => item.siteId === this.currentSiteId()));

  readonly requestForm = new FormGroup({
    date: new FormControl("2026-09-28", { nonNullable: true, validators: [Validators.required] }),
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

  submitRequest(): void {
    if (this.requestForm.invalid) return;
    const value = this.requestForm.getRawValue();
    const activityCount = [value.preparation, value.correction, value.followUp, value.meeting, value.admin, value.remoteTraining].filter(Boolean).length;
    const next: RemoteWorkRequest = {
      id: `rw-demo-${this.requests().length + 1}`,
      userId: this.currentUserId(),
      userName: this.currentUserName(),
      roleKey: this.session.role() === "secretariat" ? "common.roles.secretariat" : "common.roles.formateur",
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

  approve(request: RemoteWorkRequest): void {
    this.requests.update((items) => items.map((item) => item.id === request.id ? { ...item, status: "approved", approver: "Claire Berthier" } : item));
    this.closeDrawer();
  }

  reject(request: RemoteWorkRequest): void {
    this.requests.update((items) => items.map((item) => item.id === request.id ? { ...item, status: "rejected", approver: "Claire Berthier" } : item));
    this.closeDrawer();
  }

  toggleActivity(id: string): void {
    this.activities.update((items) => items.map((item) => item.id === id ? { ...item, status: item.status === "done" ? "todo" : "done" } : item));
  }

  setSiteFilter(event: Event): void {
    this.siteFilter.set((event.target as HTMLSelectElement).value);
  }

  setStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as "all" | RemoteWorkStatus);
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
}
