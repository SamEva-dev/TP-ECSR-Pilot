import { Injectable, effect, inject, signal, untracked } from "@angular/core";
import {
  ReferentialApiService,
  type ReferentialApiDto,
  type ReferentialVersionDetailsApiDto,
} from "../catalog/referential-api.service";
import type {
  ReferentialCertificationStep,
  ReferentialCompetency,
  ReferentialStatus,
  ReferentialVersionFormValue,
  TrainingReferential,
} from "../models/referentials.models";
import type { ProgramModule } from "../models/workspace.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionService } from "../session/session.service";

@Injectable({ providedIn: "root" })
export class ReferentialApiStoreService {
  private readonly api = inject(ReferentialApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly session = inject(SessionService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly itemsSignal = signal<TrainingReferential[]>([]);

  readonly items = this.itemsSignal.asReadonly();
  readonly remoteLoaded = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  private generation = 0;
  private request = 0;
  private identity = "";

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const user = this.text(this.session.session()?.userId);
      const organization = this.text(this.session.session()?.organizationId);
      const identity = user ? `${user}:${organization}` : "";
      if (identity === this.identity) return;
      this.identity = identity;
      const generation = ++this.generation;
      ++this.request;
      this.itemsSignal.set([]);
      this.remoteLoaded.set(false);
      this.loadError.set(false);
      if (user) void this.reload(generation);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (
        !event ||
        !/^(pedagora\.catalog\.(referential|program|offering)|pedagora\.learning\.(competency|topic)|pedagora\.workplace\.|pedagora\.certification\.)/.test(
          event.typeKey,
        )
      )
        return;
      untracked(() => {
        if (this.session.hasValidToken()) void this.reload();
      });
    });
  }

  async reload(generation = this.generation): Promise<boolean> {
    const request = ++this.request;
    this.loading.set(true);
    try {
      const rows = await this.api.list();
      if (generation !== this.generation || request !== this.request) return false;

      const base = (Array.isArray(rows) ? rows : []).map((row) => this.map(row));
      this.itemsSignal.set(base);
      this.remoteLoaded.set(true);
      this.loadError.set(false);

      if (!base.length) return true;

      const settled = await Promise.allSettled(
        base.map(async (item) => ({ item, details: await this.api.details(item.apiId) })),
      );
      if (generation !== this.generation || request !== this.request) return false;

      const details = new Map<string, ReferentialVersionDetailsApiDto>();
      let detailFailure = false;
      for (const result of settled) {
        if (result.status === "fulfilled") details.set(result.value.item.apiId, result.value.details);
        else detailFailure = true;
      }

      this.itemsSignal.set(
        base.map((item) => {
          const detail = details.get(item.apiId);
          return detail ? this.enrich(item, detail) : item;
        }),
      );
      if (detailFailure) this.notifications.error("referentials.api.loadError", "/referentiels");
      return true;
    } catch {
      if (generation === this.generation && request === this.request) {
        this.itemsSignal.set([]);
        this.loadError.set(true);
        this.notifications.error("referentials.api.loadError", "/referentiels");
      }
      return false;
    } finally {
      if (generation === this.generation && request === this.request) this.loading.set(false);
    }
  }

  retry(): void {
    void this.reload();
  }

  async createVersion(value: ReferentialVersionFormValue): Promise<TrainingReferential | null> {
    const source = this.itemsSignal().find(
      (item) => item.id === value.sourceReferentialId || item.apiId === value.sourceReferentialId,
    );
    if (!source || source.programId !== value.programId) {
      this.notifications.error("referentials.api.saveError", "/referentiels");
      return null;
    }

    try {
      const created = await this.api.createVersion(source.referentialId, {
        version: this.text(value.version).trim(),
        certificationCode: this.text(value.code).trim() || null,
        effectiveFrom: this.text(value.effectiveFrom),
        totalHours: this.number(source.totalHours),
        sheetCount: this.number(source.sheetCount),
        requiredDocumentCount: this.number(source.requiredDocumentCount),
        enabledModules: Array.isArray(source.enabledModules) ? source.enabledModules : [],
        notesKey: source.notesKey,
        externalKey: null,
        publish: value.status === "active",
      });

      const mapped = this.map(created);
      this.itemsSignal.update((items) => [mapped, ...items]);
      await this.reload();
      return this.itemsSignal().find((item) => item.apiId === mapped.apiId) ?? mapped;
    } catch {
      this.notifications.error("referentials.api.saveError", "/referentiels");
      return null;
    }
  }

  async publish(versionId: string): Promise<boolean> {
    const current = this.itemsSignal().find((item) => item.apiId === versionId);
    if (!current || current.status !== "draft") {
      this.notifications.error("referentials.api.publishError", "/referentiels");
      return false;
    }

    try {
      await this.api.publish(versionId);
      await this.reload();
      return true;
    } catch {
      this.notifications.error("referentials.api.publishError", `/referentiels/${current.id}`);
      return false;
    }
  }

  private enrich(item: TrainingReferential, details: ReferentialVersionDetailsApiDto): TrainingReferential {
    const definitions = Array.isArray(details?.competencies) ? details.competencies : [];
    const parents = definitions.filter((definition) => !this.text(definition.parentId));
    const competencies: ReferentialCompetency[] = parents.map((definition) => ({
      id: this.text(definition.id),
      code: this.text(definition.code),
      label: this.text(definition.title),
      description: "",
      subCompetencies: definitions
        .filter((candidate) => this.text(candidate.parentId) === this.text(definition.id))
        .sort((a, b) => this.number(a.sortOrder) - this.number(b.sortOrder))
        .map((candidate) => ({
          id: this.text(candidate.id),
          code: this.text(candidate.code),
          label: this.text(candidate.title),
        })),
    }));

    const certificationSteps: ReferentialCertificationStep[] = (
      Array.isArray(details?.certificationSteps) ? details.certificationSteps : []
    )
      .slice()
      .sort((a, b) => this.number(a.sortOrder) - this.number(b.sortOrder))
      .map((step) => ({
        id: this.text(step.id),
        label: this.text(step.title),
        durationMinutes: this.number(step.durationMinutes),
        evaluator: this.evaluator(step.kind),
      }));

    return {
      ...item,
      competencies,
      sheetCount: this.number(details?.topicCount),
      stageRequirements: (Array.isArray(details?.workplacePeriodTypes) ? details.workplacePeriodTypes : [])
        .filter((code): code is string => typeof code === "string" && code.trim().length > 0)
        .map((code) => ({ id: code, label: code, hours: 0, description: "", mandatory: true })),
      certificationSchemeName: this.text(details?.certificationSchemeName),
      certificationSteps,
      linkedCohorts: (Array.isArray(details?.linkedCohorts) ? details.linkedCohorts : []).map((cohort) => ({
        id: this.text(cohort?.key) || this.text(cohort?.id),
        name: this.text(cohort?.name),
        siteName: this.text(cohort?.siteName),
        start: this.text(cohort?.startDate),
        end: this.text(cohort?.endDate),
        studentCount: this.number(cohort?.studentCount),
        status: this.text(cohort?.status),
      })),
    };
  }

  private map(row: ReferentialApiDto): TrainingReferential {
    return {
      id: this.text(row?.key) || this.text(row?.id),
      apiId: this.text(row?.id),
      referentialId: this.text(row?.referentialId),
      programId: this.text(row?.programKey) || this.text(row?.programId),
      code: this.text(row?.code),
      name: this.text(row?.name),
      version: this.text(row?.version),
      certificationCode: this.text(row?.certificationCode) || null,
      status: this.status(row?.status),
      effectiveFrom: this.text(row?.effectiveFrom),
      effectiveTo: this.text(row?.effectiveTo) || null,
      totalHours: this.number(row?.totalHours),
      enabledModules: this.modules(row?.enabledModules),
      competencies: [],
      volumes: [],
      sheetCount: this.number(row?.sheetCount),
      stageRequirements: [],
      requiredDocumentCount: this.number(row?.requiredDocumentCount),
      certificationSchemeName: "",
      certificationSteps: [],
      linkedCohorts: [],
      notes: this.text(row?.notesKey),
      notesKey: this.text(row?.notesKey) || null,
    };
  }

  private evaluator(kind: unknown): ReferentialCertificationStep["evaluator"] {
    const value = this.text(kind).toLowerCase();
    if (value.includes("system") || value.includes("automatic")) return "system";
    if (value.includes("trainer")) return "trainer";
    return "jury";
  }

  private modules(value: unknown): ProgramModule[] {
    return Array.isArray(value)
      ? (value.filter((item): item is ProgramModule => typeof item === "string") as ProgramModule[])
      : [];
  }

  private status(value: unknown): ReferentialStatus {
    return value === "active" || value === "archived" ? value : "draft";
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
}
