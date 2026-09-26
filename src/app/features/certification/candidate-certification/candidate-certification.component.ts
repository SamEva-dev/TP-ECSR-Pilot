import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { CertificationApiStoreService } from "../../../core/api-data/certification-api-store.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type {
  CertificationCandidate,
  CertificationUnitStatus,
} from "../../../core/models/certification.models";
import { SessionService } from "../../../core/session/session.service";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";
import { ProgressBarComponent } from "../../../shared/ui/progress-bar.component";

type JuryLevel = "satisfactory" | "partial" | "insufficient";

const EMPTY_CANDIDATE: CertificationCandidate = {
  id: "",
  studentId: "",
  firstName: "",
  lastName: "",
  candidateNumber: "",
  promotionId: "",
  ready: false,
  missingKeys: [],
  completedHours: 0,
  plannedHours: 0,
  documentsReady: 0,
  documentsTotal: 0,
  ccp1: "pending",
  ccp2: "pending",
  result: "pending",
  published: false,
  examTime: "",
  steps: [],
  programId: "",
  schemeId: "",
  unitStatuses: [],
};

@Component({
  selector: "app-candidate-certification",
  imports: [RouterLink, FormsModule, TranslatePipe, ProgressBarComponent],
  templateUrl: "./candidate-certification.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateCertificationComponent {
  private readonly route = inject(ActivatedRoute);
  readonly sessionService = inject(SessionService);
  readonly store = inject(CertificationApiStoreService);
  readonly workspace = inject(WorkspaceContextService);
  readonly scheme = this.store.scheme;
  readonly program = this.workspace.program;
  readonly exam = this.store.examSession;

  private readonly requestedCandidateId = this.route.snapshot.paramMap.get("id") ?? "";

  readonly candidate = computed<CertificationCandidate>(() => {
    const candidates = this.store.candidates();
    if (this.sessionService.role() === "stagiaire") {
      const enrollmentId = this.store.selfEnrollmentId();
      return candidates.find((item) => this.store.rawCandidate(item.id)?.enrollmentId === enrollmentId) ?? candidates[0] ?? EMPTY_CANDIDATE;
    }
    return candidates.find((item) => item.id === this.requestedCandidateId || item.studentId === this.requestedCandidateId) ?? candidates[0] ?? EMPTY_CANDIDATE;
  });

  readonly isJury = computed(() => this.sessionService.role() === "jury");
  readonly readiness = computed(() => {
    const candidate = this.candidate();
    if (candidate.plannedHours <= 0) return 0;
    return Math.round((candidate.completedHours / candidate.plannedHours) * 100);
  });
  readonly evaluationSaved = signal(false);
  readonly juryLevels = signal<Record<string, JuryLevel>>({});
  readonly evaluationLocked = signal(false);
  juryNotes = "";

  constructor() {
    effect(() => {
      const candidate = this.candidate();
      const raw = this.store.rawCandidate(candidate.id);
      const levels: Record<string, JuryLevel> = {};
      for (const assessment of raw?.assessments ?? []) {
        const stepId = assessment.stepDefinitionId ?? "";
        if (stepId) levels[stepId] = this.store.levelForAssessment(assessment.outcome ?? "");
      }
      this.juryLevels.set(levels);
      this.juryNotes = raw?.assessments?.find((assessment) => Boolean(assessment.comment))?.comment ?? "";
    }, { allowSignalWrites: true });
  }

  setLevel(id: string, level: JuryLevel): void {
    if (this.evaluationLocked()) return;
    this.juryLevels.update((value) => ({ ...value, [id ?? ""]: level }));
    this.evaluationSaved.set(false);
  }

  selected(id: string, level: JuryLevel): boolean {
    return this.juryLevels()[id ?? ""] === level;
  }

  async saveDraft(): Promise<void> {
    const candidate = this.candidate();
    if (!candidate.id) return;
    const saved = await this.store.saveAssessments(candidate.id, this.juryLevels(), this.juryNotes ?? "");
    this.evaluationSaved.set(saved);
  }

  async validateEvaluation(): Promise<void> {
    const candidate = this.candidate();
    if (!candidate.id) return;
    const criteria = this.scheme().juryCriteria;
    if (criteria.length && !criteria.every((criterion) => Boolean(this.juryLevels()[criterion.id]))) return;
    const saved = await this.store.saveAssessments(candidate.id, this.juryLevels(), this.juryNotes ?? "");
    this.evaluationSaved.set(saved);
    if (saved) this.evaluationLocked.set(true);
  }

  unitStatus(unitId: string): CertificationUnitStatus {
    return this.candidate().unitStatuses?.find((item) => item.unitId === unitId)?.status ?? "pending";
  }

  statusClasses(status: string): string {
    return status === "done" || status === "validated"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "not_validated"
        ? "bg-[#ffe1df] text-[#f22b2b]"
        : "bg-[#fff0c9] text-[#8b5e00]";
  }
}
