import type { StudentStatus } from "../models/app.models";

export interface PromotionStudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  progress: number;
  completedHours: number;
  status: StudentStatus;
}

export interface PromotionSummary {
  id: string;
  name: string;
  start: string;
  end: string;
  manager: string;
  plannedHours: number;
  completedHours: number;
  remainingHours: number;
  catchupHours: number;
  attendanceRate: number;
  averageProgress: number;
  students: PromotionStudentSummary[];
  exam?: {
    scheduled?: string;
    ready?: number;
    presented?: number;
    graduated?: number;
    partial?: number;
    failed?: number;
    absent?: number;
    successRate?: number;
  };
}

export interface PedagogicalTeamMember {
  id: string;
  initials: string;
  firstName: string;
  lastName: string;
  specialtyKey: string;
  weeklyHours: number;
}

export const PROMOTION_SUMMARIES: PromotionSummary[] = [
  {
    id: "p1",
    name: "TP ECSR 2026–2027",
    start: "01/09/2026",
    end: "30/06/2027",
    manager: "Claire Berthier",
    plannedHours: 910,
    completedHours: 5699,
    remainingHours: 2491,
    catchupHours: 60,
    attendanceRate: 96,
    averageProgress: 69,
    exam: { scheduled: "Février 2027", ready: 6 },
    students: [
      {
        id: "s1",
        firstName: "Sam",
        lastName: "Fokam",
        progress: 72,
        completedHours: 684,
        status: "good",
      },
      {
        id: "s2",
        firstName: "Julie",
        lastName: "Moreau",
        progress: 61,
        completedHours: 555,
        status: "late",
      },
      {
        id: "s3",
        firstName: "Marc",
        lastName: "Girard",
        progress: 78,
        completedHours: 710,
        status: "good",
      },
      {
        id: "s4",
        firstName: "Léa",
        lastName: "Perrin",
        progress: 55,
        completedHours: 501,
        status: "warning",
      },
      {
        id: "s5",
        firstName: "Karim",
        lastName: "Benali",
        progress: 84,
        completedHours: 764,
        status: "good",
      },
      {
        id: "s6",
        firstName: "Nadia",
        lastName: "Chevalier",
        progress: 66,
        completedHours: 601,
        status: "good",
      },
      {
        id: "s7",
        firstName: "Thomas",
        lastName: "Roussel",
        progress: 47,
        completedHours: 428,
        status: "late",
      },
      {
        id: "s8",
        firstName: "Chloé",
        lastName: "Marchand",
        progress: 91,
        completedHours: 828,
        status: "good",
      },
      {
        id: "s9",
        firstName: "Mehdi",
        lastName: "Amrani",
        progress: 69,
        completedHours: 628,
        status: "good",
      },
    ],
  },
  {
    id: "p2",
    name: "TP ECSR 2025–2026",
    start: "02/09/2025",
    end: "26/06/2026",
    manager: "Claire Berthier",
    plannedHours: 910,
    completedHours: 3776,
    remainingHours: 1684,
    catchupHours: 42,
    attendanceRate: 95,
    averageProgress: 69,
    exam: {
      presented: 23,
      graduated: 21,
      partial: 1,
      failed: 1,
      absent: 1,
      successRate: 91.3,
    },
    students: [
      {
        id: "s10",
        firstName: "Emma",
        lastName: "Lefèvre",
        progress: 74,
        completedHours: 673,
        status: "good",
      },
      {
        id: "s11",
        firstName: "Lucas",
        lastName: "Barbier",
        progress: 58,
        completedHours: 528,
        status: "warning",
      },
      {
        id: "s12",
        firstName: "Awa",
        lastName: "Diallo",
        progress: 80,
        completedHours: 728,
        status: "good",
      },
      {
        id: "s13",
        firstName: "Hugo",
        lastName: "Renaud",
        progress: 63,
        completedHours: 573,
        status: "warning",
      },
      {
        id: "s14",
        firstName: "Sarah",
        lastName: "Colin",
        progress: 52,
        completedHours: 473,
        status: "late",
      },
      {
        id: "s15",
        firstName: "Antoine",
        lastName: "Vasseur",
        progress: 88,
        completedHours: 801,
        status: "good",
      },
    ],
  },
];

export const PEDAGOGICAL_TEAM: PedagogicalTeamMember[] = [
  {
    id: "t1",
    initials: "MD",
    firstName: "Marc",
    lastName: "Dupont",
    specialtyKey: "promotions.team.specialties.drivingC3",
    weeklyHours: 32,
  },
  {
    id: "t2",
    initials: "CB",
    firstName: "Claire",
    lastName: "Berthier",
    specialtyKey: "promotions.team.specialties.pedagogyPresentations",
    weeklyHours: 28,
  },
  {
    id: "t3",
    initials: "YM",
    firstName: "Yanis",
    lastName: "Morel",
    specialtyKey: "promotions.team.specialties.regulationClassroom",
    weeklyHours: 30,
  },
  {
    id: "t4",
    initials: "SL",
    firstName: "Sophie",
    lastName: "Lemaire",
    specialtyKey: "promotions.team.specialties.drivingAssessments",
    weeklyHours: 26,
  },
  {
    id: "t5",
    initials: "IT",
    firstName: "Ibrahim",
    lastName: "Traoré",
    specialtyKey: "promotions.team.specialties.awarenessInternships",
    weeklyHours: 24,
  },
];
