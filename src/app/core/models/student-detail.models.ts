// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

import type { StudentDirectoryItem } from "./students.models";
import type { StudentStatus } from "./app.models";

export type StudentDetailTab =
  | "overview"
  | "hours"
  | "driving"
  | "skills"
  | "sheets"
  | "attendance"
  | "internships"
  | "evaluations"
  | "documents"
  | "certification"
  | "history";

export type HourCategoryKey =
  | "classroom"
  | "driving"
  | "internship"
  | "presentation"
  | "assessment"
  | "awareness"
  | "catchup"
  | "absence"
  | "other";

export interface StudentHourRow {
  key: HourCategoryKey;
  planned: number;
  completed: number;
  catchup: number;
}

export interface StudentAttendanceRow {
  date: string;
  sessionKey: string;
  status: "present" | "late" | "absent" | "excused";
  missedHours: string;
}

export interface StudentEvaluationRow {
  date: string;
  titleKey: string;
  resultKey: string;
  tone: "success" | "warning" | "danger" | "info";
  evaluator: string;
}

export interface StudentDocumentRow {
  id: string;
  titleKey: string;
  categoryKey: string;
  date: string;
  size: string;
}

export interface StudentTimelineRow {
  dateKey: string;
  titleKey: string;
  detailKey: string;
  tone: "success" | "danger" | "warning" | "info";
}

export interface StudentDetailProfile extends StudentDirectoryItem {
  email: string;
  startDate: string;
  expectedEndDate: string;
  plannedHours: number;
  absences: number;
  delays: number;
  reworkSheets: number;
  totalSheets: number;
  skills: Record<"C1" | "C2" | "C3" | "C4", number>;
  hours: StudentHourRow[];
  attendance: StudentAttendanceRow[];
  evaluations: StudentEvaluationRow[];
  documents: StudentDocumentRow[];
  timeline: StudentTimelineRow[];
}
