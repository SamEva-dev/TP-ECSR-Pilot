// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

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
