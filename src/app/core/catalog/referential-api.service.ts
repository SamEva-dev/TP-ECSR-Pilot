import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
export interface ReferentialApiDto {
  id: string;
  key: string;
  referentialId: string;
  programId: string;
  programKey: string;
  code: string;
  name: string;
  version: string;
  certificationCode?: string | null;
  status: "active" | "draft" | "archived";
  effectiveFrom: string;
  effectiveTo?: string | null;
  totalHours: number;
  sheetCount: number;
  requiredDocumentCount: number;
  enabledModules: string[];
  notesKey?: string | null;
}
export interface ReferentialCompetencyDetailApiDto {
  id: string;
  parentId?: string | null;
  code: string;
  title: string;
  kind: string;
  sortOrder: number;
}
export interface ReferentialCertificationStepDetailApiDto {
  id: string;
  code: string;
  title: string;
  kind: string;
  durationMinutes: number;
  sortOrder: number;
}
export interface ReferentialLinkedCohortApiDto {
  id: string;
  key: string;
  name: string;
  siteName: string;
  startDate: string;
  endDate: string;
  studentCount: number;
  status: string;
}
export interface ReferentialVersionDetailsApiDto {
  versionId: string;
  topicCount: number;
  competencies: ReferentialCompetencyDetailApiDto[];
  workplacePeriodTypes: string[];
  certificationSchemeName: string;
  certificationSteps: ReferentialCertificationStepDetailApiDto[];
  linkedCohorts: ReferentialLinkedCohortApiDto[];
}
@Injectable({ providedIn: "root" })
export class ReferentialApiService {
  private readonly http = inject(HttpClient);
  list() {
    return firstValueFrom(
      this.http.get<ReferentialApiDto[]>(
        `${environment.apiBaseUrl}/api/v1/referentials`,
      ),
    );
  }
  details(versionId: string) {
    return firstValueFrom(
      this.http.get<ReferentialVersionDetailsApiDto>(
        `${environment.apiBaseUrl}/api/v1/referential-versions/${encodeURIComponent(versionId)}`,
      ),
    );
  }
  createVersion(referentialId: string, body: unknown) {
    return firstValueFrom(
      this.http.post<ReferentialApiDto>(
        `${environment.apiBaseUrl}/api/v1/referentials/${referentialId}/versions`,
        body,
      ),
    );
  }
  publish(versionId: string) {
    return firstValueFrom(
      this.http.post<ReferentialApiDto>(
        `${environment.apiBaseUrl}/api/v1/referential-versions/${versionId}/publish`,
        {},
      ),
    );
  }
}
