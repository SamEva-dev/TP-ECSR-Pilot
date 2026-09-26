import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";

export interface OrganizationAdministrationDto {
  organizationId: string;
  code: string;
  legalName: string;
  shortName: string;
  siret: string;
  trainingDeclarationNumber: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  managerName: string;
  primaryColor: string;
  secondaryColor: string;
  loginTagline: string;
  logoLabel: string;
  whiteLabel: boolean;
  allowSiteOverrides: boolean;
  enabledModules: string[];
  absenceAlerts: boolean;
  certificationAlerts: boolean;
  weeklyDigest: boolean;
  autoArchive: boolean;
  strictAudit: boolean;
  language: string;
  timezone: string;
  dateFormat: string;
  academicYear: string;
  remoteWorkEnabled: boolean;
  remoteWorkApprovalRequired: boolean;
  remoteWorkMaxDaysPerWeek: number;
  remoteWorkHalfDayAllowed: boolean;
  remoteWorkEndOfDayReport: boolean;
}

export type UpdateOrganizationAdministrationRequest = Omit<OrganizationAdministrationDto, "organizationId" | "code">;

@Injectable({ providedIn: "root" })
export class OrganizationAdministrationApiService {
  private readonly http = inject(HttpClient);
  get(organizationId: string) {
    return this.http.get<OrganizationAdministrationDto>(`${environment.apiBaseUrl}/api/v1/organizations/${encodeURIComponent(organizationId)}/administration`);
  }
  update(organizationId: string, request: UpdateOrganizationAdministrationRequest) {
    return this.http.put<OrganizationAdministrationDto>(`${environment.apiBaseUrl}/api/v1/organizations/${encodeURIComponent(organizationId)}/administration`, request);
  }
}
