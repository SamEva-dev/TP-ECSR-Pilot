import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { CertificationApiService } from "../../core/certification/certification-api.service";
import type {
  CertificationAssessment,
  CertificationCandidate as ApiCertificationCandidate,
  CertificationExamSession,
  CertificationScheme as ApiCertificationScheme,
} from "../../core/certification/certification.models";
import type {
  CertificationResult,
  CertificationUnitStatus,
} from "../../core/models/certification.models";
import { ApplicationNotificationService } from "../../core/notifications/application-notification.service";
import { RealtimeService } from "../../core/realtime/realtime.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";

interface ResultSchemeUnit {
  id: string;
  code: string;
  shortLabel: string;
}

interface ResultSchemeStep {
  id: string;
  unitId: string;
}

interface ResultScheme {
  id: string;
  code: string;
  units: ResultSchemeUnit[];
  steps: ResultSchemeStep[];
}

interface ResultExam {
  id: string;
  name: string;
  status: string;
  schemeId: string;
}

interface ResultCandidateRow {
  id: string;
  enrollmentId: string;
  firstName: string;
  lastName: string;
  candidateNumber: string;
  result: CertificationResult;
  assessments: CertificationAssessment[];
}

@Component({
  selector: "app-results",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./results.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsComponent {
  readonly workspace = inject(WorkspaceContextService);
  private readonly certificationApi = inject(CertificationApiService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly realtime = inject(RealtimeService);
  private readonly sessions = signal<CertificationExamSession[]>([]);
  private readonly schemes = signal<ApiCertificationScheme[]>([]);
  private readonly candidateSource = signal<ApiCertificationCandidate[]>([]);
  private readonly publishConfirmed = signal(false);
  private loadSequence = 0;

  readonly program = computed(() => {
    const program = this.workspace.program();
    return {
      ...(program ?? {}),
      name: this.text(program?.name),
    };
  });

  readonly exam = computed<ResultExam>(() => {
    const value = [...this.sessions()].sort((a, b) =>
      this.text(b?.startsAtUtc).localeCompare(this.text(a?.startsAtUtc)),
    )[0];
    return {
      id: this.text(value?.id),
      name: this.text(value?.title),
      status: this.text(value?.status),
      schemeId: this.text(value?.schemeId),
    };
  });

  readonly scheme = computed<ResultScheme>(() => {
    const examSchemeId = this.exam().schemeId;
    const value =
      this.schemes().find((item) => this.text(item?.id) === examSchemeId) ??
      this.schemes()[0];
    return {
      id: this.text(value?.id),
      code: this.text(value?.code),
      units: (Array.isArray(value?.units) ? value.units : []).map((unit) => ({
        id: this.text(unit?.id),
        code: this.text(unit?.code),
        shortLabel: this.text(unit?.code ?? unit?.title),
      })),
      steps: (Array.isArray(value?.steps) ? value.steps : []).map((step) => ({
        id: this.text(step?.id),
        unitId: this.text(step?.unitId),
      })),
    };
  });

  readonly published = computed(
    () =>
      this.publishConfirmed() ||
      this.exam().status.trim().toLowerCase() === "published",
  );

  readonly candidates = computed<ResultCandidateRow[]>(() =>
    this.candidateSource().map((candidate) => ({
      id: this.text(candidate?.id),
      enrollmentId: this.text(candidate?.enrollmentId),
      firstName: this.text(candidate?.firstName),
      lastName: this.text(candidate?.lastName),
      candidateNumber: this.text(candidate?.candidateNumber),
      result: this.result(candidate?.decision),
      assessments: Array.isArray(candidate?.assessments)
        ? candidate.assessments
        : [],
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

  constructor() {
    void this.realtime.start().catch(() => undefined);
    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const cohort = this.workspace.cohort();
      const cohortId = this.text(cohort?.apiId);
      const referentialVersionId = this.text(cohort?.referentialVersionId);
      this.publishConfirmed.set(false);
      this.sessions.set([]);
      this.schemes.set([]);
      this.candidateSource.set([]);
      if (ready && cohortId) {
        untracked(() => void this.load(cohortId, referentialVersionId));
      }
    });
    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.certification\./.test(event.typeKey)) return;
      const cohort = this.workspace.cohort();
      const cohortId = this.text(cohort?.apiId);
      if (!cohortId) return;
      const referentialVersionId = this.text(cohort?.referentialVersionId);
      untracked(() => void this.load(cohortId, referentialVersionId));
    });
  }

  async publish(): Promise<void> {
    const sessionId = this.exam().id;
    if (!sessionId) {
      this.notifications.error("results.api.publishFailed", "/resultats");
      return;
    }

    try {
      const session = await firstValueFrom(
        this.certificationApi.publishResults(sessionId),
      );
      if (this.text(session?.status).toLowerCase() !== "published") {
        throw new Error("Certification results were not published.");
      }
      this.publishConfirmed.set(true);
      const cohort = this.workspace.cohort();
      const cohortId = this.text(cohort?.apiId);
      if (cohortId) {
        await this.load(cohortId, this.text(cohort?.referentialVersionId));
      }
    } catch {
      this.notifications.error("results.api.publishFailed", "/resultats");
    }
  }

  exportPdf(): void {
    window.print();
  }

  exportExcel(): void {
    try {
      const units = this.scheme().units;
      const header = [
        "Prénom",
        "Nom",
        "Numéro candidat",
        ...units.map((unit) => unit.shortLabel),
        "Résultat",
        "Publication",
      ];
      const rows = this.candidates().map((candidate) => [
        candidate.firstName,
        candidate.lastName,
        candidate.candidateNumber,
        ...units.map((unit) => this.unitStatus(candidate, unit.id)),
        candidate.result,
        this.published() ? "published" : "draft",
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map((value) => this.csv(value)).join(";"))
        .join("\r\n");
      const blob = new Blob(["\ufeff", csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "resultats-certification.csv";
        anchor.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      this.notifications.error("results.api.exportFailed", "/resultats");
    }
  }

  resultClasses(result: CertificationResult): string {
    if (result === "obtained") return "bg-[#d8f8df] text-[#18a547]";
    if (result === "partial") return "bg-[#fff0c9] text-[#8b5e00]";
    if (result === "failed") return "bg-[#ffe1df] text-[#f22b2b]";
    if (result === "absent") return "bg-[#eef2f6] text-[#64748b]";
    return "bg-[#e5f2ff] text-[#2a64a2]";
  }

  unitStatus(
    candidate: ResultCandidateRow,
    unitId: string,
  ): CertificationUnitStatus {
    const stepIds = this.scheme().steps
      .filter((step) => step.unitId === unitId)
      .map((step) => step.id)
      .filter(Boolean);
    if (!stepIds.length) return "pending";

    const outcomes = stepIds.map((stepId) =>
      this.text(
        candidate.assessments.find(
          (assessment) => assessment.stepDefinitionId === stepId,
        )?.outcome,
      ).toLowerCase(),
    );

    if (outcomes.some((outcome) => outcome === "failed" || outcome === "absent"))
      return "not_validated";
    if (
      outcomes.every(
        (outcome) => outcome === "passed" || outcome === "notapplicable",
      )
    )
      return "validated";
    return "pending";
  }

  statusIcon(status: CertificationUnitStatus): string {
    return status === "validated"
      ? "ph-check-circle text-[#18a547]"
      : status === "not_validated"
        ? "ph-x-circle text-[#f22b2b]"
        : "ph-clock text-[#8b5e00]";
  }

  private async load(
    cohortId: string,
    referentialVersionId: string,
  ): Promise<void> {
    const sequence = ++this.loadSequence;
    try {
      const [sessions, schemes] = await Promise.all([
        firstValueFrom(this.certificationApi.getSessions(cohortId)),
        firstValueFrom(
          this.certificationApi.getSchemes(referentialVersionId || undefined),
        ),
      ]);
      if (sequence !== this.loadSequence) return;
      const normalizedSessions = Array.isArray(sessions) ? sessions : [];
      const normalizedSchemes = Array.isArray(schemes) ? schemes : [];
      this.sessions.set(normalizedSessions);
      this.schemes.set(normalizedSchemes);

      const session = [...normalizedSessions].sort((a, b) =>
        this.text(b?.startsAtUtc).localeCompare(this.text(a?.startsAtUtc)),
      )[0];
      if (!session?.id) {
        this.candidateSource.set([]);
        return;
      }
      const candidates = await firstValueFrom(
        this.certificationApi.getCandidates(session.id),
      );
      if (sequence !== this.loadSequence) return;
      this.candidateSource.set(Array.isArray(candidates) ? candidates : []);
    } catch {
      if (sequence !== this.loadSequence) return;
      this.sessions.set([]);
      this.schemes.set([]);
      this.candidateSource.set([]);
      this.notifications.error("results.api.loadFailed", "/resultats");
    }
  }

  private result(value: unknown): CertificationResult {
    const normalized = this.text(value).trim().toLowerCase();
    if (normalized === "obtained") return "obtained";
    if (normalized === "partial") return "partial";
    if (normalized === "failed") return "failed";
    if (normalized === "absent") return "absent";
    return "pending";
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : value == null ? "" : String(value);
  }

  private csv(value: unknown): string {
    return `"${this.text(value).replaceAll('"', '""')}"`;
  }
}
