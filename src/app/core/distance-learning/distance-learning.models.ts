export interface DistanceParticipantApi {
  id: string;
  enrollmentId: string;
  displayName: string;
  attendance: string;
  connectedAtUtc?: string | null;
  disconnectedAtUtc?: string | null;
  connectedMinutes: number;
  participationPercent: number;
  completedActivities: number;
  activityCount: number;
}

export interface DistanceLearningSessionApi {
  id: string;
  organizationId: string;
  siteId: string;
  programId: string;
  cohortId: string;
  title: string;
  trainerDisplayName: string;
  trainerEmail?: string | null;
  startsAtUtc: string;
  endsAtUtc: string;
  platform: string;
  joinUrl: string;
  objectives?: string | null;
  status: string;
  participants: DistanceParticipantApi[];
}

export interface AsyncModuleStepApi {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
}

export interface AsyncLearningModuleApi {
  id: string;
  organizationId: string;
  siteId: string;
  programId: string;
  cohortId: string;
  title: string;
  description?: string | null;
  estimatedMinutes: number;
  dueDate: string;
  trainerDisplayName: string;
  status: string;
  progressPercent: number;
  completedStudents: number;
  expectedStudents: number;
  averageScore?: number | null;
  steps: AsyncModuleStepApi[];
}
