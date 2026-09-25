// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

import type { StudentStatus } from "./app.models";

export interface StudentDirectoryItem {
  id: string;
  enrollmentId?: string;
  firstName: string;
  lastName: string;
  promotionId: string;
  promotionName: string;
  progress: number;
  completedHours: number;
  catchupHours: number;
  preparedSheets: number;
  presentedSheets: number;
  validatedSheets: number;
  status: StudentStatus;
  enrollmentStatus?:
    | "pending"
    | "active"
    | "suspended"
    | "completed"
    | "withdrawn"
    | "cancelled";
}
