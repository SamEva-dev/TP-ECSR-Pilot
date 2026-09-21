export type SuccessOutcome = "obtained" | "partial" | "failed" | "absent";

export interface SuccessCandidateDetail {
  id: string;
  firstName: string;
  lastName: string;
  candidateNumber: string;
  session: string;
  result: SuccessOutcome;
  unitResults: Array<{ code: string; validated: boolean }>;
}

export interface SuccessAnalyticsRecord {
  id: string;
  organizationId: string;
  siteId: string;
  programId: string;
  cohortName: string;
  year: string;
  session: string;
  presented: number;
  graduated: number;
  partial: number;
  failed: number;
  absent: number;
  rate: number;
  candidates: SuccessCandidateDetail[];
}

const PEOPLE = [
  ["Emma", "Lefèvre"], ["Lucas", "Barbier"], ["Awa", "Diallo"], ["Hugo", "Renaud"],
  ["Sarah", "Colin"], ["Antoine", "Vasseur"], ["Julie", "Moreau"], ["Marc", "Girard"],
  ["Léa", "Perrin"], ["Karim", "Benali"], ["Nadia", "Chevalier"], ["Thomas", "Roussel"],
  ["Chloé", "Marchand"], ["Mehdi", "Amrani"], ["Yanis", "Morel"], ["Inès", "Robert"],
  ["Noah", "Petit"], ["Camille", "Laurent"], ["Sofiane", "Belaïd"], ["Manon", "Roux"],
  ["Mathis", "Garnier"], ["Lina", "Faure"], ["Adam", "Lopez"], ["Louise", "Meunier"],
  ["Rayan", "Boyer"], ["Clara", "Henry"], ["Enzo", "Giraud"], ["Maya", "Lambert"],
] as const;

function codeFor(programId: string): string {
  switch (programId) {
    case "program-moto": return "MOTO";
    case "program-pl": return "PL";
    case "program-bus": return "BUS";
    default: return "ECSR";
  }
}

function unitCodes(programId: string): string[] {
  switch (programId) {
    case "program-moto": return ["PLATEAU", "CIRCULATION"];
    case "program-pl": return ["HC", "CIRCULATION"];
    case "program-bus": return ["HC", "CIRCULATION"];
    default: return ["CCP1", "CCP2"];
  }
}

function candidates(
  recordId: string,
  programId: string,
  year: string,
  session: string,
  graduated: number,
  partial: number,
  failed: number,
  absent: number,
  offset = 0,
): SuccessCandidateDetail[] {
  const outcomes: SuccessOutcome[] = [
    ...Array.from({ length: graduated }, () => "obtained" as const),
    ...Array.from({ length: partial }, () => "partial" as const),
    ...Array.from({ length: failed }, () => "failed" as const),
    ...Array.from({ length: absent }, () => "absent" as const),
  ];
  const units = unitCodes(programId);
  return outcomes.map((result, index) => {
    const person = PEOPLE[(index + offset) % PEOPLE.length];
    const validatedCount = result === "obtained" ? units.length : result === "partial" ? Math.max(1, units.length - 1) : 0;
    return {
      id: `${recordId}-candidate-${index + 1}`,
      firstName: person[0],
      lastName: person[1],
      candidateNumber: `${codeFor(programId)}-${year.replace("–", "-")}-${String(index + 1).padStart(3, "0")}`,
      session,
      result,
      unitResults: units.map((code, unitIndex) => ({ code, validated: unitIndex < validatedCount })),
    };
  });
}

function record(
  id: string,
  organizationId: string,
  siteId: string,
  programId: string,
  cohortName: string,
  year: string,
  session: string,
  graduated: number,
  partial: number,
  failed: number,
  absent: number,
  offset = 0,
): SuccessAnalyticsRecord {
  const presented = graduated + partial + failed;
  return {
    id,
    organizationId,
    siteId,
    programId,
    cohortName,
    year,
    session,
    presented,
    graduated,
    partial,
    failed,
    absent,
    rate: presented ? Math.round((graduated / presented) * 1000) / 10 : 0,
    candidates: candidates(id, programId, year, session, graduated, partial, failed, absent, offset),
  };
}

