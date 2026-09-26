import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { EvaluationLevel, PedagogicalSheet, SheetStatus } from "../models/sheets.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionService } from "../session/session.service";
import {
  StudentProfileApiService,
  type LearnerProfileApi,
  type TopicProgressApi,
  type UpdateTopicProgressApiRequest,
} from "../students/student-profile-api.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

export interface SheetStudentOption {
  id: string;
  firstName: string;
  lastName: string;
}

export interface SheetStudentSummary extends SheetStudentOption {
  preparedSheets: number;
  presentedSheets: number;
  validatedSheets: number;
}

export interface SaveSheetEvaluationValue {
  studentId: string;
  sheetNumber: number;
  presentationDate: string;
  durationMinutes: number;
  levels: Record<string, EvaluationLevel>;
  positivePoints: string;
  improvements: string;
  generalComment: string;
  nextObjective: string;
  decision: "validated" | "rework";
}

@Injectable({ providedIn: "root" })
export class SheetsApiStoreService {
  private readonly api = inject(StudentProfileApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly session = inject(SessionService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly realtime = inject(RealtimeService);

  private readonly learnersSignal = signal<LearnerProfileApi[]>([]);
  private readonly topicsSignal = signal<PedagogicalSheet[]>([]);
  private readonly selectedEnrollmentSignal = signal("");

  readonly loading = signal(false);
  readonly topicsLoading = signal(false);
  readonly loadError = signal(false);
  readonly topicsError = signal(false);
  private contextGeneration = 0;
  private topicsGeneration = 0;

  readonly students = computed<SheetStudentOption[]>(() =>
    this.learnersSignal().map((row) => ({
      id: this.text(row?.enrollmentId),
      firstName: this.text(row?.firstName),
      lastName: this.text(row?.lastName),
    })),
  );
  readonly sheets = this.topicsSignal.asReadonly();
  readonly sheetTotal = computed(() => this.topicsSignal().length);

  readonly currentEvaluator = computed(() => {
    const current = this.session.session();
    return `${this.text(current?.firstName)} ${this.text(current?.lastName)}`.trim() || this.text(current?.email);
  });

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const cohortApiId = this.text(this.workspace.cohort()?.apiId);
      const selfOnly = this.session.role() === "stagiaire";
      const generation = ++this.contextGeneration;

      this.learnersSignal.set([]);
      this.topicsSignal.set([]);
      this.selectedEnrollmentSignal.set("");
      this.loadError.set(false);
      this.topicsError.set(false);

      if (!ready || (!selfOnly && !cohortApiId)) return;
      void this.loadLearners(cohortApiId, selfOnly, generation);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (event?.typeKey !== "pedagora.learning.topic-progress.updated.v1") return;
      untracked(() => {
        const enrollmentId = this.selectedEnrollmentSignal();
        if (enrollmentId) void this.loadTopics(enrollmentId, ++this.topicsGeneration, false);
      });
    });
  }

  selectStudent(enrollmentId: string): void {
    const normalized = this.text(enrollmentId);
    if (normalized === this.selectedEnrollmentSignal()) return;
    this.selectedEnrollmentSignal.set(normalized);
    this.topicsSignal.set([]);
    this.topicsError.set(false);
    if (normalized) void this.loadTopics(normalized, ++this.topicsGeneration);
  }

  studentSummary(enrollmentId: string): SheetStudentSummary {
    const student = this.students().find((item) => item.id === enrollmentId) ?? {
      id: "",
      firstName: "",
      lastName: "",
    };
    const sheets = enrollmentId === this.selectedEnrollmentSignal() ? this.topicsSignal() : [];
    return {
      ...student,
      preparedSheets: sheets.filter((item) => item.status !== "not_started").length,
      presentedSheets: sheets.filter((item) => item.status === "presented" || item.status === "validated" || item.status === "rework").length,
      validatedSheets: sheets.filter((item) => item.status === "validated").length,
    };
  }

  reworkCount(): number {
    return this.topicsSignal().filter((item) => item.status === "rework").length;
  }

  topicByNumber(number: number): PedagogicalSheet | null {
    return this.topicsSignal().find((item) => item.number === this.number(number)) ?? null;
  }

  async saveEvaluation(value: SaveSheetEvaluationValue): Promise<PedagogicalSheet | null> {
    const enrollmentId = this.text(value.studentId);
    const current = this.topicByNumber(value.sheetNumber);
    if (!enrollmentId || enrollmentId !== this.selectedEnrollmentSignal() || !current?.topicId) {
      this.notifications.error("sheets.real.saveFailed", "/fiches");
      return null;
    }

    const evaluationCriteria = Object.entries(value.levels ?? {})
      .filter(([code]) => Boolean(this.text(code)))
      .map(([code, level]) => ({ code: this.text(code), level: this.evaluationLevel(level) }));

    const request: UpdateTopicProgressApiRequest = {
      status: value.decision === "rework" ? "rework" : "validated",
      preparationDate: current.preparationDate || null,
      presentationDate: this.nullableText(value.presentationDate),
      presentationDurationMinutes: this.number(value.durationMinutes) > 0 ? this.number(value.durationMinutes) : null,
      evaluatorDisplayName: null,
      positivePoints: this.nullableText(value.positivePoints),
      improvements: this.nullableText(value.improvements),
      comment: this.nullableText(value.generalComment),
      nextObjective: this.nullableText(value.nextObjective),
      evaluationCriteria,
    };

    try {
      const updated = await firstValueFrom(this.api.updateTopic(enrollmentId, current.topicId, request));
      const mapped = this.mapTopic(updated);
      this.topicsSignal.update((items) =>
        items.map((item) => item.topicId === mapped.topicId ? mapped : item),
      );
      this.topicsError.set(false);
      return mapped;
    } catch {
      this.notifications.error("sheets.real.saveFailed", "/fiches");
      return null;
    }
  }

  private async loadLearners(cohortApiId: string, selfOnly: boolean, generation: number): Promise<void> {
    this.loading.set(true);
    try {
      const rows = selfOnly
        ? [await firstValueFrom(this.api.self())]
        : await firstValueFrom(this.api.cohortLearners(cohortApiId));
      if (generation !== this.contextGeneration) return;

      this.learnersSignal.set((Array.isArray(rows) ? rows : []).map((row) => this.normalizeLearner(row)));
      this.loadError.set(false);

      const current = this.selectedEnrollmentSignal();
      const selected = this.learnersSignal().some((row) => row.enrollmentId === current)
        ? current
        : (this.learnersSignal()[0]?.enrollmentId ?? "");
      this.selectedEnrollmentSignal.set(selected);
      if (selected) void this.loadTopics(selected, ++this.topicsGeneration);
    } catch {
      if (generation === this.contextGeneration) {
        this.learnersSignal.set([]);
        this.topicsSignal.set([]);
        this.loadError.set(true);
        this.notifications.error("sheets.real.rosterFailed", "/fiches");
      }
    } finally {
      if (generation === this.contextGeneration) this.loading.set(false);
    }
  }

  private async loadTopics(enrollmentId: string, generation: number, notify = true): Promise<void> {
    this.topicsLoading.set(true);
    try {
      const rows = await firstValueFrom(this.api.topics(enrollmentId));
      if (generation !== this.topicsGeneration || enrollmentId !== this.selectedEnrollmentSignal()) return;
      this.topicsSignal.set((Array.isArray(rows) ? rows : []).map((row) => this.mapTopic(row)));
      this.topicsError.set(false);
    } catch {
      if (generation === this.topicsGeneration && enrollmentId === this.selectedEnrollmentSignal()) {
        this.topicsSignal.set([]);
        this.topicsError.set(true);
        if (notify) this.notifications.error("sheets.real.topicsFailed", "/fiches");
      }
    } finally {
      if (generation === this.topicsGeneration) this.topicsLoading.set(false);
    }
  }

  private normalizeLearner(row: LearnerProfileApi): LearnerProfileApi {
    return {
      enrollmentId: this.text(row?.enrollmentId),
      learnerProfileId: this.text(row?.learnerProfileId),
      cohortId: this.text(row?.cohortId),
      firstName: this.text(row?.firstName),
      lastName: this.text(row?.lastName),
      email: this.text(row?.email),
      phone: this.nullableText(row?.phone),
      birthDate: this.nullableText(row?.birthDate),
      enrollmentStatus: this.text(row?.enrollmentStatus),
      enrolledOn: this.text(row?.enrolledOn),
    };
  }

  private mapTopic(row: TopicProgressApi): PedagogicalSheet {
    const levels: Record<string, EvaluationLevel> = {};
    for (const criterion of Array.isArray(row?.evaluationCriteria) ? row.evaluationCriteria : []) {
      const code = this.text(criterion?.code);
      if (code) levels[code] = this.evaluationLevel(criterion?.level);
    }

    return {
      topicId: this.text(row?.topicId),
      number: this.number(row?.number),
      titleKey: this.text(row?.title),
      status: this.status(row?.status),
      preparationDate: this.text(row?.preparationDate),
      presentationDate: this.text(row?.presentationDate),
      durationMinutes: this.number(row?.presentationDurationMinutes),
      evaluator: this.text(row?.evaluatorDisplayName),
      commentKey: this.text(row?.comment),
      positivePoints: this.text(row?.positivePoints),
      improvements: this.text(row?.improvements),
      generalComment: this.text(row?.comment),
      nextObjective: this.text(row?.nextObjective),
      evaluationLevels: levels,
    };
  }

  private status(value: unknown): SheetStatus {
    const status = this.text(value).toLowerCase();
    return status === "in_progress" || status === "ready" || status === "presented" || status === "validated" || status === "rework"
      ? status
      : "not_started";
  }

  private evaluationLevel(value: unknown): EvaluationLevel {
    const level = this.text(value).toLowerCase();
    if (level === "acquired" || level === "review") return level;
    return "in_progress";
  }

  private nullableText(value: unknown): string | null {
    const text = this.text(value).trim();
    return text || null;
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private number(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
}
