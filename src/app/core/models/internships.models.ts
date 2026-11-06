// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export type InternshipStatus =
  "completed" | "incomplete" | "inProgress" | "planned" | "cancelled" | "archived" | "deleted";

export type InternshipActivityStatus = "done" | "pending" | "notApplicable";

export interface InternshipActivity {
  labelKey: string;
  status: InternshipActivityStatus;
}

export interface InternshipDocument {
  labelKey: string;
  status: "available" | "validated" | "missing";
}

export interface InternshipEvaluation {
  id: string;
  kind: string;
  evaluatorDisplayName: string;
  evaluatedAtUtc: string;
  summary: string;
  strengths: string;
  improvementAreas: string;
  validated: boolean | null;
}

export interface InternshipPeriod {
  id: string;
  studentId: string;
  studentName: string;
  company: string;
  city: string;
  tutor: string;
  tutorEmail: string;
  tutorPhone: string;
  startDate: string;
  endDate: string;
  plannedHours: number;
  completedHours: number;
  status: InternshipStatus;
  trainerVisible: boolean;
  activities: InternshipActivity[];
  tutorObservationKey: string;
  documents: InternshipDocument[];
  evaluations: InternshipEvaluation[];
}
