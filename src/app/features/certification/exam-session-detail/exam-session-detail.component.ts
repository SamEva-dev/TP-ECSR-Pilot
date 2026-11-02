import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  signal,
  inject,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { CertificationApiStoreService } from "../../../core/api-data/certification-api-store.service";
import { AccessPolicyService } from "../../../core/access/access-policy.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";
import { CertificationApiService } from "../../../core/certification/certification-api.service";
import { CertificationJuryAssignment } from "../../../core/certification/certification.models";
import { ProgressBarComponent } from "../../../shared/ui/progress-bar.component";

@Component({
  selector: "app-exam-session-detail",
  imports: [RouterLink, DatePipe, TranslatePipe, ProgressBarComponent],
  templateUrl: "./exam-session-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamSessionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly access = inject(AccessPolicyService);
  private readonly certificationApi = inject(CertificationApiService);
  readonly juryAssignments = signal<CertificationJuryAssignment[]>([]);
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

  initials(item: { firstName: string; lastName: string }): string {
    return `${item.firstName?.[0] ?? ""}${item.lastName?.[0] ?? ""}`.toUpperCase();
  }
}
