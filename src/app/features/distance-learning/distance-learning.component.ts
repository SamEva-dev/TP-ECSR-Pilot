import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { DistanceLearningApiService } from "../../core/distance-learning/distance-learning-api.service";
import type {
  AsyncLearningModuleApi,
  DistanceLearningSessionApi,
} from "../../core/distance-learning/distance-learning.models";
import { RealtimeService } from "../../core/realtime/realtime.service";
import {
  DISTANCE_ASYNC_MODULES,
  DISTANCE_INTERACTIONS,
  DISTANCE_LIVE_SESSIONS,
  DISTANCE_RESOURCES,
  DISTANCE_SITE_METRICS,
} from "../../core/api-data/runtime-data.store";
import type {
  DistanceAsyncModule,
  DistanceAttendanceStatus,
  DistanceInteractionType,
  DistanceLiveSession,
  DistanceModuleStatus,
  DistancePlatform,
  DistanceResourceType,
} from "../../core/models/distance-learning.models";

@Component({
  selector: "app-distance-learning",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./distance-learning.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistanceLearningComponent {
  readonly session = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  private readonly api = inject(DistanceLearningApiService);
  private readonly realtime = inject(RealtimeService);
  readonly apiConnected = signal(false);

  readonly sessions = signal(
    DISTANCE_LIVE_SESSIONS.map((item) => ({
      ...item,
      participants: item.participants.map((participant) => ({
        ...participant,
      })),
    })),
  );
  readonly modules = signal(
    DISTANCE_ASYNC_MODULES.map((item) => ({
      ...item,
      steps: item.steps.map((step) => ({ ...step })),
    })),
  );

  readonly drawerOpen = signal(false);
  readonly selectedLiveId = signal("dl-live-ecsr-1");
  readonly saved = signal(false);
  readonly joined = signal(false);
  readonly moduleFilter = signal<"all" | DistanceModuleStatus>("all");

  readonly isDirection = computed(() => this.session.role() === "direction");
  readonly isTrainer = computed(() => this.session.role() === "formateur");
  readonly isStudent = computed(() => this.session.role() === "stagiaire");
  readonly isSecretariat = computed(
    () => this.session.role() === "secretariat",
  );
  readonly canCreate = computed(
    () => this.isDirection() || this.isTrainer() || this.isSecretariat(),
  );

  readonly contextSessions = computed<DistanceLiveSession[]>(() => {
    const cohort = this.workspace.cohort();
    const site = this.workspace.site();
    const program = this.workspace.program();
    if (!cohort || !site || !program) return [];
    const matches = this.sessions().filter(
      (item) => item.cohortId === cohort.id,
    );
    if (matches.length) return matches;
    return [
      {
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
      },
    ];
  });

  readonly contextModules = computed<DistanceAsyncModule[]>(() => {
    const cohort = this.workspace.cohort();
    const site = this.workspace.site();
    const program = this.workspace.program();
    if (!cohort || !site || !program) return [];
    const matches = this.modules().filter(
      (item) => item.cohortId === cohort.id,
    );
    if (matches.length) return matches;
    return [
      {
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
          {
            id: "s1",
            labelKey: "distanceLearning.steps.readCourse",
            completed: false,
          },
          {
            id: "s2",
            labelKey: "distanceLearning.steps.watchVideo",
            completed: false,
          },
          {
            id: "s3",
            labelKey: "distanceLearning.steps.exercise",
            completed: false,
          },
          {
            id: "s4",
            labelKey: "distanceLearning.steps.quiz",
            completed: false,
          },
        ],
      },
    ];
  });

  readonly filteredModules = computed(() => {
    const filter = this.moduleFilter();
    return this.contextModules().filter(
      (item) => filter === "all" || item.status === filter,
    );
  });

  readonly selectedLive = computed<DistanceLiveSession | null>(() => {
    const list = this.contextSessions();
    return (
      list.find((item) => item.id === this.selectedLiveId()) ?? list[0] ?? null
    );
  });

  readonly selectedParticipants = computed(
    () => this.selectedLive()?.participants ?? [],
  );
  readonly selectedResources = computed(() => {
    const session = this.selectedLive();
    return session
      ? DISTANCE_RESOURCES.filter((item) =>
          session.resourceIds.includes(item.id),
        )
      : [];
  });
  readonly selectedInteractions = computed(() => {
    const session = this.selectedLive();
    return session
      ? DISTANCE_INTERACTIONS.filter((item) =>
          session.interactionIds.includes(item.id),
        )
      : [];
  });

  readonly presentCount = computed(
    () =>
      this.selectedParticipants().filter(
        (item) => item.attendance === "present",
      ).length,
  );
  readonly lateCount = computed(
    () =>
      this.selectedParticipants().filter((item) => item.attendance === "late")
        .length,
  );
  readonly absentCount = computed(
    () =>
      this.selectedParticipants().filter((item) => item.attendance === "absent")
        .length,
  );

  readonly currentSiteMetric = computed(() => {
    const siteId = this.workspace.site()?.id;
    return (
      DISTANCE_SITE_METRICS.find((item) => item.siteId === siteId) ?? {
        siteId: siteId ?? "",
        liveHours: 36,
        asyncHours: 18,
        activeStudents: this.workspace.cohort()?.studentCount ?? 0,
        completionRate: 79,
        lateModules: 3,
      }
    );
  });

  readonly liveSessionCount = computed(() => this.contextSessions().length);
  readonly totalLiveHours = computed(() => this.currentSiteMetric().liveHours);
  readonly totalAsyncHours = computed(
    () => this.currentSiteMetric().asyncHours,
  );
  readonly lateModuleCount = computed(
    () => this.contextModules().filter((item) => item.status === "late").length,
  );
  readonly completionRate = computed(() => {
    const modules = this.contextModules();
    if (!modules.length) return 0;
    return Math.round(
      modules.reduce((total, item) => total + item.progress, 0) /
        modules.length,
    );
  });

  readonly createForm = new FormGroup({
    kind: new FormControl<"live" | "async">("live", { nonNullable: true }),
    title: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    date: new FormControl("2026-09-28", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    start: new FormControl("09:00", { nonNullable: true }),
    end: new FormControl("12:00", { nonNullable: true }),
    platform: new FormControl<DistancePlatform>("teams", { nonNullable: true }),
    joinUrl: new FormControl("", { nonNullable: true }),
    estimatedMinutes: new FormControl(90, { nonNullable: true }),
    dueDate: new FormControl("2026-10-02", { nonNullable: true }),
  });

  constructor() {
    void this.reloadFromApi();
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event?.typeKey.startsWith("pedagora.distance.")) return;
      void this.reloadFromApi();
    });
  }

  private backendId(
    value: { id: string; apiId?: string } | null,
  ): string | undefined {
    if (!value) return undefined;
    return value.apiId ?? value.id;
  }

  private isUuid(value?: string): value is string {
    return Boolean(
      value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
    );
  }

  private async reloadFromApi(): Promise<void> {
    const cohort = this.workspace.cohort();
    if (!cohort) return;

    const cohortId =
      (cohort as typeof cohort & { apiId?: string }).apiId ?? cohort.id;
    if (!this.isUuid(cohortId)) {
      this.apiConnected.set(false);
      return;
    }

    try {
      const [sessions, modules] = await Promise.all([
        this.api.sessions(cohortId),
        this.api.modules(cohortId),
      ]);
      this.sessions.set(sessions.map((item) => this.mapSession(item)));
      this.modules.set(modules.map((item) => this.mapModule(item)));
      const first = this.sessions()[0];
      if (first) this.selectedLiveId.set(first.id);
      this.apiConnected.set(true);
    } catch {
      this.apiConnected.set(false);
      // API is authoritative: no legacy mock fallback.
    }
  }

  private mapSession(item: DistanceLearningSessionApi): DistanceLiveSession {
    const starts = new Date(item.startsAtUtc);
    const ends = new Date(item.endsAtUtc);
    const status =
      item.status.toLowerCase() === "live"
        ? "live"
        : item.status.toLowerCase() === "scheduled"
          ? "scheduled"
          : "closed";

    return {
      id: item.id,
      organizationId: item.organizationId,
      siteId: item.siteId,
      programId: item.programId,
      cohortId: item.cohortId,
      titleKey: item.title,
      trainer: item.trainerDisplayName,
      date: starts.toLocaleDateString("fr-FR"),
      start: starts.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      end: ends.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      platform: item.platform.toLowerCase() as DistancePlatform,
      joinUrl: item.joinUrl,
      status,
      expected: item.participants.length,
      objectivesKey:
        item.objectives ?? "distanceLearning.demo.sessions.genericObjectives",
      participants: item.participants.map((participant) => ({
        id: participant.id,
        studentId: participant.enrollmentId,
        name: participant.displayName,
        attendance:
          participant.attendance.toLowerCase() as DistanceAttendanceStatus,
        connectedAt: participant.connectedAtUtc ?? undefined,
        disconnectedAt: participant.disconnectedAtUtc ?? undefined,
        connectedMinutes: participant.connectedMinutes,
        participation: participant.participationPercent,
        completedActivities: participant.completedActivities,
        activityCount: participant.activityCount,
      })),
      resourceIds: [],
      interactionIds: [],
    };
  }

  private mapModule(item: AsyncLearningModuleApi): DistanceAsyncModule {
    const statusMap: Record<string, DistanceModuleStatus> = {
      notstarted: "not-started",
      inprogress: "in-progress",
      completed: "completed",
      late: "late",
      archived: "completed",
    };

    return {
      id: item.id,
      organizationId: item.organizationId,
      siteId: item.siteId,
      programId: item.programId,
      cohortId: item.cohortId,
      titleKey: item.title,
      descriptionKey:
        item.description ?? "distanceLearning.demo.modules.genericDescription",
      estimatedMinutes: item.estimatedMinutes,
      dueDate: new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("fr-FR"),
      trainer: item.trainerDisplayName,
      status: statusMap[item.status.toLowerCase()] ?? "not-started",
      progress: item.progressPercent,
      completedStudents: item.completedStudents,
      expectedStudents: item.expectedStudents,
      score: item.averageScore ?? undefined,
      steps: item.steps.map((step) => ({
        id: step.id,
        labelKey: step.label,
        completed: false,
      })),
    };
  }

  openCreateDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  async createDistanceItem(): Promise<void> {
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

    const siteId = this.backendId(site);
    const programId = this.backendId(program);
    const cohortId =
      (cohort as typeof cohort & { apiId?: string }).apiId ?? cohort.id;

    if (
      this.isUuid(siteId) &&
      this.isUuid(programId) &&
      this.isUuid(cohortId)
    ) {
      try {
        if (value.kind === "live") {
          const created = await this.api.createSession({
            siteId,
            programId,
            cohortId,
            title: value.title.trim(),
            trainerDisplayName: this.currentUserName(),
            startsAtUtc: new Date(
              `${value.date}T${value.start}:00`,
            ).toISOString(),
            endsAtUtc: new Date(`${value.date}T${value.end}:00`).toISOString(),
            platform: value.platform,
            joinUrl: value.joinUrl || "https://example.invalid/classroom",
            objectives: null,
          });
          const mapped = this.mapSession(created);
          this.sessions.update((items) => [
            mapped,
            ...items.filter((item) => item.id !== mapped.id),
          ]);
          this.selectedLiveId.set(mapped.id);
        } else {
          const created = await this.api.createModule({
            siteId,
            programId,
            cohortId,
            title: value.title.trim(),
            description: null,
            estimatedMinutes: value.estimatedMinutes,
            dueDate: value.dueDate,
            trainerDisplayName: this.currentUserName(),
            expectedStudents: cohort.studentCount,
            steps: [
              { code: "READ_COURSE", label: "Lire le cours", sortOrder: 10 },
              {
                code: "WATCH_VIDEO",
                label: "Regarder la vidéo",
                sortOrder: 20,
              },
              { code: "EXERCISE", label: "Réaliser l'exercice", sortOrder: 30 },
              { code: "QUIZ", label: "Répondre au quiz", sortOrder: 40 },
            ],
          });
          const mapped = this.mapModule(created);
          this.modules.update((items) => [
            mapped,
            ...items.filter((item) => item.id !== mapped.id),
          ]);
        }

        this.apiConnected.set(true);
        this.drawerOpen.set(false);
        this.saved.set(true);
        this.createForm.controls.title.setValue("");
        window.setTimeout(() => this.saved.set(false), 1800);
        return;
      } catch {
        this.apiConnected.set(false);
      }
    }

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
          {
            id: "s1",
            labelKey: "distanceLearning.steps.readCourse",
            completed: false,
          },
          {
            id: "s2",
            labelKey: "distanceLearning.steps.watchVideo",
            completed: false,
          },
          {
            id: "s3",
            labelKey: "distanceLearning.steps.exercise",
            completed: false,
          },
          {
            id: "s4",
            labelKey: "distanceLearning.steps.quiz",
            completed: false,
          },
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

  async cycleAttendance(participantId: string): Promise<void> {
    const activeSession = this.selectedLive();
    if (!activeSession) return;
    const order: DistanceAttendanceStatus[] = [
      "present",
      "late",
      "disconnected",
      "absent",
    ];
    let updatedParticipant = activeSession.participants.find(
      (participant) => participant.id === participantId,
    );
    if (!updatedParticipant) return;
    const nextStatus =
      order[(order.indexOf(updatedParticipant.attendance) + 1) % order.length];
    updatedParticipant = { ...updatedParticipant, attendance: nextStatus };

    this.sessions.update((sessions) =>
      sessions.map((item) =>
        item.id !== activeSession.id
          ? item
          : {
              ...item,
              participants: item.participants.map((participant) =>
                participant.id === participantId
                  ? updatedParticipant!
                  : participant,
              ),
            },
      ),
    );

    if (this.isUuid(activeSession.id) && this.isUuid(participantId)) {
      try {
        await this.api.updateAttendance(activeSession.id, participantId, {
          attendance: nextStatus,
          connectedAtUtc: updatedParticipant.connectedAt ?? null,
          disconnectedAtUtc: updatedParticipant.disconnectedAt ?? null,
          connectedMinutes: updatedParticipant.connectedMinutes,
          participationPercent: updatedParticipant.participation,
          completedActivities: updatedParticipant.completedActivities,
          activityCount: updatedParticipant.activityCount,
        });
      } catch {
        await this.reloadFromApi();
      }
    }
  }

  async toggleModuleStep(moduleId: string, stepId: string): Promise<void> {
    this.modules.update((items) =>
      items.map((item) => {
        if (item.id !== moduleId) return item;
        const steps = item.steps.map((step) =>
          step.id === stepId ? { ...step, completed: !step.completed } : step,
        );
        const done = steps.filter((step) => step.completed).length;
        const progress = Math.round((done / Math.max(steps.length, 1)) * 100);
        return {
          ...item,
          steps,
          progress,
          status:
            progress === 100
              ? "completed"
              : progress > 0
                ? "in-progress"
                : "not-started",
        };
      }),
    );

    const module = this.modules().find((item) => item.id === moduleId);
    if (module && this.isUuid(moduleId)) {
      try {
        await this.api.updateModuleProgress(moduleId, {
          progressPercent: module.progress,
          completedStudents: module.completedStudents,
          averageScore: module.score ?? null,
        });
      } catch {
        await this.reloadFromApi();
      }
    }
  }

  updateModuleFilter(event: Event): void {
    this.moduleFilter.set(
      (event.target as HTMLSelectElement).value as "all" | DistanceModuleStatus,
    );
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
