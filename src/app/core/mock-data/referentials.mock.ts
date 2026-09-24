import type { ProgramModule } from "../models/workspace.models";

export type ReferentialStatus = "active" | "draft" | "archived";
export type VolumeCategory = "classroom" | "driving" | "internship" | "assessment" | "other";

export interface ReferentialSubCompetency {
  id: string;
  code: string;
  label: string;
}

export interface ReferentialCompetency {
  id: string;
  code: string;
  label: string;
  description: string;
  subCompetencies: ReferentialSubCompetency[];
}

export interface ReferentialVolume {
  id: string;
  label: string;
  category: VolumeCategory;
  hours: number;
  mandatory: boolean;
}

export interface ReferentialStageRequirement {
  id: string;
  label: string;
  hours: number;
  description: string;
  mandatory: boolean;
}

export interface ReferentialCertificationStep {
  id: string;
  label: string;
  durationMinutes: number;
  evaluator: "jury" | "trainer" | "system";
}

export interface TrainingReferential {
  id: string;
  programId: string;
  code: string;
  name: string;
  version: string;
  status: ReferentialStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  totalHours: number;
  enabledModules: ProgramModule[];
  competencies: ReferentialCompetency[];
  volumes: ReferentialVolume[];
  sheetCount: number;
  stageRequirements: ReferentialStageRequirement[];
  requiredDocumentCount: number;
  certificationSchemeName: string;
  certificationSteps: ReferentialCertificationStep[];
  notes: string;
}

const ecsrCompetencies: ReferentialCompetency[] = [
  {
    id: "ecsr-c1",
    code: "C1",
    label: "referentials.demo.ecsr.c1",
    description: "referentials.demo.ecsr.c1Description",
    subCompetencies: [
      { id: "ecsr-c1-a", code: "C1.a", label: "referentials.demo.ecsr.c1a" },
      { id: "ecsr-c1-b", code: "C1.b", label: "referentials.demo.ecsr.c1b" },
      { id: "ecsr-c1-c", code: "C1.c", label: "referentials.demo.ecsr.c1c" },
    ],
  },
  {
    id: "ecsr-c2",
    code: "C2",
    label: "referentials.demo.ecsr.c2",
    description: "referentials.demo.ecsr.c2Description",
    subCompetencies: [
      { id: "ecsr-c2-a", code: "C2.a", label: "referentials.demo.ecsr.c2a" },
      { id: "ecsr-c2-b", code: "C2.b", label: "referentials.demo.ecsr.c2b" },
      { id: "ecsr-c2-c", code: "C2.c", label: "referentials.demo.ecsr.c2c" },
    ],
  },
  {
    id: "ecsr-c3",
    code: "C3",
    label: "referentials.demo.ecsr.c3",
    description: "referentials.demo.ecsr.c3Description",
    subCompetencies: [
      { id: "ecsr-c3-a", code: "C3.a", label: "referentials.demo.ecsr.c3a" },
      { id: "ecsr-c3-b", code: "C3.b", label: "referentials.demo.ecsr.c3b" },
      { id: "ecsr-c3-c", code: "C3.c", label: "referentials.demo.ecsr.c3c" },
    ],
  },
  {
    id: "ecsr-c4",
    code: "C4",
    label: "referentials.demo.ecsr.c4",
    description: "referentials.demo.ecsr.c4Description",
    subCompetencies: [
      { id: "ecsr-c4-a", code: "C4.a", label: "referentials.demo.ecsr.c4a" },
      { id: "ecsr-c4-b", code: "C4.b", label: "referentials.demo.ecsr.c4b" },
      { id: "ecsr-c4-c", code: "C4.c", label: "referentials.demo.ecsr.c4c" },
    ],
  },
];

