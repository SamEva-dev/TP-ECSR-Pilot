// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export type SkillCode = "C1" | "C2" | "C3" | "C4";

export type SkillCriterionLevel = "acquired" | "in_progress" | "rework";

export interface SkillCriterion {
  labelKey: string;
  level: SkillCriterionLevel;
}

export interface SkillDefinition {
  code: SkillCode;
  titleKey: string;
  criteria: SkillCriterion[];
}

export interface SkillLinkedSession {
  id: string;
  skill: SkillCode;
  date: string;
  studentName: string;
  subjectKey: string;
  positiveKey: string;
  workOnKey: string;
  nextGoalKey: string;
}
