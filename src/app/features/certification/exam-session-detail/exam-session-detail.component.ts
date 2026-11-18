import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  signal,
  inject,
  untracked,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { firstValueFrom, map } from "rxjs";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { CertificationApiStoreService } from "../../../core/api-data/certification-api-store.service";
import { AccessPolicyService } from "../../../core/access/access-policy.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";
import { CertificationApiService } from "../../../core/certification/certification-api.service";
import { CertificationCandidate as ApiCandidate, CertificationJuryAssignment } from "../../../core/certification/certification.models";
import { ProgressBarComponent } from "../../../shared/ui/progress-bar.component";
import { apiErrorCode } from "../../../core/errors/api-error-code";

@Component({
  selector: "app-exam-session-detail",
  imports: [RouterLink, FormsModule, DatePipe, TranslatePipe, ProgressBarComponent],
  templateUrl: "./exam-session-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamSessionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly access = inject(AccessPolicyService);
  private readonly certificationApi = inject(CertificationApiService);
  readonly juryAssignments = signal<CertificationJuryAssignment[]>([]);
  readonly actionBusy = signal(false);
  readonly actionError = signal("");
  readonly actionInfo = signal("");
  readonly apiCandidates = signal<ApiCandidate[]>([]);
  private apiCandidateLoadEpoch = 0;
  private juryRequestEpoch = 0;
  juryUserId = "";
  juryRole = "Examiner";
  decisionComment = "";
  readonly canManageSession = computed(() => this.access.can("certification.manage"));
  readonly canManageResults = computed(() => this.access.can("results.view") && this.canManageSession());
  readonly canPlan = computed(() => this.canManageSession() && this.exam().id === this.routeSessionId && this.exam().status === "preparation");

  readonly juryLoading = signal(false);
  readonly juryError = signal(false);
  readonly canManageJury = computed(() => this.access.can("certification.manage"));
  // Angular reuses this component on history navigation between detail URLs.
  // A snapshot freezes the first UUID and can expose data from another session.
  private readonly routeSessionIdSignal = toSignal(
    this.route.paramMap.pipe(map(params => params.get("id") ?? "")),
    { initialValue: this.route.snapshot.paramMap.get("id") ?? "" },
  );
  get routeSessionId(): string { return this.routeSessionIdSignal(); }
  readonly store = inject(CertificationApiStoreService);
  readonly workspace = inject(WorkspaceContextService);
  readonly exam = this.store.examSession;
  readonly candidates = this.store.candidates;
  readonly scheme = this.store.scheme;
  readonly program = this.workspace.program;
  readonly ready = computed(
    () => this.candidates().filter((item) => item.ready).length,
  );
  readonly readiness = computed(() =>
    Math.round((this.ready() / Math.max(this.candidates().length, 1)) * 100),
  );

  readonly canStartSession = computed(() =>
    this.access.can("certification.manage") &&
    this.exam().id === this.routeSessionId &&
    this.exam().status === "ready" &&
    !this.store.loading(),
  );

  constructor() {
    // React to every URL UUID change, including Back/Forward on a reused component.
    // Reset local state and invalidate in-flight responses synchronously, before
    // an old request can paint data for the previous session.
    effect(() => {
      const sessionId = this.routeSessionId;
      untracked(() => {
        ++this.juryRequestEpoch;
        ++this.apiCandidateLoadEpoch;
        this.juryAssignments.set([]);
        this.apiCandidates.set([]);
        this.juryLoading.set(false);
        this.juryError.set(false);
        this.actionError.set("");
        this.actionInfo.set("");
        // selectSession also invalidates the store candidate request sequence.
        // An unknown UUID must not fall back to a valid session.
        void this.store.selectSession(sessionId);
      });
    });
    // Load only after the real session is authorized in the loaded context.
    effect(() => {
      const ready = !this.store.loading() &&
        this.store.hasSession(this.routeSessionId) && this.exam().id === this.routeSessionId;
      const authorized = this.canManageJury();
      if (ready && authorized) this.loadJuryAssignments();
      else {
        ++this.juryRequestEpoch;
        this.juryAssignments.set([]);
        this.juryLoading.set(false);
      }
    });
    // The route is constructed before the asynchronous workspace/session GET completes.
    // Load persisted candidate management data once the requested session is hydrated,
    // and again after a context reload rather than relying on the constructor timing.
    effect(() => {
      const loaded = !this.store.loading();
      const selected = this.exam().id === this.routeSessionId;
      const authorized = this.canManageSession();
      if (loaded && selected && authorized && this.store.hasSession(this.routeSessionId)) {
        void this.loadApiCandidates();
      } else {
        // Prevent a previous session's management list from surviving navigation.
        ++this.apiCandidateLoadEpoch;
        this.apiCandidates.set([]);
      }
    });
    // Route activation may precede asynchronous loading of the cohort sessions.
    effect(() => {
      if (
        !this.routeSessionId || this.store.loading() ||
        !this.store.hasSession(this.routeSessionId) ||
        this.exam().id === this.routeSessionId
      ) return;
      const id = this.routeSessionId;
      untracked(() => void this.store.selectSession(id));
    });
  }

  loadJuryAssignments(): void {
    const sessionId = this.routeSessionId;
    if (!sessionId || !this.canManageJury() ||
        !this.store.hasSession(sessionId) || this.exam().id !== sessionId) return;
    const requestEpoch = ++this.juryRequestEpoch;
    const cohortId = this.workspace.cohort()?.apiId;
    this.juryAssignments.set([]);
    this.juryLoading.set(true);
    this.juryError.set(false);
    this.certificationApi.getJuryAssignments(sessionId).subscribe({
      next: assignments => {
        if (requestEpoch !== this.juryRequestEpoch ||
            sessionId !== this.routeSessionId || this.exam().id !== sessionId ||
            cohortId !== this.workspace.cohort()?.apiId ||
            !this.store.hasSession(sessionId)) return;
        this.juryAssignments.set(Array.isArray(assignments) ? assignments : []);
        this.juryLoading.set(false);
      },
      error: () => {
        if (requestEpoch !== this.juryRequestEpoch ||
            sessionId !== this.routeSessionId ||
            cohortId !== this.workspace.cohort()?.apiId) return;
        this.juryError.set(true);
        this.juryLoading.set(false);
      },
    });
  }

  async startSession(): Promise<void> {
    if (!this.canStartSession() || this.store.saving()) return;
    await this.store.startExamSession(this.routeSessionId);
  }

  async loadApiCandidates(): Promise<void> {
    const sessionId = this.routeSessionId;
    if (!sessionId || !this.canManageSession() ||
        !this.store.hasSession(sessionId) || this.exam().id !== sessionId) return;
    const epoch = ++this.apiCandidateLoadEpoch;
    const cohortId = this.workspace.cohort()?.apiId;
    try {
      const result = await firstValueFrom(this.certificationApi.getCandidates(sessionId));
      if (epoch === this.apiCandidateLoadEpoch && sessionId === this.routeSessionId &&
          this.exam().id === sessionId && cohortId &&
          cohortId === this.workspace.cohort()?.apiId &&
          this.store.hasSession(sessionId)) {
        this.apiCandidates.set(result.filter(x => x.examSessionId === sessionId));
      }
    } catch {
      if (epoch === this.apiCandidateLoadEpoch && sessionId === this.routeSessionId)
        this.actionError.set("load");
    }
  }

  private async runAction(action: () => Promise<unknown>, infoKey: string): Promise<void> {
    const sessionId = this.routeSessionId;
    if (this.actionBusy() || !this.canManageSession() ||
        this.exam().id !== sessionId || !this.store.hasSession(sessionId)) return;
    const cohortId = this.workspace.cohort()?.apiId;
    this.actionBusy.set(true);
    this.actionError.set("");
    this.actionInfo.set("");
    try {
      await action();
      if (cohortId !== this.workspace.cohort()?.apiId || sessionId !== this.routeSessionId) return;
      await this.store.reload(false);
      if (sessionId !== this.routeSessionId) return;
      await this.store.selectSession(sessionId);
      if (sessionId !== this.routeSessionId) return;
      await this.loadApiCandidates();
      if (sessionId !== this.routeSessionId) return;
      this.loadJuryAssignments();
      this.actionInfo.set(infoKey);
    } catch (error: unknown) {
      if (sessionId !== this.routeSessionId) return;
      const response = error as { status?: number } | null;
      const code = apiErrorCode(error);
      const supported = new Set([
        "CERTIFICATION_JURY_REQUIRED_TO_START",
        "CERTIFICATION_CANDIDATES_REQUIRED_TO_START",
        "CERTIFICATION_CANDIDATES_NOT_READY_TO_START",
        "CERTIFICATION_ASSESSMENTS_INCOMPLETE",
        "CERTIFICATION_CANDIDATES_NOT_COMPLETED",
      ]);
      this.actionError.set(supported.has(code) ? code : response?.status === 403 ? "forbidden" : response?.status === 409 ? "conflict" : "request");
    } finally { this.actionBusy.set(false); }
  }

  async plan(): Promise<void> {
    if (!this.canPlan()) return;
    await this.runAction(() => firstValueFrom(this.certificationApi.planSession(this.routeSessionId)), "planned");
  }
  async registerCandidates(): Promise<void> {
    if (!(["preparation", "ready"].includes(this.exam().status))) return;
    await this.runAction(() => firstValueFrom(this.certificationApi.registerCohortCandidates(this.routeSessionId)), "registered");
  }
  async assignJury(): Promise<void> {
    const id = this.juryUserId.trim();
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) {
      this.actionError.set("validation"); return;
    }
    await this.runAction(() => firstValueFrom(this.certificationApi.assignJury(this.routeSessionId, {
      authGateUserId: id, displayName: "", role: this.juryRole,
    })), "juryAssigned");
    if (!this.actionError()) this.juryUserId = "";
  }
  async eligibility(candidate: ApiCandidate, eligible: boolean): Promise<void> {
    if (!this.apiCandidates().some(x => x.id === candidate.id)) return;
    await this.runAction(() => firstValueFrom(this.certificationApi.setEligibility(candidate.id, eligible)), "eligibilitySaved");
  }
  async decision(candidate: ApiCandidate, decision: string): Promise<void> {
    if (!this.canManageResults() || !this.apiCandidates().some(x => x.id === candidate.id)) return;
    await this.runAction(() => firstValueFrom(this.certificationApi.setDecision(candidate.id, decision, this.decisionComment.trim())), "decisionSaved");
  }
  async publishResults(): Promise<void> {
    if (!this.canManageResults() || this.exam().status === "published") return;
    await this.runAction(() => firstValueFrom(this.certificationApi.publishResults(this.routeSessionId)), "published");
  }

  /** Never default a persisted decision to Obtained on a reload. */
  persistedDecision(value: string | null | undefined): string {
    const normalized = (value ?? "").trim().toLowerCase();
    switch (normalized) {
      case "obtained": return "Obtained";
      case "failed": return "Failed";
      case "partial": return "Partial";
      case "absent": return "Absent";
      default: return "";
    }
  }

  initials(item: { firstName: string; lastName: string }): string {
    return `${item.firstName?.[0] ?? ""}${item.lastName?.[0] ?? ""}`.toUpperCase();
  }
}
