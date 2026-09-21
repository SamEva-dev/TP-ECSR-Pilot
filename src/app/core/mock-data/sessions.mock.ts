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

export const SESSION_TRAINERS = [
  "Yanis Morel",
  "Claire Berthier",
  "Sophie Lemaire",
  "Ibrahim Traoré",
  "Marc Dupont",
] as const;

export const PROGRAMMED_SESSIONS: ProgrammedSession[] = [
  {
    id: "ps1",
    titleKey: "sessions.programmed.items.intersections.title",
    date: "21/09/2026",
    start: "08:00",
    end: "12:00",
    trainer: "Yanis Morel",
    promotion: "TP ECSR 2026–2027",
    promotionId: "p1",
    type: "classroom",
    modality: "onsite",
    objectiveKey: "sessions.programmed.items.intersections.objective",
    supportsKey: "sessions.programmed.items.intersections.supports",
    present: 8,
    expected: 9,
  },
  {
    id: "ps2",
    titleKey: "sessions.programmed.items.sheets30to34.title",
    date: "21/09/2026",
    start: "13:30",
    end: "17:30",
    trainer: "Claire Berthier",
    promotion: "TP ECSR 2026–2027",
    promotionId: "p1",
    type: "presentation",
    modality: "onsite",
    objectiveKey: "sessions.programmed.items.sheets30to34.objective",
    supportsKey: "sessions.programmed.items.sheets30to34.supports",
    present: 9,
    expected: 9,
  },
  {
    id: "ps3",
    titleKey: "sessions.programmed.items.questioningMethod.title",
    date: "22/09/2026",
    start: "08:00",
    end: "12:00",
    trainer: "Claire Berthier",
    promotion: "TP ECSR 2026–2027",
    promotionId: "p1",
    type: "classroom",
    modality: "remote-live",
    objectiveKey: "sessions.programmed.items.questioningMethod.objective",
    supportsKey: "sessions.programmed.items.questioningMethod.supports",
    present: 9,
    expected: 9,
  },
  {
    id: "ps4",
    titleKey: "sessions.programmed.items.c2Evaluation.title",
    date: "22/09/2026",
    start: "14:00",
    end: "17:00",
    trainer: "Sophie Lemaire",
    promotion: "TP ECSR 2025–2026",
    promotionId: "p2",
    type: "evaluation",
    modality: "onsite",
    objectiveKey: "sessions.programmed.items.c2Evaluation.objective",
    supportsKey: "sessions.programmed.items.c2Evaluation.supports",
    present: 6,
    expected: 6,
  },
  {
    id: "ps5",
    titleKey: "sessions.programmed.items.roadRisk.title",
    date: "23/09/2026",
    start: "09:00",
    end: "12:00",
    trainer: "Ibrahim Traoré",
    promotion: "TP ECSR 2026–2027",
    promotionId: "p1",
    type: "sensitization",
    modality: "remote-live",
    objectiveKey: "sessions.programmed.items.roadRisk.objective",
    supportsKey: "sessions.programmed.items.roadRisk.supports",
    present: 9,
    expected: 9,
  },
  {
    id: "ps6",
    titleKey: "sessions.programmed.items.signsCatchup.title",
    date: "24/09/2026",
    start: "08:00",
    end: "12:00",
    trainer: "Yanis Morel",
    promotion: "TP ECSR 2026–2027",
    promotionId: "p1",
    type: "catchup",
    modality: "onsite",
    objectiveKey: "sessions.programmed.items.signsCatchup.objective",
    supportsKey: "sessions.programmed.items.signsCatchup.supports",
    present: 3,
    expected: 3,
  },
];
