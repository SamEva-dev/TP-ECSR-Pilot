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
  verificationStatus:
    "Unverified" | "Pending" | "Verified" | "Rejected" | string;
  verificationSubmittedAtUtc: string | null;
  verifiedAtUtc: string | null;
  verificationComment: string;
  onboardingCompleted: boolean;
  onboardingCompletedAtUtc: string | null;
  subscriptionPlan: string;
  subscriptionStatus:
    "Trial" | "Active" | "PastDue" | "Suspended" | "Cancelled" | string;
  trialEndsAtUtc: string | null;
  billingCustomerReference: string;
}

export type UpdateOrganizationAdministrationRequest = Omit<
  OrganizationAdministrationDto,
  | "organizationId"
  | "code"
  | "verificationStatus"
  | "verificationSubmittedAtUtc"
  | "verifiedAtUtc"
  | "verificationComment"
  | "onboardingCompleted"
  | "onboardingCompletedAtUtc"
  | "subscriptionPlan"
  | "subscriptionStatus"
  | "trialEndsAtUtc"
  | "billingCustomerReference"
>;

@Injectable({ providedIn: "root" })
export class OrganizationAdministrationApiService {
  private readonly http = inject(HttpClient);
  get(organizationId: string) {
    return this.http.get<OrganizationAdministrationDto>(
      `${environment.apiBaseUrl}/api/v1/organizations/${encodeURIComponent(organizationId)}/administration`,
    );
  }
  update(
    organizationId: string,
    request: UpdateOrganizationAdministrationRequest,
  ) {
    return this.http.put<OrganizationAdministrationDto>(
      `${environment.apiBaseUrl}/api/v1/organizations/${encodeURIComponent(organizationId)}/administration`,
      request,
    );
  }
  submitVerification(organizationId: string) {
    return this.http.post<OrganizationAdministrationDto>(
      `${environment.apiBaseUrl}/api/v1/organizations/${encodeURIComponent(organizationId)}/administration/verification/submit`,
      {},
    );
  }
  completeOnboarding(organizationId: string) {
    return this.http.post<OrganizationAdministrationDto>(
      `${environment.apiBaseUrl}/api/v1/organizations/${encodeURIComponent(organizationId)}/administration/onboarding/complete`,
      {},
    );
  }
}
