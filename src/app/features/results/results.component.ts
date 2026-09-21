import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  CERTIFICATION_CANDIDATES,
  EXAM_SESSIONS,
  type CertificationCandidate,
  type CertificationResult,
} from "../../core/mock-data/certification.mock";

@Component({
  selector: "app-results",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./results.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsComponent {
  readonly exam = EXAM_SESSIONS[0];
  readonly published = signal(false);
  readonly candidates = signal<CertificationCandidate[]>(
    CERTIFICATION_CANDIDATES.map((item, index) => ({
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
      ][index] ?? "pending") as CertificationResult,
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

  ccpIcon(status: "validated" | "pending" | "not_validated"): string {
    return status === "validated"
      ? "ph-check-circle text-[#18a547]"
      : status === "not_validated"
        ? "ph-x-circle text-[#f22b2b]"
        : "ph-clock text-[#8b5e00]";
  }
}
