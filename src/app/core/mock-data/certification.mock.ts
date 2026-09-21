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

export type CertificationUnitStatus = "validated" | "pending" | "not_validated";

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
  programId?: string;
  schemeId?: string;
  unitStatuses?: { unitId: string; status: CertificationUnitStatus }[];
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
  programIds?: string[];
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
  programId?: string;
  schemeId?: string;
}


export interface CertificationSchemeUnit {
  id: string;
  labelKey: string;
  shortLabel: string;
}

export interface CertificationSchemeStepDefinition {
  id: string;
  labelKey: string;
  duration: string;
}

export interface CertificationJuryCriterion {
  id: string;
  labelKey: string;
}

export interface CertificationScheme {
  id: string;
  programId: string;
  code: string;
  nameKey: string;
  version: string;
  requiredDocuments: number;
  units: CertificationSchemeUnit[];
  steps: CertificationSchemeStepDefinition[];
  juryCriteria: CertificationJuryCriterion[];
}

export const CERTIFICATION_SCHEMES: CertificationScheme[] = [
  {
    id: "scheme-ecsr-2026",
    programId: "program-ecsr",
    code: "ECSR-2026",
    nameKey: "certification.schemes.ecsr.name",
    version: "2026",
    requiredDocuments: 8,
    units: [
      { id: "ccp1", labelKey: "certification.schemes.ecsr.units.ccp1", shortLabel: "CCP1" },
      { id: "ccp2", labelKey: "certification.schemes.ecsr.units.ccp2", shortLabel: "CCP2" },
    ],
    steps: [
      { id: "professional-situation", labelKey: "certification.steps.professionalSituation", duration: "2 h" },
      { id: "technical-interview", labelKey: "certification.steps.technicalInterview", duration: "1 h" },
      { id: "questionnaire", labelKey: "certification.steps.questionnaire", duration: "45 min" },
      { id: "productions", labelKey: "certification.steps.productions", duration: "1 h" },
      { id: "final-interview", labelKey: "certification.steps.finalInterview", duration: "30 min" },
    ],
    juryCriteria: [
      { id: "pedagogy", labelKey: "certification.candidate.juryCriteria.pedagogy" },
      { id: "safety", labelKey: "certification.candidate.juryCriteria.safety" },
      { id: "analysis", labelKey: "certification.candidate.juryCriteria.analysis" },
      { id: "communication", labelKey: "certification.candidate.juryCriteria.communication" },
    ],
  },
  {
    id: "scheme-moto-2027",
    programId: "program-moto",
    code: "MOTO-2027",
    nameKey: "certification.schemes.moto.name",
    version: "2027",
    requiredDocuments: 6,
    units: [
      { id: "plateau", labelKey: "certification.schemes.moto.units.plateau", shortLabel: "Plateau" },
      { id: "circulation", labelKey: "certification.schemes.moto.units.circulation", shortLabel: "Circulation" },
    ],
    steps: [
      { id: "vehicle-check", labelKey: "certification.schemes.moto.steps.vehicleCheck", duration: "20 min" },
      { id: "plateau", labelKey: "certification.schemes.moto.steps.plateau", duration: "45 min" },
      { id: "circulation", labelKey: "certification.schemes.moto.steps.circulation", duration: "45 min" },
      { id: "safety-interview", labelKey: "certification.schemes.moto.steps.safetyInterview", duration: "30 min" },
    ],
    juryCriteria: [
      { id: "mastery", labelKey: "certification.schemes.criteria.vehicleMastery" },
      { id: "safety", labelKey: "certification.schemes.criteria.safety" },
      { id: "observation", labelKey: "certification.schemes.criteria.observation" },
      { id: "professional", labelKey: "certification.schemes.criteria.professionalPosture" },
    ],
  },
  {
    id: "scheme-pl-2027",
    programId: "program-pl",
    code: "PL-2027",
    nameKey: "certification.schemes.pl.name",
    version: "2027",
    requiredDocuments: 7,
    units: [
      { id: "safety-checks", labelKey: "certification.schemes.pl.units.checks", shortLabel: "Contrôles" },
      { id: "plateau", labelKey: "certification.schemes.pl.units.plateau", shortLabel: "Plateau" },
      { id: "road", labelKey: "certification.schemes.pl.units.road", shortLabel: "Circulation" },
    ],
    steps: [
      { id: "safety-checks", labelKey: "certification.schemes.pl.steps.checks", duration: "30 min" },
      { id: "plateau", labelKey: "certification.schemes.pl.steps.plateau", duration: "1 h" },
      { id: "road", labelKey: "certification.schemes.pl.steps.road", duration: "1 h" },
      { id: "technical-interview", labelKey: "certification.schemes.pl.steps.interview", duration: "30 min" },
    ],
    juryCriteria: [
      { id: "checks", labelKey: "certification.schemes.criteria.preparationChecks" },
      { id: "maneuver", labelKey: "certification.schemes.criteria.maneuver" },
      { id: "road", labelKey: "certification.schemes.criteria.roadSafety" },
      { id: "professional", labelKey: "certification.schemes.criteria.professionalPosture" },
    ],
  },
  {
    id: "scheme-bus-2027",
    programId: "program-bus",
    code: "BUS-2027",
    nameKey: "certification.schemes.bus.name",
    version: "2027",
    requiredDocuments: 7,
    units: [
      { id: "vehicle", labelKey: "certification.schemes.bus.units.vehicle", shortLabel: "Véhicule" },
      { id: "passenger-safety", labelKey: "certification.schemes.bus.units.safety", shortLabel: "Sécurité" },
      { id: "road", labelKey: "certification.schemes.bus.units.road", shortLabel: "Circulation" },
    ],
    steps: [
      { id: "vehicle-preparation", labelKey: "certification.schemes.bus.steps.preparation", duration: "30 min" },
      { id: "maneuver", labelKey: "certification.schemes.bus.steps.maneuver", duration: "45 min" },
      { id: "road", labelKey: "certification.schemes.bus.steps.road", duration: "1 h" },
      { id: "passenger-safety", labelKey: "certification.schemes.bus.steps.safety", duration: "30 min" },
    ],
    juryCriteria: [
      { id: "vehicle", labelKey: "certification.schemes.criteria.vehiclePreparation" },
      { id: "passenger", labelKey: "certification.schemes.criteria.passengerSafety" },
      { id: "road", labelKey: "certification.schemes.criteria.roadSafety" },
      { id: "professional", labelKey: "certification.schemes.criteria.professionalPosture" },
    ],
  },
];

