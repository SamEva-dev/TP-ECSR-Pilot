// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export type PlanningType =
  | "classroom"
  | "distance"
  | "driving"
  | "evaluation"
  | "internship"
  | "presentation"
  | "catchup"
  | "sensitization"
  | "event";

export interface PlanningEvent {
  id: string;
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
  promotionId: string;
  type: PlanningType;
  titleKey: string;
  time: string;
  meta: string;
  date: string;
  competence?: string;
  vehicle?: string;
  plate?: string;
}
