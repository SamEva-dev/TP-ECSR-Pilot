export interface StatisticsPromotionRow {
  id: string;
  name: string;
  progress: number;
  completedHours: number;
  plannedHours: number;
  attendance: number;
  catchupHours: number;
}

export interface StatisticsCompetencyRow {
  code: "C1" | "C2" | "C3" | "C4";
  labelKey: string;
  value: number;
}

export interface StatisticsRankingRow {
  rank: number;
  name: string;
  progress: number;
}

export interface StatisticsStatusRow {
  key: "good" | "warning" | "late" | "finished";
  count: number;
  value: number;
}

export const CENTER_PROMOTIONS: StatisticsPromotionRow[] = [
  {
    id: "p1",
    name: "TP ECSR 2026–2027",
    progress: 69,
    completedHours: 5699,
    plannedHours: 8190,
    attendance: 96,
    catchupHours: 60,
  },
  {
    id: "p2",
    name: "TP ECSR 2025–2026",
    progress: 69,
    completedHours: 3776,
    plannedHours: 5460,
    attendance: 95,
    catchupHours: 42,
  },
];

export const CENTER_COMPETENCIES: StatisticsCompetencyRow[] = [
  { code: "C1", labelKey: "statistics.competencies.c1", value: 88 },
  { code: "C2", labelKey: "statistics.competencies.c2", value: 69 },
  { code: "C3", labelKey: "statistics.competencies.c3", value: 49 },
  { code: "C4", labelKey: "statistics.competencies.c4", value: 29 },
];

export const CENTER_RANKING: StatisticsRankingRow[] = [
  { rank: 1, name: "Chloé Marchand", progress: 91 },
  { rank: 2, name: "Antoine Vasseur", progress: 88 },
  { rank: 3, name: "Karim Benali", progress: 84 },
  { rank: 4, name: "Awa Diallo", progress: 80 },
  { rank: 5, name: "Marc Girard", progress: 78 },
  { rank: 6, name: "Emma Lefèvre", progress: 74 },
];

export const CENTER_STATUSES: StatisticsStatusRow[] = [
  { key: "good", count: 9, value: 60 },
  { key: "warning", count: 3, value: 20 },
  { key: "late", count: 3, value: 20 },
  { key: "finished", count: 0, value: 0 },
];

export const TRAINER_STUDENTS: StatisticsRankingRow[] = [
  { rank: 1, name: "Karim Benali", progress: 84 },
  { rank: 2, name: "Marc Girard", progress: 78 },
  { rank: 3, name: "Sam Fokam", progress: 72 },
  { rank: 4, name: "Nadia Chevalier", progress: 66 },
  { rank: 5, name: "Julie Moreau", progress: 61 },
  { rank: 6, name: "Léa Perrin", progress: 55 },
];

export const TRAINER_COMPETENCIES: StatisticsCompetencyRow[] = [
  { code: "C1", labelKey: "statistics.competencies.c1", value: 90 },
  { code: "C2", labelKey: "statistics.competencies.c2", value: 72 },
  { code: "C3", labelKey: "statistics.competencies.c3", value: 53 },
  { code: "C4", labelKey: "statistics.competencies.c4", value: 31 },
];

export const STUDENT_COMPETENCIES: StatisticsCompetencyRow[] = [
  { code: "C1", labelKey: "statistics.competencies.c1", value: 92 },
  { code: "C2", labelKey: "statistics.competencies.c2", value: 72 },
  { code: "C3", labelKey: "statistics.competencies.c3", value: 52 },
  { code: "C4", labelKey: "statistics.competencies.c4", value: 32 },
];

export const SECRETARIAT_PRIORITIES = [
  {
    name: "Thomas Roussel",
    detailKey: "statistics.secretariat.priorities.catchup",
    value: 18,
  },
  {
    name: "Julie Moreau",
    detailKey: "statistics.secretariat.priorities.catchup",
    value: 14,
  },
  {
    name: "Léa Perrin",
    detailKey: "statistics.secretariat.priorities.catchup",
    value: 12,
  },
  {
    name: "Sarah Colin",
    detailKey: "statistics.secretariat.priorities.absence",
    value: 2,
  },
];
