export type ExamSessionStatus =
  "preparation" | "ready" | "running" | "deliberation" | "published" | "closed";
export type ExamStepStatus = "done" | "planned" | "in_progress";
export type CertificationResult =
  "pending" | "obtained" | "partial" | "failed" | "absent";

export interface ExamStep {
  id: string;
  labelKey: string;
  duration: string;
  status: ExamStepStatus;
  date?: string;
  time?: string;
}

export interface CertificationCandidate {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  candidateNumber: string;
  promotionId: string;
  ready: boolean;
  missingKeys: string[];
  completedHours: number;
  plannedHours: number;
  documentsReady: number;
  documentsTotal: number;
  ccp1: "validated" | "pending" | "not_validated";
  ccp2: "validated" | "pending" | "not_validated";
  result: CertificationResult;
  published: boolean;
  examTime: string;
  steps: ExamStep[];
}

export interface JuryMember {
  id: string;
  firstName: string;
  lastName: string;
  professionKey: string;
  organisation: string;
  habilitation: string;
  validUntil: string;
  active: boolean;
}

export interface ExamSession {
  id: string;
  name: string;
  promotionId: string;
  promotionName: string;
  centre: string;
  location: string;
  startDate: string;
  endDate: string;
  status: ExamSessionStatus;
  candidateIds: string[];
  juryIds: string[];
}

export interface SuccessPromotion {
  id: string;
  promotionName: string;
  year: string;
  enrolled: number;
  presented: number;
  graduated: number;
  partial: number;
  failed: number;
  absent: number;
  rate: number;
}

const defaultSteps = (): ExamStep[] => [
  {
    id: "professional-situation",
    labelKey: "certification.steps.professionalSituation",
    duration: "2 h",
    status: "planned",
    date: "18/02/2027",
    time: "08:00",
  },
  {
    id: "technical-interview",
    labelKey: "certification.steps.technicalInterview",
    duration: "1 h",
    status: "planned",
    date: "18/02/2027",
    time: "10:15",
  },
  {
    id: "questionnaire",
    labelKey: "certification.steps.questionnaire",
    duration: "45 min",
    status: "planned",
    date: "18/02/2027",
    time: "13:30",
  },
  {
    id: "productions",
    labelKey: "certification.steps.productions",
    duration: "1 h",
    status: "planned",
    date: "19/02/2027",
    time: "09:00",
  },
  {
    id: "final-interview",
    labelKey: "certification.steps.finalInterview",
    duration: "30 min",
    status: "planned",
    date: "19/02/2027",
    time: "11:00",
  },
];

