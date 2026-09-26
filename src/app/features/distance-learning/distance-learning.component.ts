import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { DistanceLearningApiStoreService } from "../../core/api-data/distance-learning-api-store.service";
import { TrainingSessionApiStoreService } from "../../core/api-data/training-session-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type {
  DistanceAttendanceStatus,
  DistanceInteractionType,
  DistanceModuleStatus,
  DistancePlatform,
  DistanceResourceType,
} from "../../core/models/distance-learning.models";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";

@Component({
  selector: "app-distance-learning",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./distance-learning.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistanceLearningComponent {
  readonly session = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  readonly store = inject(DistanceLearningApiStoreService);
  readonly trainingSessions = inject(TrainingSessionApiStoreService);

  readonly drawerOpen = signal(false);
  readonly selectedLiveId = signal("");
  readonly saved = signal(false);
  readonly joined = signal(false);
  readonly moduleFilter = signal<"all" | DistanceModuleStatus>("all");

  readonly isDirection = computed(() => this.session.role() === "direction");
  readonly isTrainer = computed(() => this.session.role() === "formateur");
  readonly isStudent = computed(() => this.session.role() === "stagiaire");
  readonly isSecretariat = computed(() => this.session.role() === "secretariat");
  readonly canCreate = computed(() => this.isDirection() || this.isTrainer() || this.isSecretariat());

  readonly contextSessions = this.store.sessions;
  readonly contextModules = this.store.modules;
  readonly filteredModules = computed(() => {
    const filter = this.moduleFilter();
    return this.contextModules().filter((item) => filter === "all" || item.status === filter);
  });
  readonly selectedLive = computed(() => {
    const list = this.contextSessions();
    return list.find((item) => item.id === this.selectedLiveId()) ?? list.at(0) ?? null;
  });
  readonly selectedParticipants = computed(() => this.selectedLive()?.participants ?? []);
  readonly selectedResources = computed(() => [] as Array<{ id: string; titleKey: string; type: DistanceResourceType; viewedBy: number; totalStudents: number }>);
  readonly selectedInteractions = computed(() => [] as Array<{ id: string; titleKey: string; type: DistanceInteractionType; completed: number; expected: number; successRate?: number }>);

  readonly presentCount = computed(() => this.selectedParticipants().filter((item) => item.attendance === "present").length);
  readonly lateCount = computed(() => this.selectedParticipants().filter((item) => item.attendance === "late").length);
  readonly absentCount = computed(() => this.selectedParticipants().filter((item) => item.attendance === "absent").length);
  readonly liveSessionCount = computed(() => this.contextSessions().length);
  readonly totalLiveHours = this.store.totalLiveHours;
  readonly totalAsyncHours = this.store.totalAsyncHours;
  readonly lateModuleCount = computed(() => this.contextModules().filter((item) => item.status === "late").length);
  readonly completionRate = computed(() => {
    const modules = this.contextModules();
    if (!modules.length) return 0;
    return Math.round(modules.reduce((total, item) => total + (Number.isFinite(item.progress) ? item.progress : 0), 0) / modules.length);
  });
  readonly currentSiteMetric = computed(() => ({
    siteId: this.workspace.site()?.id ?? "",
    liveHours: this.totalLiveHours(),
    asyncHours: this.totalAsyncHours(),
    activeStudents: this.workspace.cohort()?.studentCount ?? 0,
    completionRate: this.completionRate(),
    lateModules: this.lateModuleCount(),
  }));

  private readonly modalityMinutes = computed(() => {
    let remote = 0;
    let total = 0;
    for (const row of this.trainingSessions.apiSessions()) {
      const minutes = typeof row?.plannedMinutes === "number" && Number.isFinite(row.plannedMinutes) ? Math.max(row.plannedMinutes, 0) : 0;
      total += minutes;
      if (row?.modality === "remote-live" || row?.modality === "remote-async") remote += minutes;
    }
    return { remote, total };
  });
  readonly remoteShare = computed(() => {
    const metric = this.modalityMinutes();
    return metric.total > 0 ? Math.round((metric.remote / metric.total) * 100) : 0;
  });
  readonly onsiteShare = computed(() => Math.max(100 - this.remoteShare(), 0));
  readonly modalityGradient = computed(() => `conic-gradient(#2b66a4 0 ${this.onsiteShare()}%, #f5a623 ${this.onsiteShare()}% 100%)`);
  readonly trainerToCorrect = computed(() => 0);
  readonly trainerQuizzes = computed(() => 0);
  readonly lateStudentCount = computed(() =>
    this.contextModules()
      .filter((item) => item.status === "late")
      .reduce((total, item) => total + Math.max(item.expectedStudents - item.completedStudents, 0), 0),
  );
  readonly studentDueThisWeek = computed(() => {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.contextModules().filter((item) => {
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(item.dueDate);
      if (!match) return false;
      const due = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 23, 59, 59);
      return due >= now && due <= end;
    }).length;
  });
  readonly studentRemoteHours = computed(() => Math.round(this.modalityMinutes().remote / 60));
  readonly siteMetrics = computed(() => [{
    name: this.workspace.site()?.name ?? "",
    live: this.totalLiveHours(),
    async: this.totalAsyncHours(),
    students: this.currentSiteMetric().activeStudents,
    completion: this.completionRate(),
    late: this.lateModuleCount(),
  }]);

  readonly createForm = new FormGroup({
    kind: new FormControl<"live" | "async">("live", { nonNullable: true }),
    title: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    start: new FormControl("", { nonNullable: true }),
    end: new FormControl("", { nonNullable: true }),
    platform: new FormControl<DistancePlatform>("teams", { nonNullable: true }),
    joinUrl: new FormControl("", { nonNullable: true }),
    estimatedMinutes: new FormControl(0, { nonNullable: true }),
    dueDate: new FormControl("", { nonNullable: true }),
  });

  openCreateDrawer(): void { this.drawerOpen.set(true); }
  closeDrawer(): void { this.drawerOpen.set(false); }

  async createDistanceItem(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const value = this.createForm.getRawValue();
    if (value.kind === "live") {
      const created = await this.store.createLive(value);
      if (!created) return;
      this.selectedLiveId.set(created.id);
    } else {
      const created = await this.store.createModule(value);
      if (!created) return;
    }
    this.drawerOpen.set(false);
    this.saved.set(true);
    this.createForm.controls.title.setValue("");
    window.setTimeout(() => this.saved.set(false), 1800);
  }

  selectLive(sessionId: string): void { this.selectedLiveId.set(sessionId ?? ""); }

  simulateJoin(): void {
    const session = this.selectedLive();
    if (!session) return;
    const url = this.store.rawJoinUrl(session.id);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    this.joined.set(true);
    window.setTimeout(() => this.joined.set(false), 1800);
  }

  async cycleAttendance(participantId: string): Promise<void> {
    const activeSession = this.selectedLive();
    if (!activeSession) return;
    await this.store.cycleAttendance(activeSession.id, participantId ?? "");
  }

  async toggleModuleStep(moduleId: string, stepId: string): Promise<void> {
    await this.store.toggleModuleStep(moduleId ?? "", stepId ?? "");
  }

  updateModuleFilter(event: Event): void {
    this.moduleFilter.set(((event.target as HTMLSelectElement)?.value ?? "all") as "all" | DistanceModuleStatus);
  }

  currentUserName(): string {
    const user = this.session.session();
    return user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "";
  }

  moduleStatusClass(status: DistanceModuleStatus): string {
    if (status === "completed") return "bg-[#d8f8df] text-[#168c40]";
    if (status === "in-progress") return "bg-[#e6f2ff] text-[#2a64a2]";
    if (status === "late") return "bg-[#ffe1df] text-[#d93434]";
    return "bg-[#f0f3f7] text-[#667085]";
  }

  attendanceClass(status: DistanceAttendanceStatus): string {
    if (status === "present") return "bg-[#d8f8df] text-[#168c40]";
    if (status === "late") return "bg-[#fff0c9] text-[#8a6100]";
    if (status === "disconnected") return "bg-[#e6f2ff] text-[#2a64a2]";
    return "bg-[#ffe1df] text-[#d93434]";
  }

  sessionStatusClass(status: "scheduled" | "live" | "closed"): string {
    if (status === "live") return "bg-[#ffe1df] text-[#d93434]";
    if (status === "closed") return "bg-[#d8f8df] text-[#168c40]";
    return "bg-[#e6f2ff] text-[#2a64a2]";
  }

  resourceIcon(type: DistanceResourceType): string {
    if (type === "video") return "ph-play-circle";
    if (type === "exercise") return "ph-pencil-line";
    if (type === "link") return "ph-link";
    return "ph-file-text";
  }

  interactionIcon(type: DistanceInteractionType): string {
    if (type === "quiz") return "ph-check-square";
    if (type === "poll") return "ph-chart-bar";
    if (type === "exercise") return "ph-users-three";
    return "ph-question";
  }

  formatMinutes(minutes: number): string {
    const safe = Number.isFinite(minutes) ? Math.max(minutes, 0) : 0;
    const hours = Math.floor(safe / 60);
    const rest = safe % 60;
    if (!hours) return `${rest} min`;
    return rest ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
  }
}
