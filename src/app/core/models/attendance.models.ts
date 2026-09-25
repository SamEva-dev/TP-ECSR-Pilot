// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export type AttendanceStatus =
  "pending" | "present" | "late" | "absent" | "excused";

export interface AttendanceStudent {
  id: string;
  firstName: string;
  lastName: string;
  catchupHours: number;
  absences: number;
  status: AttendanceStatus;
  arrival: string;
  departure: string;
  duration: number;
  comment: string;
  missedHours: number;
  addToCatchup: boolean;
}
