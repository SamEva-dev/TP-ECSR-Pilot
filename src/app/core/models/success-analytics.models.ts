// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export type SuccessOutcome = "obtained" | "partial" | "failed" | "absent";

export interface SuccessCandidateDetail {
  id: string;
  firstName: string;
  lastName: string;
  candidateNumber: string;
  session: string;
  result: SuccessOutcome;
  unitResults: Array<{ code: string; validated: boolean }>;
}

export interface SuccessAnalyticsRecord {
  id: string;
  organizationId: string;
  siteId: string;
  programId: string;
  cohortName: string;
  year: string;
  session: string;
  presented: number;
  graduated: number;
  partial: number;
  failed: number;
  absent: number;
  rate: number;
  candidates: SuccessCandidateDetail[];
}
