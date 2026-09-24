// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

import type { AppPermission } from "../access/access.models";
import type { MembershipRole } from "./workspace.models";

export type AttentionLevel = "info" | "warning" | "danger";

export interface AttentionMockItem {
  id: string;
  audiences: MembershipRole[];
  titleKey: string;
  detailKey: string;
  level: AttentionLevel;
  icon: string;
  path: string;
  permission: AppPermission;
  programIds?: string[];
  cohortIds?: string[];
}
