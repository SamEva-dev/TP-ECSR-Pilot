import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import {
  CERTIFICATION_CANDIDATES,
  EXAM_SESSIONS,
  JURY_MEMBERS,
} from "../../../core/mock-data/certification.mock";
import { ProgressBarComponent } from "../../../shared/ui/progress-bar.component";

@Component({
  selector: "app-exam-session-detail",
  imports: [RouterLink, TranslatePipe, ProgressBarComponent],
  templateUrl: "./exam-session-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamSessionDetailComponent {
  readonly exam = EXAM_SESSIONS[0];
  readonly candidates = CERTIFICATION_CANDIDATES;
  readonly juryMembers = JURY_MEMBERS;
  readonly ready = this.candidates.filter((item) => item.ready).length;
  readonly readiness = Math.round(
    (this.ready / Math.max(this.candidates.length, 1)) * 100,
  );

  initials(item: { firstName: string; lastName: string }): string {
    return `${item.firstName[0] ?? ""}${item.lastName[0] ?? ""}`.toUpperCase();
  }
}
