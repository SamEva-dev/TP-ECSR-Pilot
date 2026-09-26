import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";

export interface LearnerProfileApi {
  enrollmentId: string;
  learnerProfileId: string;
  cohortId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  enrollmentStatus: string;
  enrolledOn: string;
}

export interface TopicEvaluationCriterionApi {
  id: string;
  code: string;
  level: "acquired" | "in_progress" | "review" | string;
}

export interface TopicProgressApi {
  id: string;
  topicId: string;
  code: string;
  number: number | null;
  title: string;
  category: string;
  status: string;
  preparationDate: string | null;
  presentationDate: string | null;
  presentationDurationMinutes: number | null;
  evaluatorDisplayName: string | null;
  positivePoints: string | null;
  improvements: string | null;
  comment: string | null;
  nextObjective: string | null;
  evaluationCriteria: TopicEvaluationCriterionApi[];
}

export interface UpdateTopicProgressApiRequest {
  status: string;
  preparationDate: string | null;
  presentationDate: string | null;
  presentationDurationMinutes: number | null;
  evaluatorDisplayName: null;
  positivePoints: string | null;
  improvements: string | null;
  comment: string | null;
  nextObjective: string | null;
  evaluationCriteria: { code: string; level: "acquired" | "in_progress" | "review" }[];
}

export interface CompetencyProgressApi {
  id: string;
  competencyDefinitionId: string;
  code: string;
  title: string;
  level: string;
  score: number | null;
  comment: string | null;
  evaluatorDisplayName: string | null;
  evaluatedAtUtc: string | null;
}

export interface CompetencyDefinitionApi {
  id: string;
  parentId: string | null;
  code: string;
  title: string;
  kind: string;
  sortOrder: number;
  active: boolean;
}

export interface CohortCompetencyRowApi {
  enrollmentId: string;
  firstName: string;
  lastName: string;
  competencies: CompetencyProgressApi[];
}

export interface DrivingEvaluationApi {
  id: string;
  enrollmentId: string;
  competencyDefinitionId: string;
  trainingSessionId: string | null;
  evaluatedAtUtc: string;
  subject: string;
  trainerDisplayName: string;
  positive: string | null;
  difficulty: string | null;
  nextGoal: string | null;
  freeObservation: string | null;
  criteria: { id: string; code: string; label: string; level: string }[];
}

export interface RecordDrivingEvaluationApiRequest {
  competencyDefinitionId: string;
  trainingSessionId: string | null;
  evaluatedAtUtc: string;
  trainerAuthGateUserId: null;
  trainerDisplayName: string;
  subject: string;
  positive: string | null;
  difficulty: string | null;
  nextGoal: string | null;
  freeObservation: string | null;
  criteria: { code: string; label: string; level: string }[];
}

export interface WorkplacePeriodApi {
  id: string;
  periodTypeCode: string;
  company: string;
  city: string;
  tutorName: string;
  startDate: string;
  endDate: string;
  plannedHours: number;
  completedHours: number;
  status: string;
  agreementReceived: boolean;
}

@Injectable({ providedIn: "root" })
export class StudentProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  self() {
    return this.http.get<LearnerProfileApi>(`${this.base}/api/v1/learners/me`);
  }
  enrollment(id: string) {
    return this.http.get<LearnerProfileApi>(
      `${this.base}/api/v1/learners/enrollments/${encodeURIComponent(id)}`,
    );
  }
  topics(id: string) {
    return this.http.get<TopicProgressApi[]>(
      `${this.base}/api/v1/learning/enrollments/${encodeURIComponent(id)}/topics`,
    );
  }
  cohortLearners(cohortId: string) {
    return this.http.get<LearnerProfileApi[]>(
      `${this.base}/api/v1/cohorts/${encodeURIComponent(cohortId)}/learners`,
    );
  }
  updateTopic(
    enrollmentId: string,
    topicId: string,
    request: UpdateTopicProgressApiRequest,
  ) {
    return this.http.put<TopicProgressApi>(
      `${this.base}/api/v1/learning/enrollments/${encodeURIComponent(enrollmentId)}/topics/${encodeURIComponent(topicId)}`,
      request,
    );
  }
  competencies(id: string) {
    return this.http.get<CompetencyProgressApi[]>(
      `${this.base}/api/v1/learning/enrollments/${encodeURIComponent(id)}/competencies`,
    );
  }
  competencyDefinitions(referentialVersionId: string) {
    return this.http.get<CompetencyDefinitionApi[]>(
      `${this.base}/api/v1/learning/referentials/${encodeURIComponent(referentialVersionId)}/competencies`,
    );
  }
  cohortCompetencies(cohortId: string) {
    return this.http.get<CohortCompetencyRowApi[]>(
      `${this.base}/api/v1/learning/cohorts/${encodeURIComponent(cohortId)}/competencies`,
    );
  }
  driving(id: string) {
    return this.http.get<DrivingEvaluationApi[]>(
      `${this.base}/api/v1/learning/enrollments/${encodeURIComponent(id)}/driving-evaluations`,
    );
  }
  recordDriving(id: string, request: RecordDrivingEvaluationApiRequest) {
    return this.http.post<DrivingEvaluationApi>(
      `${this.base}/api/v1/learning/enrollments/${encodeURIComponent(id)}/driving-evaluations`,
      request,
    );
  }
  periods(id: string) {
    return this.http.get<WorkplacePeriodApi[]>(
      `${this.base}/api/v1/workplace/periods`,
      {
        params: new HttpParams().set("enrollmentId", id),
      },
    );
  }
}
