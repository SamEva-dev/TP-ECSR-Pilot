// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export type SheetCategory =
  "rules" | "risk" | "vehicle" | "pedagogy" | "exam" | "mobility";

export interface SheetCatalogItem {
  id: string;
  number: number;
  titleKey?: string;
  customTitle?: string;
  category: SheetCategory;
  durationMinutes: number;
  active: boolean;
  reference?: string;
  customObjective?: string;
  customExample?: string;
  customCorrection?: string;
}
