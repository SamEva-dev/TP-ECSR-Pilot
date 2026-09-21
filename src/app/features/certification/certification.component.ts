import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import type {
  CertificationCandidate,
  CertificationUnitStatus,
} from "../../core/mock-data/certification.mock";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";

@Component({
  selector: "app-certification",
  imports: [RouterLink, TranslatePipe, ProgressBarComponent],
  templateUrl: "./certification.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificationComponent {
  readonly sessionService = inject(SessionService);
  readonly contextData = inject(ContextualTrainingDataService);

  readonly role = computed(() => this.sessionService.role());
  readonly scheme = this.contextData.certificationScheme;
  readonly juryMembers = this.contextData.juryMembers;
  readonly program = this.contextData.program;
  readonly readyCount = computed(() =>
    this.contextData.certificationCandidates().filter((item) => item.ready).length,
  );
  readonly completionRate = computed(() => {
    const candidates = this.contextData.certificationCandidates();
    return Math.round((this.readyCount() / Math.max(candidates.length, 1)) * 100);
  });
  readonly currentCandidate = computed(() => {
    const candidates = this.contextData.certificationCandidates();
    const studentId = this.sessionService.session()?.studentId;
    return candidates.find((item) => item.studentId === studentId) ?? candidates[0];
  });

  get examSession() {
    return this.contextData.examSession();
  }

  get candidates() {
    return this.contextData.certificationCandidates();
  }

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
    return ready ? "bg-[#d8f8df] text-[#18a547]" : "bg-[#fff0c9] text-[#8b5e00]";
  }

  unitStatus(candidate: CertificationCandidate, unitId: string): CertificationUnitStatus {
    const explicit = candidate.unitStatuses?.find((item) => item.unitId === unitId)?.status;
    if (explicit) return explicit;
    if (unitId === "ccp1") return candidate.ccp1;
    if (unitId === "ccp2") return candidate.ccp2;
    return candidate.ready ? "validated" : "pending";
  }

  unitClasses(status: CertificationUnitStatus): string {
    return status === "validated"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "pending"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f22b2b]";
  }
}
