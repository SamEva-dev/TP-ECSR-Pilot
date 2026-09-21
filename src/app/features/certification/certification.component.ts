import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import {
  CERTIFICATION_CANDIDATES,
  EXAM_SESSIONS,
  JURY_MEMBERS,
} from "../../core/mock-data/certification.mock";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";

@Component({
  selector: "app-certification",
  imports: [RouterLink, TranslatePipe, ProgressBarComponent],
  templateUrl: "./certification.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificationComponent {
  readonly sessionService = inject(SessionService);
  readonly examSession = EXAM_SESSIONS[0];
  readonly juryMembers = JURY_MEMBERS;
  readonly candidates = CERTIFICATION_CANDIDATES;

  readonly role = computed(() => this.sessionService.role());
  readonly readyCount = computed(
    () => this.candidates.filter((item) => item.ready).length,
  );
  readonly completionRate = computed(() =>
    Math.round((this.readyCount() / Math.max(this.candidates.length, 1)) * 100),
  );
  readonly currentCandidate = computed(() => {
    const studentId = this.sessionService.session()?.studentId;
    return (
      this.candidates.find((item) => item.studentId === studentId) ??
      this.candidates[0]
    );
  });

  isManagement(): boolean {
    return this.role() === "direction" || this.role() === "secretariat";
  }

  isTrainer(): boolean {
    return this.role() === "formateur";
  }

  isStudent(): boolean {
    return this.role() === "stagiaire";
  }

  initials(item: { firstName: string; lastName: string }): string {
    return `${item.firstName[0] ?? ""}${item.lastName[0] ?? ""}`.toUpperCase();
  }

  readinessClasses(ready: boolean): string {
    return ready
      ? "bg-[#d8f8df] text-[#18a547]"
      : "bg-[#fff0c9] text-[#8b5e00]";
  }

  ccpClasses(status: "validated" | "pending" | "not_validated"): string {
    return status === "validated"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "pending"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f22b2b]";
  }
}
