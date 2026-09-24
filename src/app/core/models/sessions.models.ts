// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export type PedagogicalSessionType =
  | "classroom"
  | "presentation"
  | "evaluation"
  | "sensitization"
  | "catchup"
  | "event";

export type SessionModality = "onsite" | "remote-live" | "remote-async" | "practical";

export interface ProgrammedSession {
  id: string;
  titleKey: string;
  date: string;
  start: string;
  end: string;
  trainer: string;
  promotion: string;
  promotionId: string;
  type: PedagogicalSessionType;
  modality: SessionModality;
  objectiveKey: string;
  supportsKey: string;
  present: number;
  expected: number;
}