export const SUCCESS_ANALYTICS_RECORDS: SuccessAnalyticsRecord[] = [
  record("p2", "org-aftral", "site-aftral-nice", "program-ecsr", "TP ECSR 2025–2026", "2025–2026", "06/2026", 21, 1, 1, 1, 0),
  record("success-aftral-nice-ecsr-2024", "org-aftral", "site-aftral-nice", "program-ecsr", "TP ECSR 2024–2025", "2024–2025", "06/2025", 19, 2, 1, 0, 3),
  record("success-aftral-nice-ecsr-2023", "org-aftral", "site-aftral-nice", "program-ecsr", "TP ECSR 2023–2024", "2023–2024", "06/2024", 17, 2, 1, 1, 6),
  record("success-aftral-nice-moto-2026", "org-aftral", "site-aftral-nice", "program-moto", "Moto 2025–2026", "2025–2026", "05/2026", 14, 0, 1, 0, 8),
  record("success-aftral-nice-moto-2025", "org-aftral", "site-aftral-nice", "program-moto", "Moto 2024–2025", "2024–2025", "05/2025", 12, 1, 1, 1, 10),
  record("success-aftral-nice-pl-2026", "org-aftral", "site-aftral-nice", "program-pl", "Poids lourd 2025–2026", "2025–2026", "04/2026", 14, 1, 1, 0, 12),
  record("success-aftral-nice-pl-2025", "org-aftral", "site-aftral-nice", "program-pl", "Poids lourd 2024–2025", "2024–2025", "04/2025", 13, 1, 1, 1, 14),
  record("success-aftral-nice-bus-2026", "org-aftral", "site-aftral-nice", "program-bus", "Bus 2025–2026", "2025–2026", "05/2026", 12, 1, 1, 0, 16),
  record("success-aftral-marseille-ecsr-2026", "org-aftral", "site-aftral-marseille", "program-ecsr", "TP ECSR 2025–2026", "2025–2026", "06/2026", 16, 1, 1, 1, 18),
  record("success-aftral-marseille-ecsr-2025", "org-aftral", "site-aftral-marseille", "program-ecsr", "TP ECSR 2024–2025", "2024–2025", "06/2025", 15, 1, 2, 0, 20),
  record("success-aftral-marseille-moto-2026", "org-aftral", "site-aftral-marseille", "program-moto", "Moto 2025–2026", "2025–2026", "05/2026", 13, 1, 1, 0, 22),
  record("success-aftral-marseille-pl-2026", "org-aftral", "site-aftral-marseille", "program-pl", "Poids lourd 2025–2026", "2025–2026", "04/2026", 15, 1, 1, 1, 24),
  record("success-aftral-toulouse-ecsr-2026", "org-aftral", "site-aftral-toulouse", "program-ecsr", "TP ECSR 2025–2026", "2025–2026", "06/2026", 17, 1, 1, 0, 2),
  record("success-aftral-toulouse-ecsr-2025", "org-aftral", "site-aftral-toulouse", "program-ecsr", "TP ECSR 2024–2025", "2024–2025", "06/2025", 16, 1, 1, 1, 5),
  record("success-aftral-toulouse-bus-2026", "org-aftral", "site-aftral-toulouse", "program-bus", "Bus 2025–2026", "2025–2026", "05/2026", 11, 1, 1, 0, 7),
  record("success-ecf-nice-ecsr-2026", "org-ecf", "site-ecf-nice", "program-ecsr", "TP ECSR 2025–2026", "2025–2026", "06/2026", 13, 1, 1, 0, 9),
  record("success-ecf-nice-moto-2026", "org-ecf", "site-ecf-nice", "program-moto", "Moto 2025–2026", "2025–2026", "05/2026", 9, 1, 1, 0, 11),
  record("success-ecf-cannes-ecsr-2026", "org-ecf", "site-ecf-cannes", "program-ecsr", "TP ECSR 2025–2026", "2025–2026", "06/2026", 11, 1, 1, 1, 13),
  record("success-horizon-ecsr-2026", "org-horizon", "site-horizon-nice", "program-ecsr", "TP ECSR 2025–2026", "2025–2026", "06/2026", 8, 0, 1, 0, 15),
];
