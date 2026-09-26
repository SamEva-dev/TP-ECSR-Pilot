import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import type {
  CompetencyDefinitionDto,
  DrivingEvaluationDto,
  LearnerCompetencyDto,
  LearnerTopicProgressDto,
  PedagogicalTopicDto,
} from "./learning.models";

@Injectable({ providedIn: "root" })
export class LearningApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/learning`;
  getCompetencyDefinitions(
    referentialVersionId: string,
  ): Observable<CompetencyDefinitionDto[]> {
    return this.http.get<CompetencyDefinitionDto[]>(
      `${this.base}/referentials/${referentialVersionId}/competencies`,
    );
  }
  getLearnerCompetencies(
    enrollmentId: string,
  ): Observable<LearnerCompetencyDto[]> {
    return this.http.get<LearnerCompetencyDto[]>(
      `${this.base}/enrollments/${enrollmentId}/competencies`,
    );
  }
  evaluateCompetency(
    enrollmentId: string,
    competencyDefinitionId: string,
    body: unknown,
  ): Observable<LearnerCompetencyDto> {
    return this.http.put<LearnerCompetencyDto>(
      `${this.base}/enrollments/${enrollmentId}/competencies/${competencyDefinitionId}`,
      body,
    );
  }
  getTopics(referentialVersionId: string): Observable<PedagogicalTopicDto[]> {
    return this.http.get<PedagogicalTopicDto[]>(
      `${this.base}/referentials/${referentialVersionId}/topics`,
    );
  }
  getTopicCatalog(referentialVersionId: string): Observable<PedagogicalTopicDto[]> {
    return this.http.get<PedagogicalTopicDto[]>(
      `${this.base}/referentials/${referentialVersionId}/topics/catalog`,
    );
  }
  createTopic(referentialVersionId: string, body: unknown): Observable<PedagogicalTopicDto> {
    return this.http.post<PedagogicalTopicDto>(
      `${this.base}/referentials/${referentialVersionId}/topics`, body,
    );
  }
  updateTopicCatalog(referentialVersionId: string, topicId: string, body: unknown): Observable<PedagogicalTopicDto> {
    return this.http.put<PedagogicalTopicDto>(
      `${this.base}/referentials/${referentialVersionId}/topics/${topicId}`, body,
    );
  }
  deleteTopic(referentialVersionId: string, topicId: string): Observable<boolean> {
    return this.http.delete<boolean>(
      `${this.base}/referentials/${referentialVersionId}/topics/${topicId}`,
    );
  }
  getLearnerTopics(
    enrollmentId: string,
  ): Observable<LearnerTopicProgressDto[]> {
    return this.http.get<LearnerTopicProgressDto[]>(
      `${this.base}/enrollments/${enrollmentId}/topics`,
    );
  }
  updateTopic(
    enrollmentId: string,
    topicId: string,
    body: unknown,
  ): Observable<LearnerTopicProgressDto> {
    return this.http.put<LearnerTopicProgressDto>(
      `${this.base}/enrollments/${enrollmentId}/topics/${topicId}`,
      body,
    );
  }
  getDrivingEvaluations(
    enrollmentId: string,
  ): Observable<DrivingEvaluationDto[]> {
    return this.http.get<DrivingEvaluationDto[]>(
      `${this.base}/enrollments/${enrollmentId}/driving-evaluations`,
    );
  }
  recordDrivingEvaluation(
    enrollmentId: string,
    body: unknown,
  ): Observable<DrivingEvaluationDto> {
    return this.http.post<DrivingEvaluationDto>(
      `${this.base}/enrollments/${enrollmentId}/driving-evaluations`,
      body,
    );
  }
}
