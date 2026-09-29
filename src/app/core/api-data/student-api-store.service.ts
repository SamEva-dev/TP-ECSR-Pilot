import { Injectable, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { StudentStatus } from "../models/app.models";
import type { StudentDirectoryItem } from "../models/students.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { PedagoraAccessApiService } from "../access/pedagora-access-api.service";
import { ReportingApiService } from "../reporting/reporting-api.service";
import type { CohortLearnerDashboard } from "../reporting/reporting.models";
import { RealtimeService } from "../realtime/realtime.service";
import { StudentProfileApiService, type LearnerDirectoryApi } from "../students/student-profile-api.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

@Injectable({ providedIn: "root" })
export class StudentApiStoreService {
  private readonly profiles = inject(StudentProfileApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly realtime = inject(RealtimeService);
  private readonly reporting = inject(ReportingApiService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly access = inject(PedagoraAccessApiService);

  private readonly itemsSignal = signal<StudentDirectoryItem[]>([]);
  readonly students = this.itemsSignal.asReadonly();
  readonly loading = signal(false);
  readonly loadError = signal(false);
  private generation = 0;
  private request = 0;

  constructor() {
    effect(() => {
      const cohort = this.workspace.cohort();
      const ready = this.workspace.remoteWorkspaceLoaded();
      const generation = ++this.generation;
      this.itemsSignal.set([]);
      this.loadError.set(false);
      if (ready) void this.reload(generation, cohort?.apiId ?? "");
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !(/^(pedagora\.training\.enrollment\.)/.test(event.typeKey) || (event.typeKey === "pedagora.access.invitation.accepted.v1" || event.typeKey === "pedagora.access.member.role-changed.v1"))) return;
      untracked(() => void this.reload());
    });
  }

  async reload(
    generation = this.generation,
    cohortApiId = this.workspace.cohort()?.apiId ?? "",
  ): Promise<boolean> {
    const request = ++this.request;
    this.loading.set(true);
    try {
      const rows = await firstValueFrom(this.profiles.directory());
      let summaries: CohortLearnerDashboard[] = [];
      if (cohortApiId) {
        try {
          const result = await firstValueFrom(this.reporting.cohortLearners(cohortApiId));
          summaries = Array.isArray(result) ? result : [];
        } catch {
          this.notifications.error("students.api.metricsFailed", "/stagiaires");
        }
      }
      if (generation !== this.generation || request !== this.request) return false;
      const summaryByEnrollment = new Map(summaries.map((item) => [item.enrollmentId, item]));
      this.itemsSignal.set((Array.isArray(rows) ? rows : []).map((row) =>
        this.mapDirectory(row, summaryByEnrollment.get(this.text(row?.enrollmentId))),
      ));
      this.loadError.set(false);
      return true;
    } catch {
      if (generation === this.generation && request === this.request) {
        this.itemsSignal.set([]);
        this.loadError.set(true);
        this.notifications.error("students.api.loadFailed", "/stagiaires");
      }
      return false;
    } finally {
      if (generation === this.generation && request === this.request) this.loading.set(false);
    }
  }

  async create(payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthDate: string;
    promotionId: string;
    startDate: string;
  }): Promise<StudentDirectoryItem | null> {
    const cohort = this.workspace.cohorts().find((item) => item.id === payload.promotionId);
    if (!cohort?.apiId) {
      this.notifications.error("students.api.invalidContext", "/stagiaires");
      return null;
    }

    try {
      await firstValueFrom(this.access.invite({
        firstName: this.text(payload.firstName).trim(),
        lastName: this.text(payload.lastName).trim(),
        email: this.text(payload.email).trim(),
        role: "student",
        siteId: this.workspace.site()?.apiId ?? null,
        programId: this.workspace.program()?.apiId ?? null,
        cohortId: cohort.apiId,
        examSessionId: null,
        phone: this.nullableText(payload.phone),
        birthDate: this.nullableText(payload.birthDate),
        enrolledOn: this.nullableText(payload.startDate),
      }));

      // The product-owned invitation provisions OrganizationMember -> StudentProfile -> LearnerProfile
      // and, because a cohort is supplied here, the Enrollment as part of the same outbox workflow.
      await this.reload();
      return {
        id: "", enrollmentId: "", firstName: this.text(payload.firstName), lastName: this.text(payload.lastName),
        promotionId: cohort.id, promotionName: cohort.name, progress: 0, completedHours: 0, catchupHours: 0,
        preparedSheets: 0, presentedSheets: 0, validatedSheets: 0, status: "good", enrollmentStatus: "pending",
      };
    } catch {
      this.notifications.error("students.api.createFailed", "/stagiaires");
      return null;
    }
  }

  private mapDirectory(row: LearnerDirectoryApi, summary?: CohortLearnerDashboard): StudentDirectoryItem {
    const enrollmentStatus = row?.enrollmentId ? this.enrollmentStatus(row?.enrollmentStatus) : "pending";
    const completedHours = Math.round(this.number(summary?.completedMinutes) / 60 * 10) / 10;
    const catchupHours = Math.round(this.number(summary?.catchupMinutes) / 60 * 10) / 10;
    return {
      id: this.text(row?.learnerProfileId),
      enrollmentId: this.text(row?.enrollmentId),
      firstName: this.text(row?.firstName),
      lastName: this.text(row?.lastName),
      promotionId: this.text(row?.cohortId),
      promotionName: this.text(row?.cohortName),
      progress: this.number(summary?.averageCompetencyProgress),
      completedHours, catchupHours,
      preparedSheets: this.number(summary?.preparedTopics), presentedSheets: this.number(summary?.presentedTopics), validatedSheets: this.number(summary?.validatedTopics),
      status: this.status(enrollmentStatus, catchupHours),
      enrollmentStatus,
    };
  }

  private enrollmentStatus(value: unknown): NonNullable<StudentDirectoryItem["enrollmentStatus"]> {
    const normalized = this.text(value).toLowerCase();
    return normalized === "pending" || normalized === "suspended" || normalized === "completed" || normalized === "withdrawn" || normalized === "cancelled"
      ? normalized
      : "active";
  }

  private status(
    enrollmentStatus: NonNullable<StudentDirectoryItem["enrollmentStatus"]>,
    catchupHours = 0,
  ): StudentStatus {
    if (enrollmentStatus !== "active" && enrollmentStatus !== "completed") return "warning";
    if (catchupHours > 10) return "late";
    if (catchupHours > 0) return "warning";
    return "good";
  }

  private nullableText(value: unknown): string | null {
    const text = this.text(value).trim();
    return text || null;
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
}
