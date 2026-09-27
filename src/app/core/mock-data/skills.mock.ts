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

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    code: "C1",
    titleKey: "skills.definitions.C1.title",
    criteria: [
      {
        labelKey: "skills.definitions.C1.criteria.prepareIndividual",
        level: "acquired",
      },
      {
        labelKey: "skills.definitions.C1.criteria.leadDrivingLesson",
        level: "acquired",
      },
      {
        labelKey: "skills.definitions.C1.criteria.assessLearner",
        level: "acquired",
      },
      {
        labelKey: "skills.definitions.C1.criteria.learningRecord",
        level: "acquired",
      },
    ],
  },
  {
    code: "C2",
    titleKey: "skills.definitions.C2.title",
    criteria: [
      {
        labelKey: "skills.definitions.C2.criteria.buildSheet",
        level: "acquired",
      },
      {
        labelKey: "skills.definitions.C2.criteria.leadGroup",
        level: "acquired",
      },
      {
        labelKey: "skills.definitions.C2.criteria.questioningMethod",
        level: "in_progress",
      },
      {
        labelKey: "skills.definitions.C2.criteria.timeRip",
        level: "in_progress",
      },
    ],
  },
  {
    code: "C3",
    titleKey: "skills.definitions.C3.title",
    criteria: [
      {
        labelKey: "skills.definitions.C3.criteria.bendsGradients",
        level: "in_progress",
      },
      {
        labelKey: "skills.definitions.C3.criteria.expressway",
        level: "rework",
      },
      { labelKey: "skills.definitions.C3.criteria.urban", level: "rework" },
      {
        labelKey: "skills.definitions.C3.criteria.ecoDriving",
        level: "rework",
      },
    ],
  },
  {
    code: "C4",
    titleKey: "skills.definitions.C4.title",
    criteria: [
      {
        labelKey: "skills.definitions.C4.criteria.awarenessAction",
        level: "in_progress",
      },
      { labelKey: "skills.definitions.C4.criteria.accident", level: "rework" },
      { labelKey: "skills.definitions.C4.criteria.roadRisks", level: "rework" },
      { labelKey: "skills.definitions.C4.criteria.audience", level: "rework" },
    ],
  },
];

export const SKILL_LINKED_SESSIONS: SkillLinkedSession[] = [
  {
    id: "skill-session-c1-1",
    skill: "C1",
    date: "13/09/2026",
    studentName: "Sam Fokam",
    subjectKey: "skills.sessions.c1.subject",
    positiveKey: "skills.sessions.c1.positive",
    workOnKey: "skills.sessions.c1.workOn",
    nextGoalKey: "skills.sessions.c1.nextGoal",
  },
  {
    id: "skill-session-c3-1",
    skill: "C3",
    date: "20/09/2026",
    studentName: "Sam Fokam",
    subjectKey: "skills.sessions.c3Sam.subject",
    positiveKey: "skills.sessions.c3Sam.positive",
    workOnKey: "skills.sessions.c3Sam.workOn",
    nextGoalKey: "skills.sessions.c3Sam.nextGoal",
  },
  {
    id: "skill-session-c3-2",
    skill: "C3",
    date: "20/09/2026",
    studentName: "Julie Moreau",
    subjectKey: "skills.sessions.c3Julie.subject",
    positiveKey: "skills.sessions.c3Julie.positive",
    workOnKey: "skills.sessions.c3Julie.workOn",
    nextGoalKey: "skills.sessions.c3Julie.nextGoal",
  },
  {
    id: "skill-session-c3-3",
    skill: "C3",
    date: "19/09/2026",
    studentName: "Karim Benali",
    subjectKey: "skills.sessions.c3Karim.subject",
    positiveKey: "skills.sessions.c3Karim.positive",
    workOnKey: "skills.sessions.c3Karim.workOn",
    nextGoalKey: "skills.sessions.c3Karim.nextGoal",
  },
];
