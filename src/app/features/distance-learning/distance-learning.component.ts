import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import {
  DISTANCE_ASYNC_MODULES,
  DISTANCE_INTERACTIONS,
  DISTANCE_LIVE_SESSIONS,
  DISTANCE_RESOURCES,
  DISTANCE_SITE_METRICS,
  type DistanceAsyncModule,
  type DistanceAttendanceStatus,
  type DistanceInteractionType,
  type DistanceLiveSession,
  type DistanceModuleStatus,
  type DistancePlatform,
  type DistanceResourceType,
} from "../../core/mock-data/distance-learning.mock";

@Component({
  selector: "app-distance-learning",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./distance-learning.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistanceLearningComponent {
  readonly session = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);

  readonly sessions = signal(DISTANCE_LIVE_SESSIONS.map((item) => ({
    ...item,
    participants: item.participants.map((participant) => ({ ...participant })),
  })));
  readonly modules = signal(DISTANCE_ASYNC_MODULES.map((item) => ({
    ...item,
    steps: item.steps.map((step) => ({ ...step })),
  })));

  readonly drawerOpen = signal(false);
  readonly selectedLiveId = signal("dl-live-ecsr-1");
  readonly saved = signal(false);
  readonly joined = signal(false);
  readonly moduleFilter = signal<"all" | DistanceModuleStatus>("all");

  readonly isDirection = computed(() => this.session.role() === "direction");
  readonly isTrainer = computed(() => this.session.role() === "formateur");
  readonly isStudent = computed(() => this.session.role() === "stagiaire");
  readonly isSecretariat = computed(() => this.session.role() === "secretariat");
  readonly canCreate = computed(() => this.isDirection() || this.isTrainer() || this.isSecretariat());

  readonly contextSessions = computed<DistanceLiveSession[]>(() => {
    const cohort = this.workspace.cohort();
    const site = this.workspace.site();
    const program = this.workspace.program();
    if (!cohort || !site || !program) return [];
    const matches = this.sessions().filter((item) => item.cohortId === cohort.id);
    if (matches.length) return matches;
    return [{
      id: `dl-generated-${cohort.id}`,
      organizationId: site.organizationId,
      siteId: site.id,
      programId: program.id,
      cohortId: cohort.id,
      titleKey: "distanceLearning.demo.sessions.genericTheory",
      trainer: "Marc Dupont",
      date: cohort.status === "planned" ? "15/01/2027" : "25/09/2026",
      start: "09:00",
      end: "11:00",
      platform: "teams",
      joinUrl: "https://teams.microsoft.com/l/meetup-join/demo-generic",
      status: "scheduled",
      expected: cohort.studentCount,
      objectivesKey: "distanceLearning.demo.sessions.genericObjectives",
      participants: [],
      resourceIds: [],
      interactionIds: [],
    }];
  });

  readonly contextModules = computed<DistanceAsyncModule[]>(() => {
    const cohort = this.workspace.cohort();
    const site = this.workspace.site();
    const program = this.workspace.program();
    if (!cohort || !site || !program) return [];
    const matches = this.modules().filter((item) => item.cohortId === cohort.id);
    if (matches.length) return matches;
    return [{
      id: `dam-generated-${cohort.id}`,
      organizationId: site.organizationId,
      siteId: site.id,
      programId: program.id,
      cohortId: cohort.id,
      titleKey: "distanceLearning.demo.modules.generic",
      descriptionKey: "distanceLearning.demo.modules.genericDescription",
      estimatedMinutes: 90,
      dueDate: cohort.status === "planned" ? "22/01/2027" : "30/09/2026",
      trainer: "Claire Berthier",
      status: "not-started",
      progress: 0,
      completedStudents: 0,
      expectedStudents: cohort.studentCount,
      steps: [
        { id: "s1", labelKey: "distanceLearning.steps.readCourse", completed: false },
        { id: "s2", labelKey: "distanceLearning.steps.watchVideo", completed: false },
        { id: "s3", labelKey: "distanceLearning.steps.exercise", completed: false },
        { id: "s4", labelKey: "distanceLearning.steps.quiz", completed: false },
      ],
    }];
  });

  readonly filteredModules = computed(() => {
    const filter = this.moduleFilter();
    return this.contextModules().filter((item) => filter === "all" || item.status === filter);
  });

  readonly selectedLive = computed(() => {
    const list = this.contextSessions();
    return list.find((item) => item.id === this.selectedLiveId()) ?? list[0] ?? null;
  });

  readonly selectedParticipants = computed(() => this.selectedLive()?.participants ?? []);
  readonly selectedResources = computed(() => {
    const session = this.selectedLive();
    return session ? DISTANCE_RESOURCES.filter((item) => session.resourceIds.includes(item.id)) : [];
  });
  readonly selectedInteractions = computed(() => {
    const session = this.selectedLive();
    return session ? DISTANCE_INTERACTIONS.filter((item) => session.interactionIds.includes(item.id)) : [];
  });

  readonly presentCount = computed(() =>
    this.selectedParticipants().filter((item) => item.attendance === "present").length,
  );
  readonly lateCount = computed(() =>
    this.selectedParticipants().filter((item) => item.attendance === "late").length,
  );
  readonly absentCount = computed(() =>
    this.selectedParticipants().filter((item) => item.attendance === "absent").length,
  );

  readonly currentSiteMetric = computed(() => {
    const siteId = this.workspace.site()?.id;
    return DISTANCE_SITE_METRICS.find((item) => item.siteId === siteId) ?? {
      siteId: siteId ?? "",
      liveHours: 36,
      asyncHours: 18,
      activeStudents: this.workspace.cohort()?.studentCount ?? 0,
      completionRate: 79,
      lateModules: 3,
    };
  });

  readonly liveSessionCount = computed(() => this.contextSessions().length);
  readonly totalLiveHours = computed(() => this.currentSiteMetric().liveHours);
  readonly totalAsyncHours = computed(() => this.currentSiteMetric().asyncHours);
  readonly lateModuleCount = computed(() => this.contextModules().filter((item) => item.status === "late").length);
  readonly completionRate = computed(() => {
    const modules = this.contextModules();
    if (!modules.length) return 0;
    return Math.round(modules.reduce((total, item) => total + item.progress, 0) / modules.length);
  });

  readonly createForm = new FormGroup({
    kind: new FormControl<"live" | "async">("live", { nonNullable: true }),
    title: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl("2026-09-28", { nonNullable: true, validators: [Validators.required] }),
    start: new FormControl("09:00", { nonNullable: true }),
    end: new FormControl("12:00", { nonNullable: true }),
    platform: new FormControl<DistancePlatform>("teams", { nonNullable: true }),
    joinUrl: new FormControl("", { nonNullable: true }),
    estimatedMinutes: new FormControl(90, { nonNullable: true }),
    dueDate: new FormControl("2026-10-02", { nonNullable: true }),
  });

  openCreateDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  createDistanceItem(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const value = this.createForm.getRawValue();
    const organization = this.workspace.organization();
    const site = this.workspace.site();
    const program = this.workspace.program();
    const cohort = this.workspace.cohort();
    if (!organization || !site || !program || !cohort) return;

    if (value.kind === "live") {
      const created: DistanceLiveSession = {
        id: `dl-live-${Date.now()}`,
        organizationId: organization.id,
        siteId: site.id,
        programId: program.id,
        cohortId: cohort.id,
        titleKey: value.title.trim(),
        trainer: this.currentUserName(),
        date: value.date.split("-").reverse().join("/"),
        start: value.start,
        end: value.end,
        platform: value.platform,
        joinUrl: value.joinUrl || "https://example.invalid/classroom",
        status: "scheduled",
        expected: cohort.studentCount,
        objectivesKey: "distanceLearning.demo.sessions.genericObjectives",
        participants: [],
        resourceIds: [],
        interactionIds: [],
      };
      this.sessions.update((items) => [created, ...items]);
      this.selectedLiveId.set(created.id);
    } else {
      const created: DistanceAsyncModule = {
        id: `dam-${Date.now()}`,
        organizationId: organization.id,
        siteId: site.id,
        programId: program.id,
        cohortId: cohort.id,
        titleKey: value.title.trim(),
        descriptionKey: "distanceLearning.demo.modules.genericDescription",
        estimatedMinutes: value.estimatedMinutes,
        dueDate: value.dueDate.split("-").reverse().join("/"),
        trainer: this.currentUserName(),
        status: "not-started",
        progress: 0,
        completedStudents: 0,
        expectedStudents: cohort.studentCount,
        steps: [
          { id: "s1", labelKey: "distanceLearning.steps.readCourse", completed: false },
          { id: "s2", labelKey: "distanceLearning.steps.watchVideo", completed: false },
          { id: "s3", labelKey: "distanceLearning.steps.exercise", completed: false },
          { id: "s4", labelKey: "distanceLearning.steps.quiz", completed: false },
        ],
      };
      this.modules.update((items) => [created, ...items]);
    }

    this.drawerOpen.set(false);
    this.saved.set(true);
    this.createForm.controls.title.setValue("");
    window.setTimeout(() => this.saved.set(false), 1800);
  }

  selectLive(sessionId: string): void {
    this.selectedLiveId.set(sessionId);
  }

  simulateJoin(): void {
    this.joined.set(true);
    window.setTimeout(() => this.joined.set(false), 1800);
  }

  cycleAttendance(participantId: string): void {
    const activeSession = this.selectedLive();
    if (!activeSession) return;
    const order: DistanceAttendanceStatus[] = ["present", "late", "disconnected", "absent"];
    this.sessions.update((sessions) => sessions.map((item) => {
      if (item.id !== activeSession.id) return item;
      return {
        ...item,
        participants: item.participants.map((participant) => {
          if (participant.id !== participantId) return participant;
          const index = order.indexOf(participant.attendance);
          return { ...participant, attendance: order[(index + 1) % order.length] };
        }),
      };
    }));
  }

  toggleModuleStep(moduleId: string, stepId: string): void {
    this.modules.update((items) => items.map((item) => {
      if (item.id !== moduleId) return item;
      const steps = item.steps.map((step) => step.id === stepId ? { ...step, completed: !step.completed } : step);
      const done = steps.filter((step) => step.completed).length;
      const progress = Math.round((done / Math.max(steps.length, 1)) * 100);
      return {
        ...item,
        steps,
        progress,
        status: progress === 100 ? "completed" : progress > 0 ? "in-progress" : "not-started",
      };
    }));
  }

  updateModuleFilter(event: Event): void {
    this.moduleFilter.set((event.target as HTMLSelectElement).value as "all" | DistanceModuleStatus);
  }

  currentUserName(): string {
    const user = this.session.session();
    return user ? `${user.firstName} ${user.lastName}` : "Formateur";
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

  sessionStatusClass(status: DistanceLiveSession["status"]): string {
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
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (!hours) return `${rest} min`;
    return rest ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
  }
}
