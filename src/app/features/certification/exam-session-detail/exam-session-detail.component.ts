import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  signal,
  inject,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { CertificationApiStoreService } from "../../../core/api-data/certification-api-store.service";
import { AccessPolicyService } from "../../../core/access/access-policy.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";
import { CertificationApiService } from "../../../core/certification/certification-api.service";
import { CertificationCandidate as ApiCandidate, CertificationJuryAssignment } from "../../../core/certification/certification.models";
import { ProgressBarComponent } from "../../../shared/ui/progress-bar.component";

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
  juryUserId = "";
  juryRole = "Examiner";
  decisionComment = "";
  readonly canManageSession = computed(() => this.access.can("certification.manage"));
  readonly canManageResults = computed(() => this.access.can("results.view") && this.canManageSession());
  readonly canPlan = computed(() => this.canManageSession() && this.exam().id === this.routeSessionId && this.exam().status === "preparation");

  readonly juryLoading = signal(false);
  readonly juryError = signal(false);
  readonly canManageJury = computed(() => this.access.can("certification.manage"));
  readonly routeSessionId = this.route.snapshot.paramMap.get("id") ?? "";
  readonly store = inject(CertificationApiStoreService);
  readonly workspace = inject(WorkspaceContextService);
  readonly exam = this.store.examSession;
  readonly candidates = this.store.candidates;
  readonly juryMembers = this.store.juryMembers;
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
    if (this.routeSessionId && this.canManageJury()) {
      this.loadJuryAssignments();
      void this.loadApiCandidates();
    }
    // Route activation may precede asynchronous loading of the cohort sessions.
    effect(() => {
      if (
        !this.routeSessionId || this.store.loading() ||
        !this.store.hasSession(this.routeSessionId) ||
        this.exam().id === this.routeSessionId
      ) return;
      void this.store.selectSession(this.routeSessionId);
    });
  }

  loadJuryAssignments(): void {
    if (!this.routeSessionId || !this.canManageJury()) return;
    this.juryLoading.set(true);
    this.juryError.set(false);
    this.certificationApi.getJuryAssignments(this.routeSessionId).subscribe({
      next: assignments => { this.juryAssignments.set(assignments); this.juryLoading.set(false); },
      error: () => { this.juryError.set(true); this.juryLoading.set(false); },
    });
  }

  async startSession(): Promise<void> {
    if (!this.canStartSession() || this.store.saving()) return;
    await this.store.startExamSession(this.routeSessionId);
  }

  async loadApiCandidates(): Promise<void> {
    if (!this.routeSessionId || !this.canManageSession()) return;
    try {
      const result = await firstValueFrom(this.certificationApi.getCandidates(this.routeSessionId));
      if (this.workspace.cohort()?.apiId && this.store.hasSession(this.routeSessionId)) {
        this.apiCandidates.set(result.filter(x => x.examSessionId === this.routeSessionId));
      }
    } catch { this.actionError.set("load"); }
  }

  private async runAction(action: () => Promise<unknown>, infoKey: string): Promise<void> {
    if (this.actionBusy() || !this.canManageSession() || !this.store.hasSession(this.routeSessionId)) return;
    const cohortId = this.workspace.cohort()?.apiId;
    this.actionBusy.set(true);
    this.actionError.set("");
    this.actionInfo.set("");
    try {
      await action();
      if (cohortId !== this.workspace.cohort()?.apiId) return;
      await this.store.reload(false);
      await this.store.selectSession(this.routeSessionId);
      await this.loadApiCandidates();
      this.loadJuryAssignments();
      this.actionInfo.set(infoKey);
    } catch (error: unknown) {
      this.actionError.set(String((error as {error?: {code?: string}})?.error?.code || "request"));
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

  initials(item: { firstName: string; lastName: string }): string {
    return `${item.firstName?.[0] ?? ""}${item.lastName?.[0] ?? ""}`.toUpperCase();
  }
}
