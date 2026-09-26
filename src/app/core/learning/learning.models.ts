export type CompetencyLevel =
  "not_assessed" | "rework" | "in_progress" | "acquired";
export type TopicProgressStatus =
  | "not_started"
  | "in_progress"
  | "ready"
  | "presented"
  | "validated"
  | "rework";
export interface CompetencyDefinitionDto {
  id: string;
  referentialVersionId: string;
  parentId?: string | null;
  code: string;
  title: string;
  kind: string;
  sortOrder: number;
  active: boolean;
}
export interface LearnerCompetencyDto {
  id: string;
  enrollmentId: string;
  competencyDefinitionId: string;
  code: string;
  title: string;
  level: CompetencyLevel;
  score?: number | null;
  comment?: string | null;
  evaluatorDisplayName?: string | null;
  evaluatedAtUtc?: string | null;
}
export interface PedagogicalTopicDto {
  id: string;
  referentialVersionId: string;
  code: string;
  number?: number | null;
  title: string;
  category: string;
  durationMinutes: number;
  reference?: string | null;
  active: boolean;
  objective?: string | null;
  example?: string | null;
  correction?: string | null;
}
export interface LearnerTopicProgressDto {
  id: string;
  enrollmentId: string;
  topicId: string;
  code: string;
  number?: number | null;
  title: string;
  category: string;
  status: TopicProgressStatus;
  preparationDate?: string | null;
  presentationDate?: string | null;
  presentationDurationMinutes?: number | null;
  evaluatorDisplayName?: string | null;
  comment?: string | null;
}
export interface DrivingCriterionDto {
  id: string;
  code: string;
  label: string;
  level: CompetencyLevel;
}
export interface DrivingEvaluationDto {
  id: string;
  enrollmentId: string;
  competencyDefinitionId: string;
  trainingSessionId?: string | null;
  evaluatedAtUtc: string;
  trainerAuthGateUserId?: string | null;
  trainerDisplayName: string;
  subject: string;
  positive?: string | null;
  difficulty?: string | null;
  nextGoal?: string | null;
  freeObservation?: string | null;
  criteria: DrivingCriterionDto[];
}
