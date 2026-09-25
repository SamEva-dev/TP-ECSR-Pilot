// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export type ExamSessionStatus =
  "preparation" | "ready" | "running" | "deliberation" | "published" | "closed";

export type ExamStepStatus = "done" | "planned" | "in_progress";

export type CertificationResult =
  "pending" | "obtained" | "partial" | "failed" | "absent";

export interface ExamStep {
  id: string;
  labelKey: string;
  duration: string;
  status: ExamStepStatus;
  date?: string;
  time?: string;
}

export type CertificationUnitStatus = "validated" | "pending" | "not_validated";

export interface CertificationCandidate {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  candidateNumber: string;
  promotionId: string;
  ready: boolean;
  missingKeys: string[];
  completedHours: number;
  plannedHours: number;
  documentsReady: number;
  documentsTotal: number;
  ccp1: "validated" | "pending" | "not_validated";
  ccp2: "validated" | "pending" | "not_validated";
  result: CertificationResult;
  published: boolean;
  examTime: string;
  steps: ExamStep[];
  programId?: string;
  schemeId?: string;
  unitStatuses?: { unitId: string; status: CertificationUnitStatus }[];
}

export interface JuryMember {
  id: string;
  firstName: string;
  lastName: string;
  professionKey: string;
  organisation: string;
  habilitation: string;
  validUntil: string;
  active: boolean;
  programIds?: string[];
}

export interface ExamSession {
  id: string;
  name: string;
  promotionId: string;
  promotionName: string;
  centre: string;
  location: string;
  startDate: string;
  endDate: string;
  status: ExamSessionStatus;
  candidateIds: string[];
  juryIds: string[];
  programId?: string;
  schemeId?: string;
}

export interface CertificationSchemeUnit {
  id: string;
  labelKey: string;
  shortLabel: string;
}

export interface CertificationSchemeStepDefinition {
  id: string;
  labelKey: string;
  duration: string;
}

export interface CertificationJuryCriterion {
  id: string;
  labelKey: string;
}

export interface CertificationScheme {
  id: string;
  programId: string;
  code: string;
  nameKey: string;
  version: string;
  requiredDocuments: number;
  units: CertificationSchemeUnit[];
  steps: CertificationSchemeStepDefinition[];
  juryCriteria: CertificationJuryCriterion[];
}

export interface SuccessPromotion {
  id: string;
  promotionName: string;
  year: string;
  enrolled: number;
  presented: number;
  graduated: number;
  partial: number;
  failed: number;
  absent: number;
  rate: number;
}

export type SuccessCandidateResult =
  "obtained" | "partial" | "failed" | "absent";

export interface SuccessCandidateDetail {
  id: string;
  promotionId: string;
  candidateNumber: string;
  firstName: string;
  lastName: string;
  ccp1: boolean;
  ccp2: boolean;
  result: SuccessCandidateResult;
  session: string;
}
