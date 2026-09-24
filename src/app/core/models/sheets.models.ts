// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

import type { StudentDirectoryItem } from "./students.models";

export type SheetStatus =
  | "not_started"
  | "in_progress"
  | "ready"
  | "presented"
  | "validated"
  | "rework";

export type EvaluationLevel = "acquired" | "in_progress" | "review";

export interface PedagogicalSheet {
  number: number;
  titleKey: string;
  status: SheetStatus;
  preparationDate?: string;
  presentationDate?: string;
  durationMinutes?: number;
  evaluator?: string;
  commentKey?: "sheets.comments.validated" | "sheets.comments.rework";
}
