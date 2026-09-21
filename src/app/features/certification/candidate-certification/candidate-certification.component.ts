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
import {
  certificationCandidateById,
  EXAM_SESSIONS,
} from "../../../core/mock-data/certification.mock";
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
  readonly exam = EXAM_SESSIONS[0];
  readonly candidate =
    certificationCandidateById(this.route.snapshot.paramMap.get("id") ?? "") ??
    certificationCandidateById("c1")!;
  readonly isJury = computed(() => this.sessionService.role() === "jury");
  readonly readiness = computed(() =>
    Math.round(
      (this.candidate.completedHours /
        Math.max(this.candidate.plannedHours, 1)) *
        100,
    ),
  );
  readonly evaluationSaved = signal(false);
  readonly evaluationLocked = signal(false);
  juryNotes = "";

  readonly juryCriteria = [
    {
      id: "pedagogy",
      labelKey: "certification.candidate.juryCriteria.pedagogy",
    },
    { id: "safety", labelKey: "certification.candidate.juryCriteria.safety" },
    {
      id: "analysis",
      labelKey: "certification.candidate.juryCriteria.analysis",
    },
    {
      id: "communication",
      labelKey: "certification.candidate.juryCriteria.communication",
    },
  ];
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

  statusClasses(status: string): string {
    return status === "done" || status === "validated"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "not_validated"
        ? "bg-[#ffe1df] text-[#f22b2b]"
        : "bg-[#fff0c9] text-[#8b5e00]";
  }
}
