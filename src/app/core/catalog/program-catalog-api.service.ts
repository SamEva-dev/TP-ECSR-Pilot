import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
export interface ProgramApiDto {
  id: string;
  key: string;
  code: string;
  name: string;
  familyCode: string;
  category: string;
  icon: string;
  descriptionKey: string;
  durationHours: number;
  status: "active" | "draft" | "inactive";
  enabledModules: string[];
  siteKeys: string[];
  referenceVersion?: string | null;
}

export interface CreateProgramApiRequest {
  familyCode: string;
  code: string;
  name: string;
  descriptionKey: string;
  referenceVersion: string;
  icon: string;
  durationHours: number;
  status: string;
  enabledModules: string[];
  externalKey: string | null;
}

export interface UpdateProgramApiRequest {
  familyCode: string;
  name: string;
  descriptionKey: string;
  referenceVersion: string;
  icon: string;
  durationHours: number;
  status: string;
  enabledModules: string[];
}

@Injectable({ providedIn: "root" })
export class ProgramCatalogApiService {
  private readonly http = inject(HttpClient);
  list(organizationId?: string) {
    const q = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    return firstValueFrom(
      this.http.get<ProgramApiDto[]>(
        `${environment.apiBaseUrl}/api/v1/programs${q}`,
      ),
    );
  }
  create(body: CreateProgramApiRequest) {
    return firstValueFrom(
      this.http.post<ProgramApiDto>(
        `${environment.apiBaseUrl}/api/v1/programs`,
        body,
      ),
    );
  }
  update(id: string, body: UpdateProgramApiRequest) {
    return firstValueFrom(
      this.http.put<ProgramApiDto>(
        `${environment.apiBaseUrl}/api/v1/programs/${id}`,
        body,
      ),
    );
  }
  setOffering(programId: string, siteId: string, active: boolean) {
    return firstValueFrom(
      this.http.put(
        `${environment.apiBaseUrl}/api/v1/programs/${programId}/sites/${siteId}/offering`,
        { active },
      ),
    );
  }
}
