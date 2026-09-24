import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TRAINING_PROGRAMS, TRAINING_SITES } from "../../core/api-data/runtime-data.store";
import { SUCCESS_ANALYTICS_RECORDS } from "../../core/api-data/runtime-data.store";
import type { SuccessAnalyticsRecord, SuccessCandidateDetail, SuccessOutcome } from "../../core/models/success-analytics.models";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";

type SuccessScope = "organization" | "site" | "program" | "cohort";
type CandidateFilter = "all" | SuccessOutcome;

interface SuccessSummary {
  presented: number;
  graduated: number;
  partial: number;
  failed: number;
  absent: number;
  promotions: number;
  rate: number;
}

interface BreakdownItem extends SuccessSummary {
  id: string;
  label: string;
}

@Component({
  selector: "app-success",
  imports: [TranslatePipe, ProgressBarComponent],
  templateUrl: "./success.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuccessComponent {
  private readonly route = inject(ActivatedRoute);
  readonly workspace = inject(WorkspaceContextService);

  readonly scope = signal<SuccessScope>(
    this.route.snapshot.paramMap.get("promotionId") ? "cohort" : "organization",
  );
  readonly selectedRecordId = signal<string | null>(
    this.route.snapshot.paramMap.get("promotionId"),
  );
  readonly candidateFilter = signal<CandidateFilter>("all");

  readonly accessibleRecords = computed(() => {
    const organizationIds = new Set(this.workspace.organizations().map((item) => item.id));
    return SUCCESS_ANALYTICS_RECORDS.filter((item) => organizationIds.has(item.organizationId));
  });

  readonly organizationRecords = computed(() =>
    this.accessibleRecords().filter(
      (item) => item.organizationId === this.workspace.selection().organizationId,
    ),
  );

  readonly siteRecords = computed(() =>
    this.organizationRecords().filter(
      (item) => item.siteId === this.workspace.selection().siteId,
    ),
  );

  readonly programRecords = computed(() =>
    this.siteRecords().filter(
      (item) => item.programId === this.workspace.selection().programId,
    ),
  );

  readonly detailRecord = computed(() => {
    const requested = this.selectedRecordId();
    if (requested) {
      return this.accessibleRecords().find((item) => item.id === requested) ?? null;
    }
    if (this.scope() === "cohort") return this.programRecords()[0] ?? null;
    return null;
  });

  readonly scopedRecords = computed(() => {
    switch (this.scope()) {
      case "site":
        return this.siteRecords();
      case "program":
        return this.programRecords();
      case "cohort": {
        const detail = this.detailRecord();
        return detail ? [detail] : [];
      }
      default:
        return this.organizationRecords();
    }
  });

  readonly summary = computed(() => this.aggregate(this.scopedRecords()));

  readonly promotionRows = computed(() => {
    const rows = this.scope() === "organization"
      ? this.organizationRecords()
      : this.scope() === "site"
        ? this.siteRecords()
        : this.programRecords();
    return [...rows].sort((a, b) => b.year.localeCompare(a.year) || b.rate - a.rate);
  });

  readonly siteBreakdown = computed<BreakdownItem[]>(() => {
    const groups = new Map<string, SuccessAnalyticsRecord[]>();
    for (const record of this.organizationRecords()) {
      groups.set(record.siteId, [...(groups.get(record.siteId) ?? []), record]);
    }
    return [...groups.entries()]
      .map(([id, records]) => ({
        id,
        label: this.siteName(id),
        ...this.aggregate(records),
      }))
      .sort((a, b) => b.rate - a.rate);
  });

  readonly programBreakdown = computed<BreakdownItem[]>(() => {
    const source = this.scope() === "organization" ? this.organizationRecords() : this.siteRecords();
    const groups = new Map<string, SuccessAnalyticsRecord[]>();
    for (const record of source) {
      groups.set(record.programId, [...(groups.get(record.programId) ?? []), record]);
    }
    return [...groups.entries()]
      .map(([id, records]) => ({
        id,
        label: this.programName(id),
        ...this.aggregate(records),
      }))
      .sort((a, b) => b.rate - a.rate);
  });

  readonly trend = computed(() => {
    const groups = new Map<string, SuccessAnalyticsRecord[]>();
    for (const record of this.scopedRecords()) {
      groups.set(record.year, [...(groups.get(record.year) ?? []), record]);
    }
    return [...groups.entries()]
      .map(([year, records]) => ({ year, ...this.aggregate(records) }))
      .sort((a, b) => a.year.localeCompare(b.year));
  });

  readonly previousDelta = computed(() => {
    const trend = this.trend();
    if (trend.length < 2) return null;
    return Math.round((trend[trend.length - 1].rate - trend[trend.length - 2].rate) * 10) / 10;
  });

  readonly candidateCounts = computed(() => {
    const candidates = this.detailRecord()?.candidates ?? [];
    return {
      all: candidates.length,
      obtained: candidates.filter((item) => item.result === "obtained").length,
      partial: candidates.filter((item) => item.result === "partial").length,
      failed: candidates.filter((item) => item.result === "failed").length,
      absent: candidates.filter((item) => item.result === "absent").length,
    };
  });

  readonly filteredCandidates = computed(() => {
    const candidates = this.detailRecord()?.candidates ?? [];
    const filter = this.candidateFilter();
    return filter === "all" ? candidates : candidates.filter((item) => item.result === filter);
  });

  selectScope(scope: SuccessScope): void {
    this.scope.set(scope);
    if (scope === "cohort" && !this.selectedRecordId()) {
      this.selectedRecordId.set(this.programRecords()[0]?.id ?? null);
    }
    if (scope !== "cohort") this.selectedRecordId.set(null);
  }

  openDetails(record: SuccessAnalyticsRecord): void {
    this.selectedRecordId.set(record.id);
    this.scope.set("cohort");
    this.candidateFilter.set("all");
  }

  closeDetails(): void {
    this.selectedRecordId.set(null);
    this.scope.set("program");
    this.candidateFilter.set("all");
  }

  setCandidateFilter(filter: CandidateFilter): void {
    this.candidateFilter.set(filter);
  }

  siteName(id: string): string {
    return TRAINING_SITES.find((item) => item.id === id)?.name ?? id;
  }

  programName(id: string): string {
    return TRAINING_PROGRAMS.find((item) => item.id === id)?.name ?? id;
  }

  resultClass(result: SuccessOutcome): string {
    switch (result) {
      case "obtained": return "bg-[#d8f8df] text-[#178a3d]";
      case "partial": return "bg-[#fff0c9] text-[#8b5e00]";
      case "failed": return "bg-[#ffe1df] text-[#d92d20]";
      default: return "bg-[#eef2f6] text-[#637083]";
    }
  }

  resultIcon(result: SuccessOutcome): string {
    switch (result) {
      case "obtained": return "ph-check-circle";
      case "partial": return "ph-circle-half";
      case "failed": return "ph-x-circle";
      default: return "ph-minus-circle";
    }
  }

  candidateName(candidate: SuccessCandidateDetail): string {
    return `${candidate.firstName} ${candidate.lastName}`;
  }

  private aggregate(records: SuccessAnalyticsRecord[]): SuccessSummary {
    const presented = records.reduce((sum, item) => sum + item.presented, 0);
    const graduated = records.reduce((sum, item) => sum + item.graduated, 0);
    return {
      presented,
      graduated,
      partial: records.reduce((sum, item) => sum + item.partial, 0),
      failed: records.reduce((sum, item) => sum + item.failed, 0),
      absent: records.reduce((sum, item) => sum + item.absent, 0),
      promotions: records.length,
      rate: presented ? Math.round((graduated / presented) * 1000) / 10 : 0,
    };
  }
}
