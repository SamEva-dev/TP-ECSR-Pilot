import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { CertificationApiStoreService } from "../../core/api-data/certification-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type {
  CertificationCandidate,
  CertificationUnitStatus,
} from "../../core/models/certification.models";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";

@Component({
  selector: "app-certification",
  imports: [RouterLink, TranslatePipe, ProgressBarComponent],
  templateUrl: "./certification.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificationComponent {
  readonly sessionService = inject(SessionService);
  readonly store = inject(CertificationApiStoreService);
  readonly workspace = inject(WorkspaceContextService);

  readonly role = computed(() => this.sessionService.role());
  readonly scheme = this.store.scheme;
  readonly juryMembers = this.store.juryMembers;
  readonly program = this.workspace.program;
  readonly readyCount = computed(() =>
    this.store.candidates().filter((item) => item.ready).length,
  );
  readonly completionRate = computed(() => {
    const candidates = this.store.candidates();
    return Math.round((this.readyCount() / Math.max(candidates.length, 1)) * 100);
  });
  readonly currentCandidate = computed(() => {
    const candidates = this.store.candidates();
    const selfEnrollmentId = this.store.selfEnrollmentId();
    return candidates.find((item) => {
      const raw = this.store.rawCandidate(item.id);
      return raw?.enrollmentId === selfEnrollmentId;
    }) ?? candidates[0] ?? null;
  });

  get examSession() {
    return this.store.examSession();
  }

  get candidates() {
    return this.store.candidates();
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
    return `${item.firstName?.[0] ?? ""}${item.lastName?.[0] ?? ""}`.toUpperCase();
  }

  readinessClasses(ready: boolean): string {
    return ready ? "bg-[#d8f8df] text-[#18a547]" : "bg-[#fff0c9] text-[#8b5e00]";
  }

  unitStatus(candidate: CertificationCandidate, unitId: string): CertificationUnitStatus {
    return candidate.unitStatuses?.find((item) => item.unitId === unitId)?.status ?? "pending";
  }

  unitClasses(status: CertificationUnitStatus): string {
    return status === "validated"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "pending"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f22b2b]";
  }
}
