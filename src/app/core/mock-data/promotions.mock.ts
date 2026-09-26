import type { StudentStatus } from "../models/app.models";
import { STUDENT_DIRECTORY } from "./students.mock";

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
  studentCount: number;
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

const promotionStudents = (promotionId: string): PromotionStudentSummary[] =>
  STUDENT_DIRECTORY.filter((student) => student.promotionId === promotionId).map(
    ({ id, firstName, lastName, progress, completedHours, status }) => ({
      id,
      firstName,
      lastName,
      progress,
      completedHours,
      status,
    }),
  );

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
    studentCount: 9,
    students: promotionStudents("p1"),
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
    studentCount: 24,
    students: promotionStudents("p2"),
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
