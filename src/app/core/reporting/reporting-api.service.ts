import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import {
  AuditEntry,
  CohortDashboard,
  CohortDrivingObservation,
  CohortLearnerDashboard,
  OrganizationDashboard,
  PagedAudit,
  ReportingTrendPoint,
  SiteDashboard,
  LearnerDetailReport,
  CertificationSuccessRecord,
} from "./reporting.models";

@Injectable({ providedIn: "root" })
export class ReportingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/reporting`;

  organizationDashboard(
    organizationId: string,
  ): Observable<OrganizationDashboard> {
    return this.http.get<OrganizationDashboard>(
      `${this.base}/organizations/${organizationId}/dashboard`,
    );
  }

  siteDashboard(siteId: string): Observable<SiteDashboard> {
    return this.http.get<SiteDashboard>(
      `${this.base}/sites/${siteId}/dashboard`,
    );
  }

  cohortDashboard(cohortId: string): Observable<CohortDashboard> {
    return this.http.get<CohortDashboard>(
      `${this.base}/cohorts/${cohortId}/dashboard`,
    );
  }

  cohortLearners(cohortId: string): Observable<CohortLearnerDashboard[]> {
    return this.http.get<CohortLearnerDashboard[]>(
      `${this.base}/cohorts/${cohortId}/learners`,
    );
  }

  cohortDrivingObservations(cohortId: string, take = 20): Observable<CohortDrivingObservation[]> {
    const params = new HttpParams().set("take", String(Math.max(1, take)));
    return this.http.get<CohortDrivingObservation[]>(
      `${this.base}/cohorts/${cohortId}/driving-observations`,
      { params },
    );
  }

  myLearnerDashboard(cohortId?: string): Observable<CohortLearnerDashboard> {
    const params = cohortId ? new HttpParams().set("cohortId", cohortId) : undefined;
    return this.http.get<CohortLearnerDashboard>(
      `${this.base}/learners/me/dashboard`,
      { params },
    );
  }

  learnerDetail(learnerProfileId: string, cohortId?: string): Observable<LearnerDetailReport> {
    const params = cohortId ? new HttpParams().set("cohortId", cohortId) : undefined;
    return this.http.get<LearnerDetailReport>(
      `${this.base}/learners/${learnerProfileId}/detail`,
      { params },
    );
  }

  myLearnerDetail(cohortId?: string): Observable<LearnerDetailReport> {
    const params = cohortId ? new HttpParams().set("cohortId", cohortId) : undefined;
    return this.http.get<LearnerDetailReport>(
      `${this.base}/learners/me/detail`,
      { params },
    );
  }

  certificationSuccess(organizationId: string): Observable<CertificationSuccessRecord[]> {
    return this.http.get<CertificationSuccessRecord[]>(
      `${this.base}/organizations/${organizationId}/certification-success`,
    );
  }

  attendanceTrend(
    cohortId: string,
    from: string,
    to: string,
  ): Observable<ReportingTrendPoint[]> {
    const params = new HttpParams().set("from", from).set("to", to);
    return this.http.get<ReportingTrendPoint[]>(
      `${this.base}/cohorts/${cohortId}/attendance-trend`,
      { params },
    );
  }

  audit(
    filters: {
      organizationId?: string;
      action?: string;
      entityType?: string;
      userId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ): Observable<PagedAudit> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PagedAudit>(`${this.base}/audit`, { params });
  }

  exportCohort(cohortId: string): Observable<Blob> {
    return this.http.get(`${this.base}/cohorts/${cohortId}/export`, {
      responseType: "blob",
    });
  }
}
