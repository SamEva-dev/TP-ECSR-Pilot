import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  CertificationCandidate,
  CertificationExamSession,
  CertificationJuryAssignment,
  CertificationScheme,
} from "./certification.models";
import { environment } from "../../environments/environment";
@Injectable({ providedIn: "root" })
export class CertificationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/certification`;
  getSchemes(referentialVersionId?: string) {
    const p = referentialVersionId
      ? `?referentialVersionId=${encodeURIComponent(referentialVersionId)}`
      : "";
    return this.http.get<CertificationScheme[]>(`${this.base}/schemes${p}`);
  }
  createScheme(body: { referentialVersionId: string; code: string; name: string }) {
    return this.http.post<CertificationScheme>(`${this.base}/schemes`, body);
  }
  addSchemeUnit(id: string, body: { code: string; title: string; sortOrder: number }) {
    return this.http.post<CertificationScheme>(`${this.base}/schemes/${encodeURIComponent(id)}/units`, body);
  }
  addSchemeStep(id: string, body: { unitId: string | null; code: string; title: string; kind: string; durationMinutes: number; sortOrder: number }) {
    return this.http.post<CertificationScheme>(`${this.base}/schemes/${encodeURIComponent(id)}/steps`, body);
  }
  publishScheme(id: string, body: { effectiveFrom: string; effectiveTo: string | null }) {
    return this.http.post<CertificationScheme>(`${this.base}/schemes/${encodeURIComponent(id)}/publish`, body);
  }
  getSessions(cohortId?: string) {
    const p = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : "";
    return this.http.get<CertificationExamSession[]>(
      `${this.base}/sessions${p}`,
    );
  }
  getMyJurySessions() {
    return this.http.get<CertificationExamSession[]>(`${this.base}/jury/sessions`);
  }
  getMyJurySchemes() {
    return this.http.get<CertificationScheme[]>(`${this.base}/jury/schemes`);
  }
  getMyJuryCandidates(id: string) {
    return this.http.get<CertificationCandidate[]>(`${this.base}/jury/sessions/${encodeURIComponent(id)}/candidates`);
  }
  createSession(body: unknown) {
    return this.http.post<CertificationExamSession>(
      `${this.base}/sessions`,
      body,
    );
  }
  planSession(id: string) {
    return this.http.post<CertificationExamSession>(
      `${this.base}/sessions/${id}/plan`,
      {},
    );
  }
  startSession(id: string) {
    return this.http.post<CertificationExamSession>(
      `${this.base}/sessions/${encodeURIComponent(id)}/start`,
      {},
    );
  }
  registerCohortCandidates(id: string) {
    return this.http.post<number>(
      `${this.base}/sessions/${id}/candidates/from-cohort`,
      {},
    );
  }
  assignJury(id: string, body: {authGateUserId: string; displayName: string; role: string}) {
    return this.http.post<CertificationJuryAssignment>(
      `${this.base}/sessions/${encodeURIComponent(id)}/jury`, body);
  }
  getJuryAssignments(id: string) {
    return this.http.get<CertificationJuryAssignment[]>(
      `${this.base}/sessions/${encodeURIComponent(id)}/jury`,
    );
  }
  getCandidates(id: string) {
    return this.http.get<CertificationCandidate[]>(
      `${this.base}/sessions/${id}/candidates`,
    );
  }
  setEligibility(
    candidateId: string,
    eligible: boolean,
    blockers: string[] = [],
  ) {
    return this.http.put<CertificationCandidate>(
      `${this.base}/candidates/${candidateId}/eligibility`,
      { eligible, blockers },
    );
  }
  addAssessment(candidateId: string, body: unknown) {
    return this.http.post<CertificationCandidate>(
      `${this.base}/candidates/${candidateId}/assessments`,
      body,
    );
  }
  saveAssessmentBatch(
    candidateId: string,
    body: { assessments: { stepDefinitionId: string; juryDisplayName: string; outcome: string; score: number | null; comment: string | null }[]; finalize: boolean },
  ) {
    return this.http.put<CertificationCandidate>(
      `${this.base}/candidates/${encodeURIComponent(candidateId)}/assessments/batch`,
      body,
    );
  }
  setDecision(candidateId: string, decision: string, comment?: string) {
    return this.http.put<CertificationCandidate>(
      `${this.base}/candidates/${candidateId}/decision`,
      { decision, comment },
    );
  }
  publishResults(sessionId: string) {
    return this.http.post<CertificationExamSession>(
      `${this.base}/sessions/${sessionId}/publish-results`,
      {},
    );
  }
}