export function certificationSchemeForProgram(programId: string): CertificationScheme {
  return CERTIFICATION_SCHEMES.find((item) => item.programId === programId) ?? CERTIFICATION_SCHEMES[0];
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

export type SuccessCandidateResult = "obtained" | "partial" | "failed" | "absent";

export interface SuccessCandidateDetail {
  id: string;
  promotionId: string;
  candidateNumber: string;
  firstName: string;
  lastName: string;
  ccp1: boolean;
  ccp2: boolean;
  result: SuccessCandidateResult;
  session: string;
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
    programIds: ["program-ecsr"],
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
    programIds: ["program-ecsr"],
  },
  { id: "j3", firstName: "Nicolas", lastName: "Mercier", professionKey: "certification.jury.professions.examiner", organisation: "Moto Académie", habilitation: "HAB-MOTO-22018", validUntil: "31/12/2028", active: true, programIds: ["program-moto"] },
  { id: "j4", firstName: "Claire", lastName: "Besson", professionKey: "certification.jury.professions.examiner", organisation: "Deux Roues Formation", habilitation: "HAB-MOTO-23044", validUntil: "31/12/2028", active: true, programIds: ["program-moto"] },
  { id: "j5", firstName: "Patrick", lastName: "Roux", professionKey: "certification.jury.professions.transport", organisation: "Route Pro", habilitation: "HAB-PL-31207", validUntil: "30/06/2029", active: true, programIds: ["program-pl"] },
  { id: "j6", firstName: "Sonia", lastName: "Meyer", professionKey: "certification.jury.professions.transport", organisation: "Logistique Formation", habilitation: "HAB-PL-31882", validUntil: "30/06/2029", active: true, programIds: ["program-pl"] },
  { id: "j7", firstName: "Laurent", lastName: "Petit", professionKey: "certification.jury.professions.passenger", organisation: "Mobilité Voyageurs", habilitation: "HAB-BUS-12890", validUntil: "31/03/2029", active: true, programIds: ["program-bus"] },
  { id: "j8", firstName: "Amel", lastName: "Benamar", professionKey: "certification.jury.professions.passenger", organisation: "Transport Formation", habilitation: "HAB-BUS-12941", validUntil: "31/03/2029", active: true, programIds: ["program-bus"] },
];

