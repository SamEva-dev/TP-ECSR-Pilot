import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";

export interface CreateCohortRequest {
  programOfferingId: string;
  referentialVersionId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  capacity: number;
  externalKey: string | null;
}

export interface CohortResponse {
  id: string;
  key: string;
  organizationId: string;
  siteId: string;
  programOfferingId: string;
  referentialVersionId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  capacity: number;
  learnerCount: number;
  status: "draft" | "planned" | "active" | "completed" | "cancelled";
}

export interface UpdateCohortRequest {
  name: string;
  startDate: string;
  endDate: string;
  capacity: number;
  status: CohortResponse["status"];
}

export interface EnrollLearnerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  enrolledOn: string | null;
  authGateUserId: string | null;
  personExternalKey: string | null;
  learnerExternalKey: string | null;
  enrollmentExternalKey: string | null;
}

export interface LearnerResponse {
  enrollmentId: string;
  learnerProfileId: string;
  personId: string;
  cohortId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  enrollmentStatus: string;
  enrolledOn: string;
  externalKey: string | null;
}

@Injectable({ providedIn: "root" })
export class TrainingCatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/cohorts`;

  list(filters: {
    organizationId?: string;
    siteId?: string;
    programId?: string;
  } = {}): Promise<CohortResponse[]> {
    let params = new HttpParams();
    if (filters.organizationId) params = params.set("organizationId", filters.organizationId);
    if (filters.siteId) params = params.set("siteId", filters.siteId);
    if (filters.programId) params = params.set("programId", filters.programId);
    return firstValueFrom(this.http.get<CohortResponse[]>(this.baseUrl, { params }));
  }

  createCohort(request: CreateCohortRequest): Promise<CohortResponse> {
    return firstValueFrom(this.http.post<CohortResponse>(this.baseUrl, request));
  }

  updateCohort(id: string, request: UpdateCohortRequest): Promise<CohortResponse> {
    return firstValueFrom(
      this.http.put<CohortResponse>(`${this.baseUrl}/${encodeURIComponent(id)}`, request),
    );
  }

  enroll(cohortId: string, request: EnrollLearnerRequest): Promise<LearnerResponse> {
    return firstValueFrom(
      this.http.post<LearnerResponse>(
        `${this.baseUrl}/${encodeURIComponent(cohortId)}/learners`,
        request,
      ),
    );
  }
}
