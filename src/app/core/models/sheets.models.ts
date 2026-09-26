// UI contracts for the pedagogical sheets screen. Runtime business data comes from PedagoraPilot.Api.

export type SheetStatus =
  | "not_started"
  | "in_progress"
  | "ready"
  | "presented"
  | "validated"
  | "rework";

export type EvaluationLevel = "acquired" | "in_progress" | "review";

export const ALL_SHEET_STATUSES: SheetStatus[] = [
  "not_started",
  "in_progress",
  "ready",
  "presented",
  "validated",
  "rework",
];

/** Fixed evaluation rubric used by the existing drawer; values are persisted by the API. */
export const SHEET_EVALUATION_CRITERIA = [
  "structure",
  "introduction",
  "hook",
  "objectives",
  "content",
  "regulation",
  "questioningMethod",
  "animation",
  "timeManagement",
  "rip",
  "review",
] as const;

export interface PedagogicalSheet {
  topicId: string;
  number: number;
  titleKey: string;
  status: SheetStatus;
  preparationDate: string;
  presentationDate: string;
  durationMinutes: number;
  evaluator: string;
  commentKey: string;
  positivePoints: string;
  improvements: string;
  generalComment: string;
  nextObjective: string;
  evaluationLevels: Record<string, EvaluationLevel>;
}
