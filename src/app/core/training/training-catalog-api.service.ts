import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";

export interface CreateCohortRequest {
  programOfferingId: string;
  referentialVersionId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  capacity: number;
  externalKey: null;
}

export interface CohortResponse {
  id: string;
  key: string;
  learnerCount: number;
}

export interface EnrollLearnerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  enrolledOn: string;
  authGateUserId: null;
  personExternalKey: null;
  learnerExternalKey: null;
  enrollmentExternalKey: null;
}

export interface LearnerResponse {
  enrollmentId: string;
  learnerProfileId: string;
  cohortId: string;
  firstName: string;
  lastName: string;
}

@Injectable({ providedIn: "root" })
export class TrainingCatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/cohorts`;

  createCohort(request: CreateCohortRequest) {
    return this.http.post<CohortResponse>(this.baseUrl, request);
  }

  enroll(cohortId: string, request: EnrollLearnerRequest) {
    return this.http.post<LearnerResponse>(
      `${this.baseUrl}/${encodeURIComponent(cohortId)}/learners`,
      request,
    );
  }
}