export const TRAINING_REFERENTIALS: TrainingReferential[] = [
  {
    id: "ref-ecsr-2024",
    programId: "program-ecsr",
    code: "ECSR-R2024",
    name: "TP ECSR",
    version: "RNCP35329 · 2021",
    status: "archived",
    effectiveFrom: "2021-04-29",
    effectiveTo: "2026-04-28",
    totalHours: 910,
    enabledModules: ["planning", "attendance", "sessions", "driving", "sheets", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
    competencies: ecsrCompetencies,
    volumes: [
      { id: "ev1", label: "referentials.volumes.classroom", category: "classroom", hours: 420, mandatory: true },
      { id: "ev2", label: "referentials.volumes.driving", category: "driving", hours: 180, mandatory: true },
      { id: "ev3", label: "referentials.volumes.internship", category: "internship", hours: 280, mandatory: true },
      { id: "ev4", label: "referentials.volumes.assessment", category: "assessment", hours: 30, mandatory: true },
    ],
    sheetCount: 58,
    stageRequirements: [
      { id: "es1", label: "referentials.demo.ecsr.stage1", hours: 140, description: "referentials.demo.ecsr.stage1Description", mandatory: true },
      { id: "es2", label: "referentials.demo.ecsr.stage2", hours: 140, description: "referentials.demo.ecsr.stage2Description", mandatory: true },
    ],
    requiredDocumentCount: 8,
    certificationSchemeName: "referentials.demo.ecsr.certification",
    certificationSteps: [
      { id: "ec1", label: "referentials.demo.ecsr.exam1", durationMinutes: 120, evaluator: "jury" },
      { id: "ec2", label: "referentials.demo.ecsr.exam2", durationMinutes: 60, evaluator: "jury" },
      { id: "ec3", label: "referentials.demo.ecsr.exam3", durationMinutes: 45, evaluator: "system" },
      { id: "ec4", label: "referentials.demo.ecsr.exam4", durationMinutes: 60, evaluator: "jury" },
      { id: "ec5", label: "referentials.demo.ecsr.exam5", durationMinutes: 30, evaluator: "jury" },
    ],
    notes: "referentials.demo.ecsr.archivedNotes",
  },
  {
    id: "ref-ecsr-2026",
    programId: "program-ecsr",
    code: "ECSR-R2026",
    name: "TP ECSR",
    version: "RNCP41862 · 2026",
    status: "active",
    effectiveFrom: "2026-04-29",
    effectiveTo: null,
    totalHours: 910,
    enabledModules: ["planning", "attendance", "sessions", "driving", "sheets", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
    competencies: ecsrCompetencies,
    volumes: [
      { id: "ev21", label: "referentials.volumes.classroom", category: "classroom", hours: 420, mandatory: true },
      { id: "ev22", label: "referentials.volumes.driving", category: "driving", hours: 180, mandatory: true },
      { id: "ev23", label: "referentials.volumes.internship", category: "internship", hours: 280, mandatory: true },
      { id: "ev24", label: "referentials.volumes.assessment", category: "assessment", hours: 30, mandatory: true },
    ],
    sheetCount: 58,
    stageRequirements: [
      { id: "es21", label: "referentials.demo.ecsr.stage1", hours: 140, description: "referentials.demo.ecsr.stage1Description", mandatory: true },
      { id: "es22", label: "referentials.demo.ecsr.stage2", hours: 140, description: "referentials.demo.ecsr.stage2Description", mandatory: true },
    ],
    requiredDocumentCount: 8,
    certificationSchemeName: "referentials.demo.ecsr.certification",
    certificationSteps: [
      { id: "ec21", label: "referentials.demo.ecsr.exam1", durationMinutes: 120, evaluator: "jury" },
      { id: "ec22", label: "referentials.demo.ecsr.exam2", durationMinutes: 60, evaluator: "jury" },
      { id: "ec23", label: "referentials.demo.ecsr.exam3", durationMinutes: 45, evaluator: "system" },
      { id: "ec24", label: "referentials.demo.ecsr.exam4", durationMinutes: 60, evaluator: "jury" },
      { id: "ec25", label: "referentials.demo.ecsr.exam5", durationMinutes: 30, evaluator: "jury" },
    ],
    notes: "referentials.demo.ecsr.activeNotes",
  },
  {
    id: "ref-ecsr-2029",
    programId: "program-ecsr",
    code: "ECSR-R2029",
    name: "TP ECSR",
    version: "Projet 2029",
    status: "draft",
    effectiveFrom: "2029-01-01",
    effectiveTo: null,
    totalHours: 930,
    enabledModules: ["planning", "attendance", "sessions", "driving", "sheets", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
    competencies: [
      ...ecsrCompetencies,
      {
        id: "ecsr-c5",
        code: "C5",
        label: "referentials.demo.ecsr.c5",
        description: "referentials.demo.ecsr.c5Description",
        subCompetencies: [
          { id: "ecsr-c5-a", code: "C5.a", label: "referentials.demo.ecsr.c5a" },
          { id: "ecsr-c5-b", code: "C5.b", label: "referentials.demo.ecsr.c5b" },
        ],
      },
    ],
    volumes: [
      { id: "ev31", label: "referentials.volumes.classroom", category: "classroom", hours: 420, mandatory: true },
      { id: "ev32", label: "referentials.volumes.driving", category: "driving", hours: 190, mandatory: true },
      { id: "ev33", label: "referentials.volumes.internship", category: "internship", hours: 280, mandatory: true },
      { id: "ev34", label: "referentials.volumes.assessment", category: "assessment", hours: 40, mandatory: true },
    ],
    sheetCount: 60,
    stageRequirements: [
      { id: "es31", label: "referentials.demo.ecsr.stage1", hours: 140, description: "referentials.demo.ecsr.stage1Description", mandatory: true },
      { id: "es32", label: "referentials.demo.ecsr.stage2", hours: 140, description: "referentials.demo.ecsr.stage2Description", mandatory: true },
    ],
    requiredDocumentCount: 9,
    certificationSchemeName: "referentials.demo.ecsr.certificationDraft",
    certificationSteps: [
      { id: "ec31", label: "referentials.demo.ecsr.exam1", durationMinutes: 120, evaluator: "jury" },
      { id: "ec32", label: "referentials.demo.ecsr.exam2", durationMinutes: 60, evaluator: "jury" },
      { id: "ec33", label: "referentials.demo.ecsr.exam3", durationMinutes: 45, evaluator: "system" },
      { id: "ec34", label: "referentials.demo.ecsr.exam4", durationMinutes: 60, evaluator: "jury" },
      { id: "ec35", label: "referentials.demo.ecsr.exam5", durationMinutes: 30, evaluator: "jury" },
    ],
    notes: "referentials.demo.ecsr.draftNotes",
  },
  {
    id: "ref-moto-2027",
    programId: "program-moto",
    code: "MOTO-R2027",
    name: "Formation Moto",
    version: "MOTO · 2027",
    status: "active",
    effectiveFrom: "2027-01-01",
    effectiveTo: null,
    totalHours: 245,
    enabledModules: ["planning", "attendance", "sessions", "driving", "plateau", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
    competencies: [
      { id: "m-c1", code: "M1", label: "referentials.demo.moto.m1", description: "referentials.demo.moto.m1Description", subCompetencies: [
        { id: "m-c1-a", code: "M1.a", label: "referentials.demo.moto.m1a" },
        { id: "m-c1-b", code: "M1.b", label: "referentials.demo.moto.m1b" },
      ] },
      { id: "m-c2", code: "M2", label: "referentials.demo.moto.m2", description: "referentials.demo.moto.m2Description", subCompetencies: [
        { id: "m-c2-a", code: "M2.a", label: "referentials.demo.moto.m2a" },
        { id: "m-c2-b", code: "M2.b", label: "referentials.demo.moto.m2b" },
      ] },
    ],
    volumes: [
      { id: "mv1", label: "referentials.volumes.classroom", category: "classroom", hours: 70, mandatory: true },
      { id: "mv2", label: "referentials.volumes.driving", category: "driving", hours: 95, mandatory: true },
      { id: "mv3", label: "referentials.volumes.internship", category: "internship", hours: 70, mandatory: true },
      { id: "mv4", label: "referentials.volumes.assessment", category: "assessment", hours: 10, mandatory: true },
    ],
    sheetCount: 0,
    stageRequirements: [{ id: "ms1", label: "referentials.demo.moto.stage", hours: 70, description: "referentials.demo.moto.stageDescription", mandatory: true }],
    requiredDocumentCount: 6,
    certificationSchemeName: "referentials.demo.moto.certification",
    certificationSteps: [
      { id: "mc1", label: "referentials.demo.moto.exam1", durationMinutes: 45, evaluator: "jury" },
      { id: "mc2", label: "referentials.demo.moto.exam2", durationMinutes: 60, evaluator: "jury" },
    ],
    notes: "referentials.demo.moto.notes",
  },
  {
    id: "ref-pl-2027",
    programId: "program-pl",
    code: "PL-R2027",
    name: "Poids lourd",
    version: "PL · 2027",
    status: "active",
    effectiveFrom: "2027-01-01",
    effectiveTo: null,
    totalHours: 434,
    enabledModules: ["planning", "attendance", "sessions", "driving", "plateau", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
    competencies: [
      { id: "pl-c1", code: "PL1", label: "referentials.demo.pl.c1", description: "referentials.demo.pl.c1Description", subCompetencies: [
        { id: "pl-c1-a", code: "PL1.a", label: "referentials.demo.pl.c1a" },
        { id: "pl-c1-b", code: "PL1.b", label: "referentials.demo.pl.c1b" },
      ] },
      { id: "pl-c2", code: "PL2", label: "referentials.demo.pl.c2", description: "referentials.demo.pl.c2Description", subCompetencies: [
        { id: "pl-c2-a", code: "PL2.a", label: "referentials.demo.pl.c2a" },
        { id: "pl-c2-b", code: "PL2.b", label: "referentials.demo.pl.c2b" },
      ] },
    ],
    volumes: [
      { id: "plv1", label: "referentials.volumes.classroom", category: "classroom", hours: 144, mandatory: true },
      { id: "plv2", label: "referentials.volumes.driving", category: "driving", hours: 120, mandatory: true },
      { id: "plv3", label: "referentials.volumes.internship", category: "internship", hours: 140, mandatory: true },
      { id: "plv4", label: "referentials.volumes.assessment", category: "assessment", hours: 30, mandatory: true },
    ],
    sheetCount: 0,
    stageRequirements: [{ id: "pls1", label: "referentials.demo.pl.stage", hours: 140, description: "referentials.demo.pl.stageDescription", mandatory: true }],
    requiredDocumentCount: 7,
    certificationSchemeName: "referentials.demo.pl.certification",
    certificationSteps: [
      { id: "plc1", label: "referentials.demo.pl.exam1", durationMinutes: 60, evaluator: "jury" },
      { id: "plc2", label: "referentials.demo.pl.exam2", durationMinutes: 90, evaluator: "jury" },
    ],
    notes: "referentials.demo.pl.notes",
  },
  {
    id: "ref-bus-2027",
    programId: "program-bus",
    code: "BUS-R2027",
    name: "Transport voyageurs / Bus",
    version: "BUS · 2027",
    status: "active",
    effectiveFrom: "2027-01-01",
    effectiveTo: null,
    totalHours: 420,
    enabledModules: ["planning", "attendance", "sessions", "driving", "plateau", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
    competencies: [
      { id: "bus-c1", code: "BUS1", label: "referentials.demo.bus.c1", description: "referentials.demo.bus.c1Description", subCompetencies: [
        { id: "bus-c1-a", code: "BUS1.a", label: "referentials.demo.bus.c1a" },
        { id: "bus-c1-b", code: "BUS1.b", label: "referentials.demo.bus.c1b" },
      ] },
      { id: "bus-c2", code: "BUS2", label: "referentials.demo.bus.c2", description: "referentials.demo.bus.c2Description", subCompetencies: [
        { id: "bus-c2-a", code: "BUS2.a", label: "referentials.demo.bus.c2a" },
        { id: "bus-c2-b", code: "BUS2.b", label: "referentials.demo.bus.c2b" },
      ] },
    ],
    volumes: [
      { id: "bv1", label: "referentials.volumes.classroom", category: "classroom", hours: 150, mandatory: true },
      { id: "bv2", label: "referentials.volumes.driving", category: "driving", hours: 100, mandatory: true },
      { id: "bv3", label: "referentials.volumes.internship", category: "internship", hours: 140, mandatory: true },
      { id: "bv4", label: "referentials.volumes.assessment", category: "assessment", hours: 30, mandatory: true },
    ],
    sheetCount: 0,
    stageRequirements: [{ id: "bs1", label: "referentials.demo.bus.stage", hours: 140, description: "referentials.demo.bus.stageDescription", mandatory: true }],
    requiredDocumentCount: 7,
    certificationSchemeName: "referentials.demo.bus.certification",
    certificationSteps: [
      { id: "bc1", label: "referentials.demo.bus.exam1", durationMinutes: 60, evaluator: "jury" },
      { id: "bc2", label: "referentials.demo.bus.exam2", durationMinutes: 90, evaluator: "jury" },
    ],
    notes: "referentials.demo.bus.notes",
  },
];

export interface ReferentialVersionFormValue {
  programId: string;
  sourceReferentialId: string;
  version: string;
  code: string;
  effectiveFrom: string;
  status: ReferentialStatus;
}
