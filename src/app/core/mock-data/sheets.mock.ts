import type { StudentDirectoryItem } from "./students.mock";

export type SheetStatus =
  | "not_started"
  | "in_progress"
  | "ready"
  | "presented"
  | "validated"
  | "rework";

export type EvaluationLevel = "acquired" | "in_progress" | "review";

export interface PedagogicalSheet {
  number: number;
  titleKey: string;
  status: SheetStatus;
  preparationDate?: string;
  presentationDate?: string;
  durationMinutes?: number;
  evaluator?: string;
  commentKey?: "sheets.comments.validated" | "sheets.comments.rework";
}

export const SHEET_TITLES = [
  "verticalSigns",
  "intersections",
  "priorities",
  "crossingOvertaking",
  "speedLimits",
  "safetyDistance",
  "trafficLights",
  "parking",
  "motorway",
  "expressways",
  "roundabout",
  "reducedVisibility",
  "braking",
  "tyres",
  "vehicleLighting",
  "alcohol",
  "drugs",
  "fatigueVigilance",
  "phone",
  "pointsLicence",
  "insurance",
  "accidentStatement",
  "firstAid",
  "ecoDriving",
  "seatBelt",
  "childRestraints",
  "sharingRoad",
  "twoWheelers",
  "heavyVehiclesBlindSpots",
  "pedestrians",
  "cyclists",
  "nightDriving",
  "bendsGradients",
  "aquaplaning",
  "snowDriving",
  "technicalInspection",
  "vehicleDocuments",
  "vehicleLoading",
  "towing",
  "accompaniedDriving",
  "errorPedagogy",
  "questioningMethod",
  "learningObjectives",
  "initialAssessment",
  "learningBooklet",
  "remc",
  "remcC1",
  "remcC2",
  "remcC3",
  "remcC4",
  "practicalExam",
  "theoryExam",
  "drivingAids",
  "electricVehicle",
  "urbanMobility",
  "occupationalRoadRisk",
  "pedagogicalCommunication",
  "endTrainingReview",
] as const;

export const EVALUATORS = [
  "Claire Berthier",
  "Yanis Morel",
  "Sophie Lemaire",
  "Ibrahim Traoré",
  "Marc Dupont",
] as const;

export const EVALUATION_CRITERIA = [
  "structure",
  "introduction",
  "hook",
  "objectives",
  "content",
  "regulation",
  "questioningMethod",
  "animation",
  "timeManagement",
  "rip",
  "review",
] as const;

export const ALL_SHEET_STATUSES: SheetStatus[] = [
  "not_started",
  "in_progress",
  "ready",
  "presented",
  "validated",
  "rework",
];

export function reworkCountFor(student: StudentDirectoryItem): number {
  if (student.id === "s1") return 6;
  return Math.max(1, Math.round(student.preparedSheets * 0.16));
}

export function sheetsFor(student: StudentDirectoryItem): PedagogicalSheet[] {
  const rework = reworkCountFor(student);
  return SHEET_TITLES.map((title, index) => {
    const number = index + 1;
    let status: SheetStatus = "not_started";

    if (number <= student.validatedSheets) status = "validated";
    else if (number <= student.validatedSheets + rework) status = "rework";
    else if (
      number <=
      Math.max(student.validatedSheets + rework, student.presentedSheets)
    )
      status = "presented";
    else if (number <= student.preparedSheets)
      status = number % 2 === 0 ? "ready" : "in_progress";

    const isPresented =
      status === "presented" || status === "validated" || status === "rework";
    return {
      number,
      titleKey: `sheets.titles.${title}`,
      status,
      preparationDate:
        status === "not_started"
          ? undefined
          : `2026-0${(number % 9) + 1}-1${number % 9}`,
      presentationDate: isPresented
        ? `2026-0${(number % 9) + 1}-2${number % 8}`
        : undefined,
      durationMinutes: isPresented ? 45 : undefined,
      evaluator: isPresented
        ? EVALUATORS[number % EVALUATORS.length]
        : undefined,
      commentKey:
        status === "rework"
          ? "sheets.comments.rework"
          : status === "validated"
            ? "sheets.comments.validated"
            : undefined,
    };
  });
}
