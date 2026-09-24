import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import {
  AuditEntry,
  CohortDashboard,
  OrganizationDashboard,
  PagedAudit,
  ReportingTrendPoint,
  SiteDashboard,
} from "./reporting.models";

@Injectable({ providedIn: "root" })
export class ReportingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/reporting`;

  organizationDashboard(organizationId: string): Observable<OrganizationDashboard> {
    return this.http.get<OrganizationDashboard>(
      `${this.base}/organizations/${organizationId}/dashboard`,
    );
  }

  siteDashboard(siteId: string): Observable<SiteDashboard> {
    return this.http.get<SiteDashboard>(`${this.base}/sites/${siteId}/dashboard`);
  }

  cohortDashboard(cohortId: string): Observable<CohortDashboard> {
    return this.http.get<CohortDashboard>(
      `${this.base}/cohorts/${cohortId}/dashboard`,
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

  audit(filters: {
    organizationId?: string;
    action?: string;
    entityType?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  } = {}): Observable<PagedAudit> {
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
