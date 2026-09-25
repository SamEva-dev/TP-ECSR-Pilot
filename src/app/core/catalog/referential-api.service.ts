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
