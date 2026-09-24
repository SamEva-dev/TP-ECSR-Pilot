import type { ProgramModule } from "../models/workspace.models";

export type ProgramCatalogStatus = "active" | "draft" | "inactive";
export type ProgramCatalogCategory = string;

export interface ProgramCatalogItem {
  id: string;
  apiId?: string;
  code: string;
  name: string;
  category: ProgramCatalogCategory;
  icon: string;
  description: string;
  referenceVersion: string;
  durationHours: number;
  enabledModules: ProgramModule[];
  siteIds: string[];
  status: ProgramCatalogStatus;
  students: number;
  trainers: number;
  activeCohorts: number;
  successRate: number | null;
}

export interface ProgramFormValue {
  code: string;
  name: string;
  category: ProgramCatalogCategory;
  description: string;
  referenceVersion: string;
  durationHours: number;
  status: ProgramCatalogStatus;
  enabledModules: ProgramModule[];
}

export const PROGRAM_MODULES: ProgramModule[] = [
  "planning",
  "attendance",
  "sessions",
  "driving",
  "plateau",
  "sheets",
  "skills",
  "internships",
  "documents",
  "assessments",
  "certification",
  "distanceLearning",
  "statistics",
];

export const PROGRAM_CATALOG: ProgramCatalogItem[] = [
  {
    id: "program-ecsr",
    code: "ECSR",
    name: "TP ECSR",
    category: "teacher",
    icon: "ph-steering-wheel",
    description: "programs.demo.ecsrDescription",
    referenceVersion: "RNCP41862 · 2026",
    durationHours: 910,
    enabledModules: ["planning", "attendance", "sessions", "driving", "sheets", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
    siteIds: ["site-aftral-nice", "site-aftral-marseille", "site-aftral-toulouse", "site-ecf-nice", "site-ecf-cannes", "site-horizon-nice"],
    status: "active",
    students: 88,
    trainers: 23,
    activeCohorts: 6,
    successRate: 91,
  },
  {
    id: "program-moto",
    code: "MOTO",
    name: "Formation Moto",
    category: "motorcycle",
    icon: "ph-motorcycle",
    description: "programs.demo.motoDescription",
    referenceVersion: "MOTO · 2027",
    durationHours: 245,
    enabledModules: ["planning", "attendance", "sessions", "driving", "plateau", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
    siteIds: ["site-aftral-nice", "site-aftral-marseille", "site-ecf-nice"],
    status: "active",
    students: 36,
    trainers: 11,
    activeCohorts: 3,
    successRate: 94,
  },
  {
    id: "program-pl",
    code: "PL",
    name: "Poids lourd",
    category: "heavy-vehicle",
    icon: "ph-truck",
    description: "programs.demo.plDescription",
    referenceVersion: "PL · 2027",
    durationHours: 434,
    enabledModules: ["planning", "attendance", "sessions", "driving", "plateau", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
    siteIds: ["site-aftral-nice", "site-aftral-marseille"],
    status: "active",
    students: 27,
    trainers: 9,
    activeCohorts: 2,
    successRate: 88,
  },
  {
    id: "program-bus",
    code: "BUS",
    name: "Transport voyageurs / Bus",
    category: "passenger-transport",
    icon: "ph-bus",
    description: "programs.demo.busDescription",
    referenceVersion: "BUS · 2027",
    durationHours: 420,
    enabledModules: ["planning", "attendance", "sessions", "driving", "plateau", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
    siteIds: ["site-aftral-nice", "site-aftral-toulouse"],
    status: "active",
    students: 21,
    trainers: 7,
    activeCohorts: 2,
    successRate: 87,
  },
];
