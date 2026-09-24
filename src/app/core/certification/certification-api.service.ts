import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CertificationCandidate, CertificationExamSession, CertificationScheme } from './certification.models';
import { environment } from "../../environments/environment";
@Injectable({providedIn:'root'})
export class CertificationApiService {
  private readonly http=inject(HttpClient); private readonly base=`${environment.apiBaseUrl}/api/v1/certification`;
  getSchemes(referentialVersionId?:string){const p=referentialVersionId?`?referentialVersionId=${encodeURIComponent(referentialVersionId)}`:'';return this.http.get<CertificationScheme[]>(`${this.base}/schemes${p}`);}
  getSessions(cohortId?:string){const p=cohortId?`?cohortId=${encodeURIComponent(cohortId)}`:'';return this.http.get<CertificationExamSession[]>(`${this.base}/sessions${p}`);}
  createSession(body:unknown){return this.http.post<CertificationExamSession>(`${this.base}/sessions`,body);}
  planSession(id:string){return this.http.post<CertificationExamSession>(`${this.base}/sessions/${id}/plan`,{});}
  registerCohortCandidates(id:string){return this.http.post<number>(`${this.base}/sessions/${id}/candidates/from-cohort`,{});}
  getCandidates(id:string){return this.http.get<CertificationCandidate[]>(`${this.base}/sessions/${id}/candidates`);}
  setEligibility(candidateId:string,eligible:boolean,blockers:string[]=[]){return this.http.put<CertificationCandidate>(`${this.base}/candidates/${candidateId}/eligibility`,{eligible,blockers});}
  addAssessment(candidateId:string,body:unknown){return this.http.post<CertificationCandidate>(`${this.base}/candidates/${candidateId}/assessments`,body);}
  setDecision(candidateId:string,decision:string,comment?:string){return this.http.put<CertificationCandidate>(`${this.base}/candidates/${candidateId}/decision`,{decision,comment});}
  publishResults(sessionId:string){return this.http.post<CertificationExamSession>(`${this.base}/sessions/${sessionId}/publish-results`,{});}
}
