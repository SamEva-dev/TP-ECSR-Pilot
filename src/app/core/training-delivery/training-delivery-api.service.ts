import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";

export type TrainingSessionType =
  | "classroom"
  | "distance"
  | "driving"
  | "evaluation"
  | "internship"
  | "presentation"
  | "catchup"
  | "sensitization"
  | "event";

export type TrainingSessionModality =
  "onsite" | "remote-live" | "remote-async" | "practical";
export type TrainingSessionStatus =
  "planned" | "inprogress" | "completed" | "cancelled";
export type SessionAudienceMode = "whole-cohort" | "selected-enrollments";
export type AttendanceStatus =
  "pending" | "present" | "late" | "absent" | "excused";

export interface TrainingSessionApi {
  id: string;
  organizationId: string;
  siteId: string;
  cohortId: string;
  type: TrainingSessionType;
  modality: TrainingSessionModality;
  title: string;
  startsAtUtc: string;
  endsAtUtc: string;
  timeZoneId: string;
  trainerAuthGateUserId?: string | null;
  trainerDisplayName?: string | null;
  location?: string | null;
  objective?: string | null;
  supports?: string | null;
  comments?: string | null;
  status: TrainingSessionStatus;
  audienceMode: SessionAudienceMode;
  participantEnrollmentIds: string[];
  plannedMinutes: number;
  expectedLearners: number;
  presentLearners: number;
  externalKey?: string | null;
}

export interface CreateTrainingSessionApiRequest {
  cohortId: string;
  type: TrainingSessionType;
  modality: TrainingSessionModality;
  title: string;
  startsAtUtc: string;
  endsAtUtc: string;
  timeZoneId: string;
  trainerAuthGateUserId?: string | null;
  trainerDisplayName?: string | null;
  location?: string | null;
  objective?: string | null;
  supports?: string | null;
  comments?: string | null;
  audienceMode: SessionAudienceMode;
  participantEnrollmentIds?: string[] | null;
  externalKey?: string | null;
}

export interface AttendanceEntryApi {
  enrollmentId: string;
  learnerProfileId: string;
  personId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  status: AttendanceStatus;
  arrivalAtUtc?: string | null;
  departureAtUtc?: string | null;
  expectedMinutes: number;
  presentMinutes: number;
  missedMinutes: number;
  catchupMinutes: number;
  addToCatchup: boolean;
  comment?: string | null;
}

export interface AttendanceSheetApi {
  id: string;
  sessionId: string;
  cohortId: string;
  expectedMinutes: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  totalMissedMinutes: number;
  entries: AttendanceEntryApi[];
}

export interface SaveAttendanceApiRequest {
  entries: Array<{
    enrollmentId: string;
    status: Exclude<AttendanceStatus, "pending">;
    arrivalAtUtc?: string | null;
    departureAtUtc?: string | null;
    presentMinutes?: number | null;
    addToCatchup: boolean;
    comment?: string | null;
  }>;
}

@Injectable({ providedIn: "root" })
export class TrainingDeliveryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/training-sessions`;

  list(
    cohortId?: string,
    fromUtc?: string,
    toUtc?: string,
  ): Promise<TrainingSessionApi[]> {
    let params = new HttpParams();
    if (cohortId) params = params.set("cohortId", cohortId);
    if (fromUtc) params = params.set("fromUtc", fromUtc);
    if (toUtc) params = params.set("toUtc", toUtc);
    return firstValueFrom(
      this.http.get<TrainingSessionApi[]>(this.baseUrl, { params }),
    );
  }

  get(id: string): Promise<TrainingSessionApi> {
    return firstValueFrom(
      this.http.get<TrainingSessionApi>(`${this.baseUrl}/${id}`),
    );
  }

  create(
    request: CreateTrainingSessionApiRequest,
  ): Promise<TrainingSessionApi> {
    return firstValueFrom(
      this.http.post<TrainingSessionApi>(this.baseUrl, request),
    );
  }

  update(
    id: string,
    request: Omit<CreateTrainingSessionApiRequest, "cohortId" | "externalKey">,
  ): Promise<TrainingSessionApi> {
    return firstValueFrom(
      this.http.put<TrainingSessionApi>(`${this.baseUrl}/${id}`, request),
    );
  }

  cancel(id: string): Promise<TrainingSessionApi> {
    return firstValueFrom(
      this.http.post<TrainingSessionApi>(`${this.baseUrl}/${id}/cancel`, {}),
    );
  }

  complete(id: string): Promise<TrainingSessionApi> {
    return firstValueFrom(
      this.http.post<TrainingSessionApi>(`${this.baseUrl}/${id}/complete`, {}),
    );
  }

  getAttendance(id: string): Promise<AttendanceSheetApi> {
    return firstValueFrom(
      this.http.get<AttendanceSheetApi>(`${this.baseUrl}/${id}/attendance`),
    );
  }

  saveAttendance(
    id: string,
    request: SaveAttendanceApiRequest,
  ): Promise<AttendanceSheetApi> {
    return firstValueFrom(
      this.http.put<AttendanceSheetApi>(
        `${this.baseUrl}/${id}/attendance`,
        request,
      ),
    );
  }
}
