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
  competence: "C1" | "C2" | "C3" | "C4";
  trainer: string;
  subjectKey: string;
  positiveKey: string;
  difficultyKey: string;
  nextGoalKey: string;
  evaluations: DrivingHistoryEvaluation[];
}

export const DRIVING_STUDENTS = [
  { id: "s1", name: "Sam Fokam" },
  { id: "s2", name: "Julie Moreau" },
  { id: "s3", name: "Marc Girard" },
  { id: "s4", name: "Léa Perrin" },
  { id: "s5", name: "Karim Benali" },
  { id: "s6", name: "Nadia Chevalier" },
  { id: "s7", name: "Thomas Roussel" },
  { id: "s8", name: "Chloé Marchand" },
  { id: "s9", name: "Mehdi Amrani" },
] as const;

export const DRIVING_TRAINERS = [
  { id: "f1", name: "Marc Dupont" },
  { id: "f2", name: "Claire Berthier" },
  { id: "f3", name: "Yanis Morel" },
  { id: "f4", name: "Sophie Lemaire" },
  { id: "f5", name: "Ibrahim Traoré" },
] as const;

export const DRIVING_VEHICLES = [
  { id: "v1", label: "Clio 5 — EJ-204-KL" },
  { id: "v2", label: "Golf 8 — FT-882-QS" },
  { id: "v3", label: "208 — GB-119-ZT" },
] as const;

export const DRIVING_COMPETENCIES = [
  { id: "C1", descriptionKey: "drivingSession.competencies.c1.description" },
  { id: "C2", descriptionKey: "drivingSession.competencies.c2.description" },
  { id: "C3", descriptionKey: "drivingSession.competencies.c3.description" },
  { id: "C4", descriptionKey: "drivingSession.competencies.c4.description" },
] as const;

export const DRIVING_SUB_SKILLS: Record<
  "C1" | "C2" | "C3" | "C4",
  { id: string; labelKey: string }[]
> = {
  C1: [
    { id: "prepare", labelKey: "drivingSession.subSkills.c1.prepare" },
    { id: "lesson", labelKey: "drivingSession.subSkills.c1.lesson" },
    { id: "assess", labelKey: "drivingSession.subSkills.c1.assess" },
    { id: "booklet", labelKey: "drivingSession.subSkills.c1.booklet" },
  ],
  C2: [
    { id: "sheet", labelKey: "drivingSession.subSkills.c2.sheet" },
    { id: "group", labelKey: "drivingSession.subSkills.c2.group" },
    { id: "questioning", labelKey: "drivingSession.subSkills.c2.questioning" },
    { id: "timing", labelKey: "drivingSession.subSkills.c2.timing" },
  ],
  C3: [
    { id: "bends", labelKey: "drivingSession.subSkills.c3.bends" },
    { id: "expressway", labelKey: "drivingSession.subSkills.c3.expressway" },
    { id: "urban", labelKey: "drivingSession.subSkills.c3.urban" },
    { id: "eco", labelKey: "drivingSession.subSkills.c3.eco" },
  ],
  C4: [
    { id: "awareness", labelKey: "drivingSession.subSkills.c4.awareness" },
    { id: "accident", labelKey: "drivingSession.subSkills.c4.accident" },
    { id: "risks", labelKey: "drivingSession.subSkills.c4.risks" },
    { id: "audience", labelKey: "drivingSession.subSkills.c4.audience" },
  ],
};

export const DRIVING_CRITERIA: DrivingCriterion[] = [
  { id: "information", labelKey: "drivingSession.criteria.information" },
  { id: "speed", labelKey: "drivingSession.criteria.speed" },
  { id: "position", labelKey: "drivingSession.criteria.position" },
  { id: "gaze", labelKey: "drivingSession.criteria.gaze" },
  { id: "anticipation", labelKey: "drivingSession.criteria.anticipation" },
  { id: "communication", labelKey: "drivingSession.criteria.communication" },
  { id: "autonomy", labelKey: "drivingSession.criteria.autonomy" },
  { id: "stress", labelKey: "drivingSession.criteria.stress" },
];

export const DRIVING_HISTORY: DrivingHistoryItem[] = [
  {
    id: "dh1",
    studentId: "s1",
    studentName: "Sam Fokam",
    date: "20/09/2026",
    competence: "C3",
    trainer: "Marc Dupont",
    subjectKey: "drivingSession.history.bends.subject",
    positiveKey: "drivingSession.history.bends.positive",
    difficultyKey: "drivingSession.history.bends.difficulty",
    nextGoalKey: "drivingSession.history.bends.nextGoal",
    evaluations: [
      { criterionId: "information", level: "acquired" },
      { criterionId: "speed", level: "progress" },
      { criterionId: "position", level: "acquired" },
      { criterionId: "gaze", level: "work" },
      { criterionId: "anticipation", level: "progress" },
      { criterionId: "communication", level: "acquired" },
    ],
  },
  {
    id: "dh2",
    studentId: "s2",
    studentName: "Julie Moreau",
    date: "20/09/2026",
    competence: "C3",
    trainer: "Sophie Lemaire",
    subjectKey: "drivingSession.history.expressway.subject",
    positiveKey: "drivingSession.history.expressway.positive",
    difficultyKey: "drivingSession.history.expressway.difficulty",
    nextGoalKey: "drivingSession.history.expressway.nextGoal",
    evaluations: [
      { criterionId: "information", level: "progress" },
      { criterionId: "speed", level: "acquired" },
      { criterionId: "position", level: "progress" },
      { criterionId: "gaze", level: "progress" },
      { criterionId: "anticipation", level: "work" },
      { criterionId: "communication", level: "acquired" },
    ],
  },
  {
    id: "dh3",
    studentId: "s1",
    studentName: "Sam Fokam",
    date: "13/09/2026",
    competence: "C1",
    trainer: "Marc Dupont",
    subjectKey: "drivingSession.history.lesson.subject",
    positiveKey: "drivingSession.history.lesson.positive",
    difficultyKey: "drivingSession.history.lesson.difficulty",
    nextGoalKey: "drivingSession.history.lesson.nextGoal",
    evaluations: [
      { criterionId: "information", level: "acquired" },
      { criterionId: "speed", level: "acquired" },
      { criterionId: "position", level: "acquired" },
      { criterionId: "gaze", level: "progress" },
      { criterionId: "anticipation", level: "acquired" },
      { criterionId: "communication", level: "progress" },
    ],
  },
  {
    id: "dh4",
    studentId: "s5",
    studentName: "Karim Benali",
    date: "19/09/2026",
    competence: "C3",
    trainer: "Sophie Lemaire",
    subjectKey: "drivingSession.history.urban.subject",
    positiveKey: "drivingSession.history.urban.positive",
    difficultyKey: "drivingSession.history.urban.difficulty",
    nextGoalKey: "drivingSession.history.urban.nextGoal",
    evaluations: [
      { criterionId: "information", level: "acquired" },
      { criterionId: "speed", level: "acquired" },
      { criterionId: "position", level: "progress" },
      { criterionId: "gaze", level: "acquired" },
      { criterionId: "anticipation", level: "progress" },
      { criterionId: "communication", level: "acquired" },
    ],
  },
];
