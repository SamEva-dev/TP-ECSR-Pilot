// UI contracts for the competency screen. Runtime business data comes from PedagoraPilot.Api.

export type SkillCriterionLevel = "not_assessed" | "acquired" | "in_progress" | "rework";

export interface SkillCriterion {
  definitionId: string;
  labelKey: string;
  level: SkillCriterionLevel;
}

export interface SkillDefinition {
  definitionId: string;
  code: string;
  titleKey: string;
  criteria: SkillCriterion[];
}

export interface SkillLinkedSession {
  id: string;
  skill: string;
  date: string;
  studentName: string;
  subjectKey: string;
  positiveKey: string;
  workOnKey: string;
  nextGoalKey: string;
}
