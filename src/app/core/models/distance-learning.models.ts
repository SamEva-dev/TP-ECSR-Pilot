// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export type DistancePlatform = "teams" | "zoom" | "meet" | "jitsi" | "other";

export type DistanceSessionStatus = "scheduled" | "live" | "closed";

export type DistanceAttendanceStatus = "present" | "late" | "absent" | "disconnected";

export type DistanceModuleStatus = "not-started" | "in-progress" | "completed" | "late";

export type DistanceResourceType = "document" | "video" | "link" | "exercise";

export type DistanceInteractionType = "quiz" | "poll" | "question" | "exercise";

export interface DistanceParticipant {
  id: string;
  studentId: string;
  name: string;
  attendance: DistanceAttendanceStatus;
  connectedAt?: string;
  disconnectedAt?: string;
  connectedMinutes: number;
  participation: number;
  completedActivities: number;
  activityCount: number;
}

export interface DistanceLiveSession {
  id: string;
  organizationId: string;
  siteId: string;
  programId: string;
  cohortId: string;
  titleKey: string;
  trainer: string;
  date: string;
  start: string;
  end: string;
  platform: DistancePlatform;
  joinUrl: string;
  status: DistanceSessionStatus;
  expected: number;
  objectivesKey: string;
  participants: DistanceParticipant[];
  resourceIds: string[];
  interactionIds: string[];
}

export interface DistanceResource {
  id: string;
  titleKey: string;
  type: DistanceResourceType;
  durationMinutes?: number;
  viewedBy: number;
  totalStudents: number;
}

export interface DistanceInteraction {
  id: string;
  sessionId: string;
  titleKey: string;
  type: DistanceInteractionType;
  completed: number;
  expected: number;
  successRate?: number;
}

export interface DistanceModuleStep {
  id: string;
  labelKey: string;
  completed: boolean;
}

export interface DistanceAsyncModule {
  id: string;
  organizationId: string;
  siteId: string;
  programId: string;
  cohortId: string;
  titleKey: string;
  descriptionKey: string;
  estimatedMinutes: number;
  dueDate: string;
  trainer: string;
  status: DistanceModuleStatus;
  progress: number;
  completedStudents: number;
  expectedStudents: number;
  score?: number;
  steps: DistanceModuleStep[];
}

export interface DistanceSiteMetric {
  siteId: string;
  liveHours: number;
  asyncHours: number;
  activeStudents: number;
  completionRate: number;
  lateModules: number;
}
