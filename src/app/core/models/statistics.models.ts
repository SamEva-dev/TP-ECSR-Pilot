// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

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
