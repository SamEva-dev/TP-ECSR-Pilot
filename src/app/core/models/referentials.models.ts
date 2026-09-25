// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

import type { ProgramModule } from "./workspace.models";

export type ReferentialStatus = "active" | "draft" | "archived";

export type VolumeCategory =
  "classroom" | "driving" | "internship" | "assessment" | "other";

export interface ReferentialSubCompetency {
  id: string;
  code: string;
  label: string;
}

export interface ReferentialCompetency {
  id: string;
  code: string;
  label: string;
  description: string;
  subCompetencies: ReferentialSubCompetency[];
}

export interface ReferentialVolume {
  id: string;
  label: string;
  category: VolumeCategory;
  hours: number;
  mandatory: boolean;
}

export interface ReferentialStageRequirement {
  id: string;
  label: string;
  hours: number;
  description: string;
  mandatory: boolean;
}

export interface ReferentialCertificationStep {
  id: string;
  label: string;
  durationMinutes: number;
  evaluator: "jury" | "trainer" | "system";
}

export interface TrainingReferential {
  id: string;
  apiId?: string;
  programId: string;
  code: string;
  name: string;
  version: string;
  status: ReferentialStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  totalHours: number;
  enabledModules: ProgramModule[];
  competencies: ReferentialCompetency[];
  volumes: ReferentialVolume[];
  sheetCount: number;
  stageRequirements: ReferentialStageRequirement[];
  requiredDocumentCount: number;
  certificationSchemeName: string;
  certificationSteps: ReferentialCertificationStep[];
  notes: string;
}

export interface ReferentialVersionFormValue {
  programId: string;
  sourceReferentialId: string;
  version: string;
  code: string;
  effectiveFrom: string;
  status: ReferentialStatus;
}
