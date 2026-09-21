import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type {
  CertificationCandidate,
  CertificationResult,
  CertificationUnitStatus,
} from "../../core/mock-data/certification.mock";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";

@Component({
  selector: "app-results",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./results.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsComponent {
  readonly contextData = inject(ContextualTrainingDataService);
  readonly published = signal(false);
  readonly scheme = this.contextData.certificationScheme;
  readonly program = this.contextData.program;
  readonly exam = this.contextData.examSession;

  readonly candidates = computed<CertificationCandidate[]>(() =>
    this.contextData.certificationCandidates().map((item, index) => ({
      ...item,
      result: ([
        "obtained",
        "obtained",
        "obtained",
        "partial",
        "obtained",
        "obtained",
        "failed",
        "obtained",
        "absent",
      ][index % 9] ?? "pending") as CertificationResult,
    })),
  );

  readonly stats = computed(() => {
    const values = this.candidates();
    return {
      total: values.length,
      obtained: values.filter((item) => item.result === "obtained").length,
      partial: values.filter((item) => item.result === "partial").length,
      failed: values.filter((item) => item.result === "failed").length,
      absent: values.filter((item) => item.result === "absent").length,
    };
  });

  publish(): void {
    this.published.set(true);
  }

  resultClasses(result: CertificationResult): string {
    if (result === "obtained") return "bg-[#d8f8df] text-[#18a547]";
    if (result === "partial") return "bg-[#fff0c9] text-[#8b5e00]";
    if (result === "failed") return "bg-[#ffe1df] text-[#f22b2b]";
    if (result === "absent") return "bg-[#eef2f6] text-[#64748b]";
    return "bg-[#e5f2ff] text-[#2a64a2]";
  }

  unitStatus(candidate: CertificationCandidate, unitId: string): CertificationUnitStatus {
    const explicit = candidate.unitStatuses?.find((item) => item.unitId === unitId)?.status;
    if (explicit) return explicit;
    if (unitId === "ccp1") return candidate.ccp1;
    if (unitId === "ccp2") return candidate.ccp2;
    return candidate.ready ? "validated" : "pending";
  }

  statusIcon(status: CertificationUnitStatus): string {
    return status === "validated"
      ? "ph-check-circle text-[#18a547]"
      : status === "not_validated"
        ? "ph-x-circle text-[#f22b2b]"
        : "ph-clock text-[#8b5e00]";
  }
}
