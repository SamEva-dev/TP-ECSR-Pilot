import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

/** S14: authenticated draft API. No public signature link is emitted by this client. */
export type SignatureSourceType = 'pedagogical-observation' | 'attendance' | 'daily-observation-summary';
export type SignatureStatus =
  | 'draft' | 'pending' | 'viewed' | 'signed' | 'declined' | 'expired' | 'cancelled';

export interface SignatureEnvelope {
  id: string;
  organizationId: string;
  cohortId: string;
  enrollmentId: string;
  sourceType: SignatureSourceType;
  sourceId: string;
  sourceVersion: number;
  status: SignatureStatus;
  contentSha256: string;
  createdAtUtc: string;
  requestedAtUtc: string | null;
  signedAtUtc: string | null;
  archivedAtUtc?: string | null;
  version: number;
}

export interface CreateSignatureDraftRequest {
  sourceType: SignatureSourceType;
  sourceId: string;
  enrollmentId: string;
}

@Injectable({ providedIn: 'root' })
export class SignatureApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/signatures`;

  center(params: { page: number; pageSize: number; status?: string; cohortId?: string; team?: boolean }) {
    const query = new URLSearchParams({page: String(params.page), pageSize: String(params.pageSize)});
    if (params.status) query.set('status', params.status);
    if (params.cohortId) query.set('cohortId', params.cohortId);
    if (params.team) query.set('team', 'true');
    return this.http.get<SignatureCenterPage>(`${this.base}/center?${query}`);
  }

  /** Authenticated, server-authorized binary download. Storage URLs are never exposed. */
  archivedDocument(id: string, manifest = false) {
    return this.http.get(`${this.base}/${encodeURIComponent(id)}/${manifest ? 'evidence' : 'archive'}`,
      { responseType: 'blob' as const });
  }

  remind(id: string) {
    return this.http.post<SignatureEnvelope>(`${this.base}/${encodeURIComponent(id)}/remind`, {});
  }

  requestBatch(envelopeIds: string[]) {
    return this.http.post<{ envelopes: SignatureEnvelope[] }>(`${this.base}/batch/request`, { envelopeIds });
  }

  createDailySummary(body: { enrollmentId: string; date: string; evaluationIds: string[] }) {
    return this.http.post<SignatureEnvelope>(`${this.base}/observations/daily-summary`, body);
  }

  createDraft(request: CreateSignatureDraftRequest) {
    return this.http.post<SignatureEnvelope>(`${this.base}/drafts`, request);
  }

  getDraft(id: string) {
    return this.http.get<SignatureEnvelope>(`${this.base}/drafts/${encodeURIComponent(id)}`);
  }

  getMyDrafts(cohortId?: string) {
    const suffix = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
    return this.http.get<SignatureEnvelope[]>(`${this.base}/drafts${suffix}`);
  }
  requestObservation(id: string) {
    return this.http.post<SignatureEnvelope>(`${this.base}/observations/${encodeURIComponent(id)}/request`, {});
  }

  markObservationViewed(id: string) {
    return this.http.post<SignatureEnvelope>(`${this.base}/observations/${encodeURIComponent(id)}/view`, {});
  }

  respondObservation(id: string, body: ObservationResponse) {
    return this.http.post<SignatureEnvelope>(`${this.base}/observations/${encodeURIComponent(id)}/respond`, body);
  }

  observationContent(id: string) {
    return this.http.get<SignatureContent>(`${this.base}/observations/${encodeURIComponent(id)}/content`);
  }

  myPendingObservations() {
    return this.http.get<SignatureEnvelope[]>(`${this.base}/observations/my-pending`);
  }

  observationHistory(enrollmentId: string) {
    return this.http.get<SignatureEnvelope[]>(`${this.base}/observations/enrollment/${encodeURIComponent(enrollmentId)}`);
  }
  requestAttendance(id: string) {
    return this.http.post<SignatureEnvelope>(`${this.base}/attendance/${encodeURIComponent(id)}/request`, {});
  }

  markAttendanceViewed(id: string) {
    return this.http.post<SignatureEnvelope>(`${this.base}/attendance/${encodeURIComponent(id)}/view`, {});
  }

  respondAttendance(id: string, body: ObservationResponse) {
    return this.http.post<SignatureEnvelope>(`${this.base}/attendance/${encodeURIComponent(id)}/respond`, body);
  }

  attendanceContent(id: string) {
    return this.http.get<SignatureContent>(`${this.base}/attendance/${encodeURIComponent(id)}/content`);
  }

  myAttendance() {
    return this.http.get<SignatureEnvelope[]>(`${this.base}/attendance/my`);
  }

  attendanceBySession(sessionId: string) {
    return this.http.get<SignatureEnvelope[]>(`${this.base}/attendance/session/${encodeURIComponent(sessionId)}`);
  }

  myDailyObservations(date: string) {
    return this.http.get<DailyObservationSignatureCandidate[]>(`${this.base}/observations/daily?date=${encodeURIComponent(date)}`);
  }
}

export interface SignatureContent {
  envelope: SignatureEnvelope;
  snapshotJson: string;
  expiresAtUtc: string | null;
  viewedAtUtc: string | null;
  responseComment: string | null;
  canRespond: boolean;
}

// A link does not authorize access; the matching AuthGate user is checked by the API.
export interface ObservationResponse { acknowledge: boolean; comment?: string | null }

export interface DailyObservationSignatureCandidate {
  sourceId: string;
  enrollmentId: string;
  learnerName: string;
  subject: string;
  evaluatedAtUtc: string;
  signatureStatus: string;
}

export interface SignatureCenterItem {
  envelope: SignatureEnvelope;
  expiresAtUtc: string | null;
  lastReminderAtUtc: string | null;
  reminderCount: number;
  responseComment: string | null;
  learnerName: string;
}
export interface SignatureCenterPage {
  items: SignatureCenterItem[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<string, number>;
}
