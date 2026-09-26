import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { CertificationApiStoreService } from "../../../core/api-data/certification-api-store.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";
import { ProgressBarComponent } from "../../../shared/ui/progress-bar.component";

@Component({
  selector: "app-exam-session-detail",
  imports: [RouterLink, TranslatePipe, ProgressBarComponent],
  templateUrl: "./exam-session-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamSessionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(CertificationApiStoreService);
  readonly workspace = inject(WorkspaceContextService);
  readonly exam = this.store.examSession;
  readonly candidates = this.store.candidates;
  readonly juryMembers = this.store.juryMembers;
  readonly scheme = this.store.scheme;
  readonly program = this.workspace.program;
  readonly ready = computed(() => this.candidates().filter((item) => item.ready).length);
  readonly readiness = computed(() => Math.round((this.ready() / Math.max(this.candidates().length, 1)) * 100));

  constructor() {
    const sessionId = this.route.snapshot.paramMap.get("id") ?? "";
    if (sessionId) void this.store.selectSession(sessionId);
  }

  initials(item: { firstName: string; lastName: string }): string {
    return `${item.firstName?.[0] ?? ""}${item.lastName?.[0] ?? ""}`.toUpperCase();
  }
}
