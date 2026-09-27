import { SHEET_TITLES } from "./sheets.mock";

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

export const SHEET_CATEGORIES: SheetCategory[] = [
  "rules",
  "risk",
  "vehicle",
  "pedagogy",
  "exam",
  "mobility",
];

function categoryFor(number: number): SheetCategory {
  if (number <= 15) return "rules";
  if (number <= 32) return "risk";
  if (number <= 40) return "vehicle";
  if (number <= 50) return "pedagogy";
  if (number <= 54) return "exam";
  return "mobility";
}

export const DEFAULT_SHEET_CATALOG: SheetCatalogItem[] = SHEET_TITLES.map(
  (title, index) => ({
    id: `sheet-${index + 1}`,
    number: index + 1,
    titleKey: `sheets.titles.${title}`,
    category: categoryFor(index + 1),
    durationMinutes: 40,
    active: true,
    reference:
      index < 40
        ? "Code de la route / référentiel ECSR"
        : "Référentiel TP ECSR / REMC",
  }),
);
