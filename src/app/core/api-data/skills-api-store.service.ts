import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { SkillCriterionLevel, SkillDefinition, SkillLinkedSession } from "../models/skills.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionService } from "../session/session.service";
import {
  StudentProfileApiService,
  type CohortCompetencyRowApi,
  type CompetencyDefinitionApi,
  type CompetencyProgressApi,
  type DrivingEvaluationApi,
} from "../students/student-profile-api.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

export interface SkillStudentOption {
  id: string;
  firstName: string;
  lastName: string;
}

@Injectable({ providedIn: "root" })
export class SkillsApiStoreService {
  private readonly api = inject(StudentProfileApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly session = inject(SessionService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly realtime = inject(RealtimeService);

  private readonly rowsSignal = signal<CohortCompetencyRowApi[]>([]);
  private readonly definitionsSignal = signal<CompetencyDefinitionApi[]>([]);
  private readonly historySignal = signal<DrivingEvaluationApi[]>([]);
  private readonly selectedEnrollmentSignal = signal("");

  readonly loading = signal(false);
  readonly historyLoading = signal(false);
  readonly loadError = signal(false);
  readonly historyError = signal(false);
  private contextGeneration = 0;
  private historyGeneration = 0;

  readonly students = computed<SkillStudentOption[]>(() =>
    this.rowsSignal().map((row) => ({
      id: this.text(row?.enrollmentId),
      firstName: this.text(row?.firstName),
      lastName: this.text(row?.lastName),
    })),
  );

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const cohortApiId = this.text(this.workspace.cohort()?.apiId);
      const referentialVersionId = this.text(this.workspace.cohort()?.referentialVersionId);
      const selfOnly = this.session.role() === "stagiaire";
      const generation = ++this.contextGeneration;

      this.rowsSignal.set([]);
      this.definitionsSignal.set([]);
      this.historySignal.set([]);
      this.selectedEnrollmentSignal.set("");
      this.loadError.set(false);
      this.historyError.set(false);

      if (!ready || !referentialVersionId || (!selfOnly && !cohortApiId)) return;
      void this.loadContext(cohortApiId, referentialVersionId, selfOnly, generation);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event) return;

      if (event.typeKey === "pedagora.learning.competency.evaluated.v1") {
        untracked(() => {
          const cohortApiId = this.text(this.workspace.cohort()?.apiId);
          const referentialVersionId = this.text(this.workspace.cohort()?.referentialVersionId);
          const selfOnly = this.session.role() === "stagiaire";
          if (referentialVersionId && (selfOnly || cohortApiId)) {
            void this.loadContext(cohortApiId, referentialVersionId, selfOnly, ++this.contextGeneration, false);
          }
        });
      }

      if (event.typeKey === "pedagora.learning.driving-evaluation.recorded.v1") {
        untracked(() => {
          const enrollmentId = this.selectedEnrollmentSignal();
          if (enrollmentId) void this.loadHistory(enrollmentId, ++this.historyGeneration, false);
        });
      }
    });
  }

  selectStudent(enrollmentId: string): void {
    const normalized = this.text(enrollmentId);
    if (normalized === this.selectedEnrollmentSignal()) return;
    this.selectedEnrollmentSignal.set(normalized);
    this.historySignal.set([]);
    this.historyError.set(false);
    if (normalized) void this.loadHistory(normalized, ++this.historyGeneration);
  }

  definitionsFor(enrollmentId: string): SkillDefinition[] {
    const definitions = this.definitionsSignal().filter((item) => item.active !== false);
    const roots = definitions
      .filter((item) => !this.text(item.parentId))
      .slice()
      .sort((a, b) => this.number(a.sortOrder) - this.number(b.sortOrder));
    const ecsrRoots = roots.filter((item) => /^C[1-4]$/i.test(this.text(item.code)));
    const row = this.row(enrollmentId);
    const progress = new Map(
      (Array.isArray(row?.competencies) ? row!.competencies : []).map((item) => [this.text(item.competencyDefinitionId), item]),
    );

    return (ecsrRoots.length ? ecsrRoots : roots).map((root) => {
      const children = definitions
        .filter((item) => this.text(item.parentId) === this.text(root.id))
        .slice()
        .sort((a, b) => this.number(a.sortOrder) - this.number(b.sortOrder));
      const criteriaDefinitions = children.length ? children : [root];
      return {
        definitionId: this.text(root.id),
        code: this.text(root.code),
        titleKey: this.text(root.title),
        criteria: criteriaDefinitions.map((definition) => ({
          definitionId: this.text(definition.id),
          labelKey: this.text(definition.title),
          level: this.level(progress.get(this.text(definition.id))?.level),
        })),
      };
    });
  }

  skillValue(code: string, enrollmentId: string): number {
    const definition = this.definitionsFor(enrollmentId).find((item) => item.code === this.text(code));
    if (!definition) return 0;

    const row = this.row(enrollmentId);
    const progress = Array.isArray(row?.competencies) ? row!.competencies : [];
    const rootRecord = progress.find((item) => this.text(item.competencyDefinitionId) === definition.definitionId);
    if (rootRecord?.score !== null && rootRecord?.score !== undefined && Number.isFinite(Number(rootRecord.score))) {
      return this.clamp(Math.round(Number(rootRecord.score)));
    }

    if (!definition.criteria.length) return 0;
    const points = definition.criteria.map((criterion) => {
      switch (criterion.level) {
        case "acquired": return 100;
        case "in_progress": return 60;
        case "rework": return 25;
        default: return 0;
      }
    });
    return this.clamp(Math.round(points.reduce<number>((sum, value) => sum + value, 0) / points.length));
  }

  linkedSessions(enrollmentId: string, skillCode: string): SkillLinkedSession[] {
    const student = this.students().find((item) => item.id === enrollmentId) ?? { id: "", firstName: "", lastName: "" };
    const studentName = `${student.firstName} ${student.lastName}`.trim();
    return this.historySignal()
      .filter((row) => this.rootCodeForDefinition(row?.competencyDefinitionId) === this.text(skillCode))
      .map((row) => ({
        id: this.text(row?.id),
        skill: this.text(skillCode),
        date: this.shortDate(row?.evaluatedAtUtc),
        studentName,
        subjectKey: this.text(row?.subject),
        positiveKey: this.text(row?.positive),
        workOnKey: this.text(row?.difficulty),
        nextGoalKey: this.text(row?.nextGoal),
      }));
  }

  private async loadContext(
    cohortApiId: string,
    referentialVersionId: string,
    selfOnly: boolean,
    generation: number,
    notify = true,
  ): Promise<void> {
    this.loading.set(true);
    try {
      const definitionsPromise = firstValueFrom(this.api.competencyDefinitions(referentialVersionId));
      const rowsPromise = selfOnly
        ? this.loadSelfRow()
        : firstValueFrom(this.api.cohortCompetencies(cohortApiId));

      const [definitions, rows] = await Promise.all([definitionsPromise, rowsPromise]);
      if (generation !== this.contextGeneration) return;

      this.definitionsSignal.set((Array.isArray(definitions) ? definitions : []).map((row) => this.normalizeDefinition(row)));
      this.rowsSignal.set((Array.isArray(rows) ? rows : []).map((row) => this.normalizeRow(row)));
      this.loadError.set(false);

      const current = this.selectedEnrollmentSignal();
      const selected = this.rowsSignal().some((row) => row.enrollmentId === current)
        ? current
        : (this.rowsSignal()[0]?.enrollmentId ?? "");
      this.selectedEnrollmentSignal.set(selected);
      this.historySignal.set([]);
      if (selected) void this.loadHistory(selected, ++this.historyGeneration, notify);
    } catch {
      if (generation === this.contextGeneration) {
        this.rowsSignal.set([]);
        this.definitionsSignal.set([]);
        this.historySignal.set([]);
        this.loadError.set(true);
        if (notify) this.notifications.error("skills.real.failed", "/competences");
      }
    } finally {
      if (generation === this.contextGeneration) this.loading.set(false);
    }
  }

  private async loadSelfRow(): Promise<CohortCompetencyRowApi[]> {
    const learner = await firstValueFrom(this.api.self());
    const enrollmentId = this.text(learner?.enrollmentId);
    if (!enrollmentId) return [];
    const competencies = await firstValueFrom(this.api.competencies(enrollmentId));
    return [{
      enrollmentId,
      firstName: this.text(learner?.firstName),
      lastName: this.text(learner?.lastName),
      competencies: Array.isArray(competencies) ? competencies : [],
    }];
  }

  private async loadHistory(enrollmentId: string, generation: number, notify = true): Promise<void> {
    this.historyLoading.set(true);
    try {
      const rows = await firstValueFrom(this.api.driving(enrollmentId));
      if (generation !== this.historyGeneration || enrollmentId !== this.selectedEnrollmentSignal()) return;
      this.historySignal.set(Array.isArray(rows) ? rows.map((row) => this.normalizeDriving(row)) : []);
      this.historyError.set(false);
    } catch {
      if (generation === this.historyGeneration && enrollmentId === this.selectedEnrollmentSignal()) {
        this.historySignal.set([]);
        this.historyError.set(true);
        if (notify) this.notifications.error("skills.real.drivingFailed", "/competences");
      }
    } finally {
      if (generation === this.historyGeneration) this.historyLoading.set(false);
    }
  }

  private row(enrollmentId: string): CohortCompetencyRowApi | undefined {
    return this.rowsSignal().find((item) => this.text(item.enrollmentId) === this.text(enrollmentId));
  }

  private rootCodeForDefinition(definitionId: unknown): string {
    const byId = new Map(this.definitionsSignal().map((item) => [this.text(item.id), item]));
    let current = byId.get(this.text(definitionId));
    const visited = new Set<string>();
    while (current?.parentId && !visited.has(this.text(current.id))) {
      visited.add(this.text(current.id));
      current = byId.get(this.text(current.parentId)) ?? current;
      if (!current.parentId) break;
    }
    return this.text(current?.code);
  }

  private normalizeRow(row: CohortCompetencyRowApi): CohortCompetencyRowApi {
    return {
      enrollmentId: this.text(row?.enrollmentId),
      firstName: this.text(row?.firstName),
      lastName: this.text(row?.lastName),
      competencies: (Array.isArray(row?.competencies) ? row.competencies : []).map((item) => this.normalizeProgress(item)),
    };
  }

  private normalizeProgress(row: CompetencyProgressApi): CompetencyProgressApi {
    return {
      id: this.text(row?.id),
      competencyDefinitionId: this.text(row?.competencyDefinitionId),
      code: this.text(row?.code),
      title: this.text(row?.title),
      level: this.text(row?.level) || "not_assessed",
      score: row?.score === null || row?.score === undefined ? null : this.number(row.score),
      comment: this.nullableText(row?.comment),
      evaluatorDisplayName: this.nullableText(row?.evaluatorDisplayName),
      evaluatedAtUtc: this.nullableText(row?.evaluatedAtUtc),
    };
  }

  private normalizeDefinition(row: CompetencyDefinitionApi): CompetencyDefinitionApi {
    return {
      id: this.text(row?.id),
      parentId: this.nullableText(row?.parentId),
      code: this.text(row?.code),
      title: this.text(row?.title),
      kind: this.text(row?.kind),
      sortOrder: this.number(row?.sortOrder),
      active: row?.active !== false,
    };
  }

  private normalizeDriving(row: DrivingEvaluationApi): DrivingEvaluationApi {
    return {
      ...row,
      id: this.text(row?.id),
      enrollmentId: this.text(row?.enrollmentId),
      competencyDefinitionId: this.text(row?.competencyDefinitionId),
      trainingSessionId: this.nullableText(row?.trainingSessionId),
      evaluatedAtUtc: this.text(row?.evaluatedAtUtc),
      subject: this.text(row?.subject),
      trainerDisplayName: this.text(row?.trainerDisplayName),
      positive: this.nullableText(row?.positive),
      difficulty: this.nullableText(row?.difficulty),
      nextGoal: this.nullableText(row?.nextGoal),
      freeObservation: this.nullableText(row?.freeObservation),
      criteria: Array.isArray(row?.criteria) ? row.criteria : [],
    };
  }

  private level(value: unknown): SkillCriterionLevel {
    const normalized = this.text(value).toLowerCase();
    if (normalized === "acquired" || normalized === "in_progress" || normalized === "rework") return normalized;
    return "not_assessed";
  }

  private shortDate(value: unknown): string {
    const raw = this.text(value);
    if (!raw) return "";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
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
