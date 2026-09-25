export type WorkplacePeriodStatus =
  "planned" | "inProgress" | "completed" | "incomplete" | "cancelled";
export interface WorkplaceActivityDto {
  id: string;
  definitionId: string;
  code: string;
  title: string;
  labelKey?: string | null;
  mandatory: boolean;
  status: "pending" | "done" | "notApplicable";
  comment?: string | null;
}
export interface WorkplaceDocumentDto {
  id: string;
  requirementId: string;
  code: string;
  title: string;
  labelKey?: string | null;
  mandatory: boolean;
  status: "missing" | "available" | "validated";
  documentId?: string | null;
}
export interface WorkplaceEvaluationDto {
  id: string;
  kind: string;
  evaluatorDisplayName: string;
  evaluatedAtUtc: string;
  summary: string;
  strengths: string | null;
  improvementAreas: string | null;
  validated: boolean | null;
}
export interface WorkplacePeriodDto {
  id: string;
  enrollmentId: string;
  cohortId: string;
  referentialVersionId: string;
  periodTypeCode: string;
  learnerDisplayName: string;
  learnerExternalKey?: string | null;
  company: string;
  city: string;
  tutorName: string;
  tutorEmail?: string | null;
  tutorPhone?: string | null;
  startDate: string;
  endDate: string;
  plannedHours: number;
  completedHours: number;
  status: WorkplacePeriodStatus;
  agreementReceived: boolean;
  trainerVisible: boolean;
  notes?: string | null;
  tutorObservation?: string | null;
  activities: WorkplaceActivityDto[];
  documents: WorkplaceDocumentDto[];
  evaluations: WorkplaceEvaluationDto[];
}
export interface CohortLearnerDto {
  enrollmentId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  externalKey?: string | null;
}
export interface CreateWorkplacePeriodPayload {
  enrollmentId: string;
  periodTypeCode: string;
  company: string;
  city: string;
  tutorName: string;
  tutorEmail?: string;
  tutorPhone?: string;
  startDate: string;
  endDate: string;
  plannedHours: number;
  agreementReceived: boolean;
  notes?: string;
}
