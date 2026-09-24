// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

import type { ProgramModule } from "./workspace.models";

export type ProgramCatalogStatus = "active" | "draft" | "inactive";

export type ProgramCatalogCategory = string;

export interface ProgramCatalogItem {
  id: string;
  apiId?: string;
  code: string;
  name: string;
  category: ProgramCatalogCategory;
  icon: string;
  description: string;
  referenceVersion: string;
  durationHours: number;
  enabledModules: ProgramModule[];
  siteIds: string[];
  status: ProgramCatalogStatus;
  students: number;
  trainers: number;
  activeCohorts: number;
  successRate: number | null;
}

export interface ProgramFormValue {
  code: string;
  name: string;
  category: ProgramCatalogCategory;
  description: string;
  referenceVersion: string;
  durationHours: number;
  status: ProgramCatalogStatus;
  enabledModules: ProgramModule[];
}
