import { Injectable, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { StudentStatus } from "../models/app.models";
import type { StudentDirectoryItem } from "../models/students.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { ReportingApiService } from "../reporting/reporting-api.service";
import type { CohortLearnerDashboard } from "../reporting/reporting.models";
import { RealtimeService } from "../realtime/realtime.service";
import { StudentProfileApiService, type LearnerDirectoryApi } from "../students/student-profile-api.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

/** An invitation receipt is not a learner directory entry or enrollment. */
export interface StudentInvitationResult {
  kind: "invitation";
  invitationId: string;
  firstName: string;
  lastName: string;
  email: string;
  cohortId: string;
  status: "invited";
}

@Injectable({ providedIn: "root" })
export class StudentApiStoreService {
  private readonly profiles = inject(StudentProfileApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly realtime = inject(RealtimeService);
  private readonly reporting = inject(ReportingApiService);
  private readonly notifications = inject(ApplicationNotificationService);

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
      if (!event || !( /^(pedagora\.training\.enrollment\.)/.test(event.typeKey)
        || event.typeKey === "pedagora.access.invitation.accepted.v1"
        || event.typeKey.startsWith("pedagora.access.member.") )) return;
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
  }): Promise<StudentInvitationResult | null> {
    const cohort = this.workspace.cohorts().find((item) => item.id === payload.promotionId);
    if (!cohort?.apiId) {
      this.notifications.error("students.api.invalidContext", "/stagiaires");
      return null;
    }

    try {
      // Learners.Create is the permission for this action; Access.Manage is not required.
      const receipt = await firstValueFrom(this.profiles.inviteToCohort(cohort.apiId, {
        firstName: this.text(payload.firstName).trim(),
        lastName: this.text(payload.lastName).trim(),
        email: this.text(payload.email).trim(),
        phone: this.nullableText(payload.phone),
        birthDate: this.nullableText(payload.birthDate),
        enrolledOn: this.nullableText(payload.startDate),
      }));

      // Fail closed on a malformed receipt. Never synthesize LearnerProfile/Enrollment IDs.
      if (!receipt?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receipt.id)
        || receipt.status !== "Invited"
        || this.text(receipt.email).trim().toLowerCase() !== this.text(payload.email).trim().toLowerCase()) {
        this.notifications.error("students.api.invitationReceiptInvalid", "/stagiaires");
        return null;
      }

      // In normal mode, the directory remains unchanged until the invitation is accepted.
      // In development bypass mode, reloading may already return the real learner profile.
      await this.reload();
      return {
        kind: "invitation",
        invitationId: receipt.id,
        firstName: this.text(receipt.firstName),
        lastName: this.text(receipt.lastName),
        email: this.text(receipt.email),
        cohortId: cohort.apiId,
        status: "invited",
      };
    } catch (error: unknown) {
      const status = this.httpStatus(error);
      const code = this.httpErrorCode(error);
      const key = status === 409 && code === "LEARNER_ALREADY_ENROLLED"
        ? "students.api.alreadyEnrolled"
        : status === 409 ? "students.api.invitationConflict"
        : status === 403 ? "students.api.invitationForbidden" : "students.api.invitationFailed";
      this.notifications.error(key, "/stagiaires");
      return null;
    }
  }

  private httpStatus(error: unknown): number {
    if (typeof error !== "object" || error === null || !("status" in error)) return 0;
    const status = (error as { status: unknown }).status;
    return typeof status === "number" ? status : 0;
  }

  private httpErrorCode(error: unknown): string {
    if (typeof error !== "object" || error === null || !("error" in error)) return "";
    const payload = (error as { error: unknown }).error;
    if (typeof payload !== "object" || payload === null || !("code" in payload)) return "";
    return this.text((payload as { code: unknown }).code);
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