export const CERTIFICATION_CANDIDATES: CertificationCandidate[] = [
  {
    id: "c1",
    studentId: "s1",
    firstName: "Sam",
    lastName: "Fokam",
    candidateNumber: "ECSR-2027-0012",
    promotionId: "p1",
    ready: true,
    missingKeys: [],
    completedHours: 910,
    plannedHours: 910,
    documentsReady: 8,
    documentsTotal: 8,
    ccp1: "validated",
    ccp2: "validated",
    result: "pending",
    published: false,
    examTime: "08:00",
    steps: defaultSteps(),
  },
  {
    id: "c2",
    studentId: "s2",
    firstName: "Julie",
    lastName: "Moreau",
    candidateNumber: "ECSR-2027-0013",
    promotionId: "p1",
    ready: true,
    missingKeys: [],
    completedHours: 910,
    plannedHours: 910,
    documentsReady: 8,
    documentsTotal: 8,
    ccp1: "validated",
    ccp2: "validated",
    result: "pending",
    published: false,
    examTime: "09:00",
    steps: defaultSteps(),
  },
  {
    id: "c3",
    studentId: "s3",
    firstName: "Marc",
    lastName: "Girard",
    candidateNumber: "ECSR-2027-0014",
    promotionId: "p1",
    ready: true,
    missingKeys: [],
    completedHours: 910,
    plannedHours: 910,
    documentsReady: 8,
    documentsTotal: 8,
    ccp1: "validated",
    ccp2: "validated",
    result: "pending",
    published: false,
    examTime: "10:00",
    steps: defaultSteps(),
  },
  {
    id: "c4",
    studentId: "s4",
    firstName: "Léa",
    lastName: "Perrin",
    candidateNumber: "ECSR-2027-0015",
    promotionId: "p1",
    ready: false,
    missingKeys: [
      "certification.missing.hours",
      "certification.missing.professionalFile",
    ],
    completedHours: 902,
    plannedHours: 910,
    documentsReady: 7,
    documentsTotal: 8,
    ccp1: "validated",
    ccp2: "pending",
    result: "pending",
    published: false,
    examTime: "11:00",
    steps: defaultSteps(),
  },
  {
    id: "c5",
    studentId: "s5",
    firstName: "Karim",
    lastName: "Benali",
    candidateNumber: "ECSR-2027-0016",
    promotionId: "p1",
    ready: true,
    missingKeys: [],
    completedHours: 910,
    plannedHours: 910,
    documentsReady: 8,
    documentsTotal: 8,
    ccp1: "validated",
    ccp2: "validated",
    result: "pending",
    published: false,
    examTime: "13:30",
    steps: defaultSteps(),
  },
  {
    id: "c6",
    studentId: "s6",
    firstName: "Nadia",
    lastName: "Chevalier",
    candidateNumber: "ECSR-2027-0017",
    promotionId: "p1",
    ready: false,
    missingKeys: ["certification.missing.stageDocument"],
    completedHours: 910,
    plannedHours: 910,
    documentsReady: 7,
    documentsTotal: 8,
    ccp1: "validated",
    ccp2: "pending",
    result: "pending",
    published: false,
    examTime: "14:30",
    steps: defaultSteps(),
  },
  {
    id: "c7",
    studentId: "s7",
    firstName: "Thomas",
    lastName: "Roussel",
    candidateNumber: "ECSR-2027-0018",
    promotionId: "p1",
    ready: false,
    missingKeys: [
      "certification.missing.hours",
      "certification.missing.ccp2Production",
    ],
    completedHours: 889,
    plannedHours: 910,
    documentsReady: 7,
    documentsTotal: 8,
    ccp1: "validated",
    ccp2: "pending",
    result: "pending",
    published: false,
    examTime: "15:30",
    steps: defaultSteps(),
  },
  {
    id: "c8",
    studentId: "s8",
    firstName: "Chloé",
    lastName: "Marchand",
    candidateNumber: "ECSR-2027-0019",
    promotionId: "p1",
    ready: true,
    missingKeys: [],
    completedHours: 910,
    plannedHours: 910,
    documentsReady: 8,
    documentsTotal: 8,
    ccp1: "validated",
    ccp2: "validated",
    result: "pending",
    published: false,
    examTime: "16:30",
    steps: defaultSteps(),
  },
  {
    id: "c9",
    studentId: "s9",
    firstName: "Mehdi",
    lastName: "Amrani",
    candidateNumber: "ECSR-2027-0020",
    promotionId: "p1",
    ready: true,
    missingKeys: [],
    completedHours: 910,
    plannedHours: 910,
    documentsReady: 8,
    documentsTotal: 8,
    ccp1: "validated",
    ccp2: "validated",
    result: "pending",
    published: false,
    examTime: "17:30",
    steps: defaultSteps(),
  },
];

export const JURY_MEMBERS: JuryMember[] = [
  {
    id: "j1",
    firstName: "Jean",
    lastName: "Martin",
    professionKey: "certification.jury.professions.teacher",
    organisation: "Auto-école Horizon",
    habilitation: "HAB-ECSR-45821",
    validUntil: "31/12/2028",
    active: true,
  },
  {
    id: "j2",
    firstName: "Sophie",
    lastName: "Renaud",
    professionKey: "certification.jury.professions.manager",
    organisation: "Centre Route Pro",
    habilitation: "HAB-ECSR-39107",
    validUntil: "30/06/2028",
    active: true,
  },
];

export const EXAM_SESSIONS: ExamSession[] = [
  {
    id: "exam-2027-02",
    name: "Session TP ECSR — Février 2027",
    promotionId: "p1",
    promotionName: "TP ECSR 2026–2027",
    centre: "TP ECSR Pilot — Centre de formation",
    location: "Centre d’examen — Salle A / Véhicule 3",
    startDate: "17/02/2027",
    endDate: "20/02/2027",
    status: "preparation",
    candidateIds: CERTIFICATION_CANDIDATES.map((item) => item.id),
    juryIds: ["j1", "j2"],
  },
];

export const SUCCESS_HISTORY: SuccessPromotion[] = [
  {
    id: "p2",
    promotionName: "TP ECSR 2025–2026",
    year: "2025–2026",
    enrolled: 24,
    presented: 23,
    graduated: 21,
    partial: 1,
    failed: 1,
    absent: 1,
    rate: 91.3,
  },
  {
    id: "p3",
    promotionName: "TP ECSR 2024–2025",
    year: "2024–2025",
    enrolled: 23,
    presented: 22,
    graduated: 19,
    partial: 2,
    failed: 1,
    absent: 1,
    rate: 86.4,
  },
  {
    id: "p4",
    promotionName: "TP ECSR 2023–2024",
    year: "2023–2024",
    enrolled: 25,
    presented: 24,
    graduated: 20,
    partial: 2,
    failed: 2,
    absent: 1,
    rate: 83.3,
  },
];

export function certificationCandidateByStudentId(
  studentId: string,
): CertificationCandidate | undefined {
  return CERTIFICATION_CANDIDATES.find(
    (candidate) => candidate.studentId === studentId,
  );
}

export function certificationCandidateById(
  id: string,
): CertificationCandidate | undefined {
  return CERTIFICATION_CANDIDATES.find(
    (candidate) => candidate.id === id || candidate.studentId === id,
  );
}
