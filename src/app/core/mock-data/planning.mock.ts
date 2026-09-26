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

export const PLANNING_DAYS = [
  { id: "monday", labelKey: "planning.days.monday" },
  { id: "tuesday", labelKey: "planning.days.tuesday" },
  { id: "wednesday", labelKey: "planning.days.wednesday" },
  { id: "thursday", labelKey: "planning.days.thursday" },
  { id: "friday", labelKey: "planning.days.friday" },
] as const;

export const PLANNING_EVENTS: PlanningEvent[] = [
  {
    id: "pe1",
    day: "monday",
    promotionId: "p1",
    type: "classroom",
    titleKey: "planning.events.intersections",
    time: "08:00 – 12:00",
    meta: "Yanis Morel · Salle 2",
    date: "21/09/2026",
  },
  {
    id: "pe2",
    day: "monday",
    promotionId: "p1",
    type: "driving",
    titleKey: "planning.events.bends",
    time: "08:00 – 10:00",
    meta: "Sam Fokam · Marc Dupont",
    date: "21/09/2026",
    competence: "C3",
    vehicle: "Clio 5",
    plate: "EJ-204-KL",
  },
  {
    id: "pe3",
    day: "monday",
    promotionId: "p1",
    type: "presentation",
    titleKey: "planning.events.sheets30to34",
    time: "13:30 – 17:30",
    meta: "Claire Berthier",
    date: "21/09/2026",
  },
  {
    id: "pe4",
    day: "tuesday",
    promotionId: "p1",
    type: "classroom",
    titleKey: "planning.events.questioningMethod",
    time: "08:00 – 12:00",
    meta: "Claire Berthier · Salle 1",
    date: "22/09/2026",
  },
  {
    id: "pe5",
    day: "tuesday",
    promotionId: "p1",
    type: "evaluation",
    titleKey: "planning.events.c2Evaluation",
    time: "14:00 – 17:00",
    meta: "Sophie Lemaire",
    date: "22/09/2026",
  },
  {
    id: "pe6",
    day: "wednesday",
    promotionId: "p1",
    type: "sensitization",
    titleKey: "planning.events.roadRiskAwareness",
    time: "09:00 – 12:00",
    meta: "Ibrahim Traoré",
    date: "23/09/2026",
  },
  {
    id: "pe7",
    day: "wednesday",
    promotionId: "p1",
    type: "driving",
    titleKey: "planning.events.motorwayMerging",
    time: "14:00 – 16:00",
    meta: "Julie Moreau · Sophie Lemaire",
    date: "23/09/2026",
  },
  {
    id: "pe8",
    day: "thursday",
    promotionId: "p1",
    type: "catchup",
    titleKey: "planning.events.signsCatchup",
    time: "08:00 – 12:00",
    meta: "3 stagiaires concernés",
    date: "24/09/2026",
  },
  {
    id: "pe9",
    day: "thursday",
    promotionId: "p1",
    type: "internship",
    titleKey: "planning.events.companyInternship",
    time: "14:00 – 18:00",
    meta: "ECF Loire · Karim Benali",
    date: "24/09/2026",
  },
  {
    id: "pe11",
    day: "thursday",
    promotionId: "p1",
    type: "distance",
    titleKey: "planning.events.remoteClass",
    time: "14:00 – 17:00",
    meta: "Marc Dupont · Microsoft Teams",
    date: "24/09/2026",
  },
  {
    id: "pe10",
    day: "friday",
    promotionId: "p1",
    type: "event",
    titleKey: "planning.events.educationalCouncil",
    time: "09:00 – 12:00",
    meta: "Équipe formateurs",
    date: "25/09/2026",
  },
];

export const DRIVING_PROGRAMMED: PlanningEvent[] = [
  {
    id: "pd1",
    day: "monday",
    promotionId: "p1",
    type: "driving",
    titleKey: "planning.people.samFokam",
    time: "08:00–10:00",
    meta: "20/09/2026 · 08:00–10:00 · Clio 5 · EJ-204-KL",
    date: "20/09/2026",
    competence: "C3",
  },
  {
    id: "pd2",
    day: "monday",
    promotionId: "p1",
    type: "driving",
    titleKey: "planning.people.julieMoreau",
    time: "10:00–12:00",
    meta: "20/09/2026 · 10:00–12:00 · Golf 8 · FT-882-QS",
    date: "20/09/2026",
    competence: "C3",
  },
  {
    id: "pd3",
    day: "monday",
    promotionId: "p1",
    type: "driving",
    titleKey: "planning.people.samFokam",
    time: "14:00–16:00",
    meta: "13/09/2026 · 14:00–16:00 · Clio 5 · EJ-204-KL",
    date: "13/09/2026",
    competence: "C1",
  },
  {
    id: "pd4",
    day: "monday",
    promotionId: "p1",
    type: "driving",
    titleKey: "planning.people.karimBenali",
    time: "09:00–11:00",
    meta: "19/09/2026 · 09:00–11:00 · 208 · GB-119-ZT",
    date: "19/09/2026",
    competence: "C3",
  },
];
