import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { ContextualTrainingDataService } from "../../../core/workspace/contextual-training-data.service";
import { ProgressBarComponent } from "../../../shared/ui/progress-bar.component";

@Component({
  selector: "app-exam-session-detail",
  imports: [RouterLink, TranslatePipe, ProgressBarComponent],
  templateUrl: "./exam-session-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamSessionDetailComponent {
  readonly contextData = inject(ContextualTrainingDataService);
  readonly exam = this.contextData.examSession;
  readonly candidates = this.contextData.certificationCandidates;
  readonly juryMembers = this.contextData.juryMembers;
  readonly scheme = this.contextData.certificationScheme;
  readonly program = this.contextData.program;
  readonly ready = computed(() => this.candidates().filter((item) => item.ready).length);
  readonly readiness = computed(() => Math.round((this.ready() / Math.max(this.candidates().length, 1)) * 100));

  initials(item: { firstName: string; lastName: string }): string {
    return `${item.firstName[0] ?? ""}${item.lastName[0] ?? ""}`.toUpperCase();
  }
}
