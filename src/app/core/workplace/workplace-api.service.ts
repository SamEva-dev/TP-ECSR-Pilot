import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import type {
  CohortLearnerDto,
  CreateWorkplacePeriodPayload,
  WorkplacePeriodDto,
} from "./workplace.models";
import { environment } from "../../environments/environment";
@Injectable({ providedIn: "root" })
export class WorkplaceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1`;
  getPeriods(cohortId: string) {
    return firstValueFrom(
      this.http.get<WorkplacePeriodDto[]>(`${this.base}/workplace/periods`, {
        params: new HttpParams().set("cohortId", cohortId),
      }),
    );
  }
  getMyPeriods(enrollmentId: string) {
    return firstValueFrom(
      this.http.get<WorkplacePeriodDto[]>(`${this.base}/workplace/periods`, {
        params: new HttpParams().set("enrollmentId", enrollmentId),
      }),
    );
  }
  getPeriodTypes(referentialVersionId: string) {
    return firstValueFrom(
      this.http.get<string[]>(
        `${this.base}/workplace/referentials/${encodeURIComponent(referentialVersionId)}/period-types`,
      ),
    );
  }
  getLearners(cohortId: string) {
    return firstValueFrom(
      this.http.get<CohortLearnerDto[]>(
        `${this.base}/cohorts/${encodeURIComponent(cohortId)}/learners`,
      ),
    );
  }
  createPeriod(payload: CreateWorkplacePeriodPayload) {
    return firstValueFrom(
      this.http.post<WorkplacePeriodDto>(
        `${this.base}/workplace/periods`,
        payload,
      ),
    );
  }
  updateHours(
    id: string,
    completedHours: number,
    tutorObservation: string | null,
  ) {
    return firstValueFrom(
      this.http.put<WorkplacePeriodDto>(
        `${this.base}/workplace/periods/${encodeURIComponent(id)}/hours`,
        { completedHours, tutorObservation },
      ),
    );
  }
  updateActivity(
    id: string,
    activityId: string,
    status: "pending" | "done" | "notApplicable",
    comment: string | null,
  ) {
    return firstValueFrom(
      this.http.put<WorkplacePeriodDto>(
        `${this.base}/workplace/periods/${encodeURIComponent(id)}/activities/${encodeURIComponent(activityId)}`,
        { status, comment },
      ),
    );
  }
  updateDocument(
    id: string,
    itemId: string,
    status: "missing" | "available" | "validated",
    documentId: string | null,
  ) {
    return firstValueFrom(
      this.http.put<WorkplacePeriodDto>(
        `${this.base}/workplace/periods/${encodeURIComponent(id)}/documents/${encodeURIComponent(itemId)}`,
        { status, documentId },
      ),
    );
  }
  recordEvaluation(
    id: string,
    request: {
      kind: "tutor" | "trainer" | "selfAssessment" | "final";
      evaluatorDisplayName: string;
      evaluatedAtUtc: null;
      summary: string;
      strengths: string | null;
      improvementAreas: string | null;
      validated: boolean | null;
    },
  ) {
    return firstValueFrom(
      this.http.post<WorkplacePeriodDto>(
        `${this.base}/workplace/periods/${encodeURIComponent(id)}/evaluations`,
        request,
      ),
    );
  }
}