export function juryMembersForProgram(programId: string): JuryMember[] {
  return JURY_MEMBERS.filter((member) => member.programIds?.includes(programId));
}

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

export const SUCCESS_CANDIDATES: SuccessCandidateDetail[] = [
  { id: "sc01", promotionId: "p2", candidateNumber: "ECSR-2026-001", firstName: "Emma", lastName: "Lefèvre", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc02", promotionId: "p2", candidateNumber: "ECSR-2026-002", firstName: "Lucas", lastName: "Barbier", ccp1: true, ccp2: false, result: "partial", session: "Juin 2026" },
  { id: "sc03", promotionId: "p2", candidateNumber: "ECSR-2026-003", firstName: "Awa", lastName: "Diallo", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc04", promotionId: "p2", candidateNumber: "ECSR-2026-004", firstName: "Hugo", lastName: "Renaud", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc05", promotionId: "p2", candidateNumber: "ECSR-2026-005", firstName: "Sarah", lastName: "Colin", ccp1: false, ccp2: false, result: "failed", session: "Juin 2026" },
  { id: "sc06", promotionId: "p2", candidateNumber: "ECSR-2026-006", firstName: "Antoine", lastName: "Vasseur", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc07", promotionId: "p2", candidateNumber: "ECSR-2026-007", firstName: "Inès", lastName: "Robert", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc08", promotionId: "p2", candidateNumber: "ECSR-2026-008", firstName: "Mélanie", lastName: "Garcia", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc09", promotionId: "p2", candidateNumber: "ECSR-2026-009", firstName: "Nicolas", lastName: "Fontaine", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc10", promotionId: "p2", candidateNumber: "ECSR-2026-010", firstName: "Sofia", lastName: "Martin", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc11", promotionId: "p2", candidateNumber: "ECSR-2026-011", firstName: "Romain", lastName: "Gauthier", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc12", promotionId: "p2", candidateNumber: "ECSR-2026-012", firstName: "Camille", lastName: "Lopez", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc13", promotionId: "p2", candidateNumber: "ECSR-2026-013", firstName: "Youssef", lastName: "Bensaïd", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc14", promotionId: "p2", candidateNumber: "ECSR-2026-014", firstName: "Élodie", lastName: "Perrier", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc15", promotionId: "p2", candidateNumber: "ECSR-2026-015", firstName: "David", lastName: "Roche", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc16", promotionId: "p2", candidateNumber: "ECSR-2026-016", firstName: "Maya", lastName: "Dubois", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc17", promotionId: "p2", candidateNumber: "ECSR-2026-017", firstName: "Alexis", lastName: "Nguyen", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc18", promotionId: "p2", candidateNumber: "ECSR-2026-018", firstName: "Nora", lastName: "Bernard", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc19", promotionId: "p2", candidateNumber: "ECSR-2026-019", firstName: "Mathieu", lastName: "Petit", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc20", promotionId: "p2", candidateNumber: "ECSR-2026-020", firstName: "Lina", lastName: "Morel", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc21", promotionId: "p2", candidateNumber: "ECSR-2026-021", firstName: "Jonathan", lastName: "Henry", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc22", promotionId: "p2", candidateNumber: "ECSR-2026-022", firstName: "Amélie", lastName: "Mercier", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc23", promotionId: "p2", candidateNumber: "ECSR-2026-023", firstName: "Kévin", lastName: "Diallo", ccp1: true, ccp2: true, result: "obtained", session: "Juin 2026" },
  { id: "sc24", promotionId: "p2", candidateNumber: "ECSR-2026-024", firstName: "Laura", lastName: "Simon", ccp1: false, ccp2: false, result: "absent", session: "Juin 2026" },
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
