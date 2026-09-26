import type { ProgramModule } from "./workspace.models";

export type ReferentialStatus = "active" | "draft" | "archived";
export type VolumeCategory = "classroom" | "driving" | "internship" | "assessment" | "other";

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

export interface ReferentialLinkedCohort {
  id: string;
  name: string;
  siteName: string;
  start: string;
  end: string;
  studentCount: number;
  status: string;
}

export interface ReferentialCertificationStep {
  id: string;
  label: string;
  durationMinutes: number;
  evaluator: "jury" | "trainer" | "system";
}

/** Safe UI projection returned from PedagoraPilot. Arrays are always initialized. */
export interface TrainingReferential {
  id: string;
  apiId: string;
  referentialId: string;
  programId: string;
  code: string;
  name: string;
  version: string;
  certificationCode: string | null;
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
  linkedCohorts: ReferentialLinkedCohort[];
  notes: string;
  notesKey: string | null;
}

export interface ReferentialVersionFormValue {
  programId: string;
  sourceReferentialId: string;
  version: string;
  code: string;
  effectiveFrom: string;
  status: "draft" | "active";
}
