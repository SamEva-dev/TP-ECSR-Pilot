export interface OrganizationDashboard {
  organizationId: string;
  sites: number;
  activePrograms: number;
  activeCohorts: number;
  learners: number;
  attendanceRate: number;
  averageProgressRate: number;
  certificationSuccessRate: number;
  openAlerts: number;
}

export interface SiteDashboard {
  siteId: string;
  siteName: string;
  activeCohorts: number;
  learners: number;
  attendanceRate: number;
  averageProgressRate: number;
  certificationSuccessRate: number;
}

export interface CohortDashboard {
  cohortId: string;
  cohortCode: string;
  cohortName: string;
  learners: number;
  plannedMinutes: number;
  deliveredMinutes: number;
  presentMinutes: number;
  attendanceRate: number;
  averageCompetencyProgress: number;
  workplacePeriodsCompleted: number;
  certificationEligible: number;
  certificationObtained: number;
  openAlerts: number;
}

export interface ReportingTrendPoint {
  date: string;
  value: number;
}

export interface AuditEntry {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  userDisplayName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  route?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
  ipAddress?: string | null;
  occurredAtUtc: string;
}

export interface PagedAudit {
  items: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CohortLearnerDashboard {
  enrollmentId: string;
  learnerProfileId: string;
  firstName: string;
  lastName: string;
  enrollmentStatus: string;
  plannedMinutes: number;
  completedMinutes: number;
  catchupMinutes: number;
  preparedTopics: number;
  presentedTopics: number;
  validatedTopics: number;
  reworkTopics: number;
  totalTopics: number;
  averageCompetencyProgress: number;
  competencies: Record<string, number>;
  attendanceExpectedMinutes: number;
  attendancePresentMinutes: number;
  attendanceRate: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  classroomMinutes: number;
  drivingMinutes: number;
  internshipMinutes: number;
}

export interface CohortDrivingObservation {
  id: string;
  enrollmentId: string;
  learnerDisplayName: string;
  evaluatedAtUtc: string;
  competencyCode: string;
  subject: string;
  positive: string;
  difficulty: string;
  nextGoal: string;
}

export interface LearnerAttendanceDetail {
  startsAtUtc: string;
  sessionTitle: string;
  status: string;
  missedMinutes: number;
}

export interface LearnerSkillCriterionDetail {
  id: string;
  code: string;
  title: string;
  level: string;
  score: number;
}

export interface LearnerSkillDetail {
  id: string;
  code: string;
  title: string;
  progress: number;
  criteria: LearnerSkillCriterionDetail[];
}

export interface LearnerTopicDetail {
  id: string;
  code: string;
  number?: number | null;
  title: string;
  category: string;
  status: string;
  preparationDate?: string | null;
  presentationDate?: string | null;
}

export interface LearnerDrivingCriterionDetail {
  code: string;
  label: string;
  level: string;
}

export interface LearnerDrivingDetail {
  id: string;
  evaluatedAtUtc: string;
  competencyCode: string;
  subject: string;
  trainerDisplayName: string;
  positive: string;
  difficulty: string;
  nextGoal: string;
  criteria: LearnerDrivingCriterionDetail[];
}

export interface LearnerWorkplaceActivityDetail {
  code: string;
  title: string;
  status: string;
}

export interface LearnerWorkplaceEvaluationDetail {
  kind: string;
  evaluatorDisplayName: string;
  evaluatedAtUtc: string;
  summary: string;
  strengths: string;
  improvementAreas: string;
  validated?: boolean | null;
}

export interface LearnerWorkplaceDetail {
  id: string;
  company: string;
  city: string;
  tutorName: string;
  startDate: string;
  endDate: string;
  plannedHours: number;
  completedHours: number;
  status: string;
  tutorObservation: string;
  activities: LearnerWorkplaceActivityDetail[];
  evaluations: LearnerWorkplaceEvaluationDetail[];
}

export interface LearnerDocumentDetail {
  id: string;
  title: string;
  category: string;
  createdAtUtc: string;
  sizeBytes: number;
  fileName: string;
}

export interface LearnerCertificationStepDetail {
  id: string;
  code: string;
  title: string;
  unitCode: string;
  durationMinutes: number;
  outcome: string;
}

export interface LearnerCertificationDetail {
  candidateId: string;
  examSessionId: string;
  sessionTitle: string;
  startsAtUtc: string;
  endsAtUtc: string;
  status: string;
  eligible?: boolean | null;
  decision: string;
  eligibilityBlockers: string[];
  steps: LearnerCertificationStepDetail[];
}

export interface LearnerHistoryDetail {
  id: string;
  occurredAtUtc: string;
  action: string;
  userDisplayName: string;
}

export interface LearnerDetailReport {
  enrollmentId: string;
  learnerProfileId: string;
  cohortId: string;
  siteId: string;
  programId: string;
  referentialVersionId: string;
  cohortKey: string;
  cohortName: string;
  cohortStartDate: string;
  cohortEndDate: string;
  firstName: string;
  lastName: string;
  email: string;
  enrollmentStatus: string;
  summary: CohortLearnerDashboard;
  attendance: LearnerAttendanceDetail[];
  skills: LearnerSkillDetail[];
  topics: LearnerTopicDetail[];
  driving: LearnerDrivingDetail[];
  workplace: LearnerWorkplaceDetail[];
  documents: LearnerDocumentDetail[];
  certification?: LearnerCertificationDetail | null;
  history: LearnerHistoryDetail[];
}

export interface CertificationSuccessUnitResult {
  code: string;
  validated: boolean;
}

export interface CertificationSuccessCandidate {
  id: string;
  enrollmentId: string;
  firstName: string;
  lastName: string;
  candidateNumber: string;
  result: "obtained" | "partial" | "failed" | "absent";
  unitResults: CertificationSuccessUnitResult[];
}

export interface CertificationSuccessRecord {
  cohortId: string;
  cohortKey: string;
  organizationId: string;
  siteId: string;
  programId: string;
  cohortName: string;
  cohortStartDate: string;
  cohortEndDate: string;
  examSessionId: string;
  sessionTitle: string;
  sessionStartsAtUtc: string;
  presented: number;
  graduated: number;
  partial: number;
  failed: number;
  absent: number;
  rate: number;
  candidates: CertificationSuccessCandidate[];
}
