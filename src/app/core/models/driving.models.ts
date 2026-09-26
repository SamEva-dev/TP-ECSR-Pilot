// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export type DrivingLevel = "acquired" | "progress" | "work";

export interface DrivingCriterion {
  id: string;
  labelKey: string;
}

export interface DrivingHistoryEvaluation {
  criterionId: string;
  level: DrivingLevel;
}

export interface DrivingHistoryItem {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  competence: string;
  trainer: string;
  subjectKey: string;
  positiveKey: string;
  difficultyKey: string;
  nextGoalKey: string;
  evaluations: DrivingHistoryEvaluation[];
}
