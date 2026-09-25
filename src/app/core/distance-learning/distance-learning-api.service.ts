import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import type {
  AsyncLearningModuleApi,
  DistanceLearningSessionApi,
} from "./distance-learning.models";

@Injectable({ providedIn: "root" })
export class DistanceLearningApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/distance-learning`;

  sessions(cohortId?: string): Promise<DistanceLearningSessionApi[]> {
    let params = new HttpParams();
    if (cohortId) params = params.set("cohortId", cohortId);
    return firstValueFrom(
      this.http.get<DistanceLearningSessionApi[]>(
        `${this.base}/live-sessions`,
        { params },
      ),
    );
  }

  createSession(payload: unknown): Promise<DistanceLearningSessionApi> {
    return firstValueFrom(
      this.http.post<DistanceLearningSessionApi>(
        `${this.base}/live-sessions`,
        payload,
      ),
    );
  }

  updateSessionStatus(
    id: string,
    status: string,
  ): Promise<DistanceLearningSessionApi> {
    return firstValueFrom(
      this.http.put<DistanceLearningSessionApi>(
        `${this.base}/live-sessions/${id}/status`,
        { status },
      ),
    );
  }

  updateAttendance(
    sessionId: string,
    participantId: string,
    payload: unknown,
  ): Promise<DistanceLearningSessionApi> {
    return firstValueFrom(
      this.http.put<DistanceLearningSessionApi>(
        `${this.base}/live-sessions/${sessionId}/participants/${participantId}/attendance`,
        payload,
      ),
    );
  }

  modules(cohortId?: string): Promise<AsyncLearningModuleApi[]> {
    let params = new HttpParams();
    if (cohortId) params = params.set("cohortId", cohortId);
    return firstValueFrom(
      this.http.get<AsyncLearningModuleApi[]>(`${this.base}/async-modules`, {
        params,
      }),
    );
  }

  createModule(payload: unknown): Promise<AsyncLearningModuleApi> {
    return firstValueFrom(
      this.http.post<AsyncLearningModuleApi>(
        `${this.base}/async-modules`,
        payload,
      ),
    );
  }

  updateModuleProgress(
    id: string,
    payload: unknown,
  ): Promise<AsyncLearningModuleApi> {
    return firstValueFrom(
      this.http.put<AsyncLearningModuleApi>(
        `${this.base}/async-modules/${id}/progress`,
        payload,
      ),
    );
  }
}
