import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { SessionService } from "../../../core/session/session.service";
import type {
  CertificationCandidate,
  CertificationUnitStatus,
} from "../../../core/models/certification.models";
import { ContextualTrainingDataService } from "../../../core/workspace/contextual-training-data.service";
import { ProgressBarComponent } from "../../../shared/ui/progress-bar.component";

type JuryLevel = "satisfactory" | "partial" | "insufficient";

@Component({
  selector: "app-candidate-certification",
  imports: [RouterLink, FormsModule, TranslatePipe, ProgressBarComponent],
  templateUrl: "./candidate-certification.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateCertificationComponent {
  private readonly route = inject(ActivatedRoute);
  readonly sessionService = inject(SessionService);
  readonly contextData = inject(ContextualTrainingDataService);
  readonly scheme = this.contextData.certificationScheme;
  readonly program = this.contextData.program;
  readonly exam = this.contextData.examSession;

  private readonly requestedCandidateId = this.route.snapshot.paramMap.get("id") ?? "";
  private readonly ownStudentId = this.sessionService.session()?.studentId ?? "";

  readonly candidate = computed<CertificationCandidate>(() => {
    const candidates = this.contextData.certificationCandidates();
    const wanted = this.sessionService.role() === "stagiaire" ? this.ownStudentId : this.requestedCandidateId;
    return candidates.find((item) => item.id === wanted || item.studentId === wanted) ?? candidates[0]!;
  });

  readonly isJury = computed(() => this.sessionService.role() === "jury");
  readonly readiness = computed(() => {
    const candidate = this.candidate();
    return Math.round((candidate.completedHours / Math.max(candidate.plannedHours, 1)) * 100);
  });
  readonly evaluationSaved = signal(false);
  readonly evaluationLocked = signal(false);
  juryNotes = "";
  readonly juryLevels = signal<Record<string, JuryLevel>>({});

  setLevel(id: string, level: JuryLevel): void {
    if (this.evaluationLocked()) return;
    this.juryLevels.update((value) => ({ ...value, [id]: level }));
    this.evaluationSaved.set(false);
  }

  selected(id: string, level: JuryLevel): boolean {
    return this.juryLevels()[id] === level;
  }

  saveDraft(): void {
    this.evaluationSaved.set(true);
  }

  validateEvaluation(): void {
    this.evaluationSaved.set(true);
    this.evaluationLocked.set(true);
  }

  unitStatus(unitId: string): CertificationUnitStatus {
    const candidate = this.candidate();
    const explicit = candidate.unitStatuses?.find((item) => item.unitId === unitId)?.status;
    if (explicit) return explicit;
    if (unitId === "ccp1") return candidate.ccp1;
    if (unitId === "ccp2") return candidate.ccp2;
    return candidate.ready ? "validated" : "pending";
  }

  statusClasses(status: string): string {
    return status === "done" || status === "validated"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "not_validated"
        ? "bg-[#ffe1df] text-[#f22b2b]"
        : "bg-[#fff0c9] text-[#8b5e00]";
  }
}
