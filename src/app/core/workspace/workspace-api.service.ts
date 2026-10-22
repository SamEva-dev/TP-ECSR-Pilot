import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
export interface WorkspaceOrganizationApi {
  id: string;
  key: string;
  code: string;
  name: string;
  shortName: string;
  city: string;
  active: boolean;
  primaryColor: string;
  secondaryColor: string;
}
export interface WorkspaceSiteApi {
  id: string;
  key: string;
  organizationId: string;
  organizationKey: string;
  code: string;
  name: string;
  city: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  manager: string;
  managerAuthGateUserId?: string | null;
  status: "active" | "attention" | "inactive" | string;
  active: boolean;
}
export interface WorkspaceProgramApi {
  id: string;
  key: string;
  code: string;
  name: string;
  familyCode: string;
  category: string;
  icon: string;
  descriptionKey: string;
  durationHours: number;
  status: string;
  enabledModules: string[];
  siteKeys: string[];
  referenceVersion?: string | null;
}
export interface WorkspaceOfferingApi {
  id: string;
  key: string;
  siteId: string;
  siteKey: string;
  programId: string;
  programKey: string;
  active: boolean;
}
export interface WorkspaceCohortApi {
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
  status: string;
}
export interface WorkspaceBootstrapApi {
  organizations: WorkspaceOrganizationApi[];
  sites: WorkspaceSiteApi[];
  programs: WorkspaceProgramApi[];
  offerings: WorkspaceOfferingApi[];
  cohorts: WorkspaceCohortApi[];
  defaultSelection?: {
    organizationId: string;
    siteId?: string | null;
    programId?: string | null;
    cohortId?: string | null;
  } | null;
}
@Injectable({ providedIn: "root" })
export class WorkspaceApiService {
  private readonly http = inject(HttpClient);
  async load(): Promise<WorkspaceBootstrapApi> {
    const response = await firstValueFrom(
      this.http.get<WorkspaceBootstrapApi | null>(
        `${environment.apiBaseUrl}/api/v1/me/workspace`,
      ),
    );
    return normalizeWorkspaceBootstrapResponse(response);
  }
}

/**
 * The HTTP boundary must never let null or malformed collections reach UI projections.
 * Broken records without stable server identifiers are omitted, not replaced by mock IDs.
 * This is presentation hardening; authorization and tenant boundaries remain server-owned.
 */
export function normalizeWorkspaceBootstrapResponse(
  response: WorkspaceBootstrapApi | null | undefined,
): WorkspaceBootstrapApi {
  const source = record(response);
  return {
    organizations: records(source["organizations"])
      .map((x) => ({
        id: text(x["id"]), key: text(x["key"]), code: text(x["code"]),
        name: text(x["name"]), shortName: text(x["shortName"]),
        city: text(x["city"]), active: x["active"] === true,
        primaryColor: text(x["primaryColor"]), secondaryColor: text(x["secondaryColor"]),
      }))
      .filter((x) => !!x.id && !!x.key),
    sites: records(source["sites"])
      .map((x) => ({
        id: text(x["id"]), key: text(x["key"]),
        organizationId: text(x["organizationId"]),
        organizationKey: text(x["organizationKey"]),
        code: text(x["code"]), name: text(x["name"]), city: text(x["city"]),
        address: text(x["address"]), postalCode: text(x["postalCode"]),
        phone: text(x["phone"]), email: text(x["email"]),
        manager: text(x["manager"]), managerAuthGateUserId: text(x["managerAuthGateUserId"]) || null, status: text(x["status"]),
        active: x["active"] === true,
      }))
      .filter((x) => !!x.id && !!x.key),
    programs: records(source["programs"])
      .map((x) => ({
        id: text(x["id"]), key: text(x["key"]), code: text(x["code"]),
        name: text(x["name"]), familyCode: text(x["familyCode"]),
        category: text(x["category"]), icon: text(x["icon"]),
        descriptionKey: text(x["descriptionKey"]),
        durationHours: finiteNumber(x["durationHours"]), status: text(x["status"]),
        enabledModules: strings(x["enabledModules"]), siteKeys: strings(x["siteKeys"]),
        referenceVersion: text(x["referenceVersion"]) || null,
      }))
      .filter((x) => !!x.id && !!x.key),
    offerings: records(source["offerings"])
      .map((x) => ({
        id: text(x["id"]), key: text(x["key"]), siteId: text(x["siteId"]),
        siteKey: text(x["siteKey"]), programId: text(x["programId"]),
        programKey: text(x["programKey"]), active: x["active"] === true,
      }))
      .filter((x) => !!x.id && !!x.key),
    cohorts: records(source["cohorts"])
      .map((x) => ({
        id: text(x["id"]), key: text(x["key"]),
        organizationId: text(x["organizationId"]), siteId: text(x["siteId"]),
        programOfferingId: text(x["programOfferingId"]),
        referentialVersionId: text(x["referentialVersionId"]),
        code: text(x["code"]), name: text(x["name"]),
        startDate: text(x["startDate"]), endDate: text(x["endDate"]),
        capacity: finiteNumber(x["capacity"]),
        learnerCount: finiteNumber(x["learnerCount"]), status: text(x["status"]),
      }))
      .filter((x) => !!x.id && !!x.key),
    defaultSelection: normalizeSelection(source["defaultSelection"]),
  };
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item) => !!item && typeof item === "object" && !Array.isArray(item))
    : [];
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}
function normalizeSelection(value: unknown): WorkspaceBootstrapApi["defaultSelection"] {
  const x = record(value);
  const organizationId = text(x["organizationId"]);
  return organizationId ? {
    organizationId,
    siteId: text(x["siteId"]),
    programId: text(x["programId"]),
    cohortId: text(x["cohortId"]),
  } : null;
}
