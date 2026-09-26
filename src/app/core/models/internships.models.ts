// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export type InternshipStatus =
  "completed" | "incomplete" | "inProgress" | "planned" | "cancelled";

export type InternshipActivityStatus = "done" | "pending" | "notApplicable";

export interface InternshipActivity {
  labelKey: string;
  status: InternshipActivityStatus;
}

export interface InternshipDocument {
  labelKey: string;
  status: "available" | "validated" | "missing";
}

export interface InternshipPeriod {
  id: string;
  studentId: string;
  studentName: string;
  company: string;
  city: string;
  tutor: string;
  startDate: string;
  endDate: string;
  plannedHours: number;
  completedHours: number;
  status: InternshipStatus;
  trainerVisible: boolean;
  activities: InternshipActivity[];
  tutorObservationKey: string;
  documents: InternshipDocument[];
}
