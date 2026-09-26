import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type { SuccessAnalyticsRecord, SuccessCandidateDetail, SuccessOutcome } from "../../core/models/success-analytics.models";
import type { CertificationSuccessRecord } from "../../core/reporting/reporting.models";
import { ReportingApiService } from "../../core/reporting/reporting-api.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ApplicationNotificationService } from "../../core/notifications/application-notification.service";
import { RealtimeService } from "../../core/realtime/realtime.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";

type SuccessScope = "organization" | "site" | "program" | "cohort";
type CandidateFilter = "all" | SuccessOutcome;

interface SuccessSummary { presented: number; graduated: number; partial: number; failed: number; absent: number; promotions: number; rate: number; }
interface BreakdownItem extends SuccessSummary { id: string; label: string; }

@Component({
  selector: "app-success",
  imports: [TranslatePipe, ProgressBarComponent],
  templateUrl: "./success.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuccessComponent {
  private readonly route = inject(ActivatedRoute);
  readonly workspace = inject(WorkspaceContextService);
  private readonly reporting = inject(ReportingApiService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly realtime = inject(RealtimeService);
  private readonly records = signal<SuccessAnalyticsRecord[]>([]);

  readonly scope = signal<SuccessScope>(this.route.snapshot.paramMap.get("promotionId") ? "cohort" : "organization");
  readonly selectedRecordId = signal<string | null>(this.route.snapshot.paramMap.get("promotionId"));
  readonly candidateFilter = signal<CandidateFilter>("all");
  readonly accessibleRecords = computed(() => this.records());
  readonly organizationRecords = computed(() => this.accessibleRecords().filter((item) => item.organizationId === this.workspace.selection().organizationId));
  readonly siteRecords = computed(() => this.organizationRecords().filter((item) => item.siteId === this.workspace.selection().siteId));
  readonly programRecords = computed(() => this.siteRecords().filter((item) => item.programId === this.workspace.selection().programId));
  readonly detailRecord = computed(() => {
    const requested = this.selectedRecordId();
    if (requested) return this.accessibleRecords().find((item) => item.id === requested) ?? null;
    if (this.scope() === "cohort") return this.programRecords()[0] ?? null;
    return null;
  });
  readonly scopedRecords = computed(() => {
    switch (this.scope()) { case "site": return this.siteRecords(); case "program": return this.programRecords(); case "cohort": { const detail = this.detailRecord(); return detail ? [detail] : []; } default: return this.organizationRecords(); }
  });
  readonly summary = computed(() => this.aggregate(this.scopedRecords()));
  readonly promotionRows = computed(() => {
    const rows = this.scope() === "organization" ? this.organizationRecords() : this.scope() === "site" ? this.siteRecords() : this.programRecords();
    return [...rows].sort((a, b) => b.year.localeCompare(a.year) || b.rate - a.rate);
  });
  readonly siteBreakdown = computed<BreakdownItem[]>(() => {
    const groups = new Map<string, SuccessAnalyticsRecord[]>();
    for (const record of this.organizationRecords()) groups.set(record.siteId, [...(groups.get(record.siteId) ?? []), record]);
    return [...groups.entries()].map(([id, rows]) => ({ id, label: this.siteName(id), ...this.aggregate(rows) })).sort((a, b) => b.rate - a.rate);
  });
  readonly programBreakdown = computed<BreakdownItem[]>(() => {
    const source = this.scope() === "organization" ? this.organizationRecords() : this.siteRecords();
    const groups = new Map<string, SuccessAnalyticsRecord[]>();
    for (const record of source) groups.set(record.programId, [...(groups.get(record.programId) ?? []), record]);
    return [...groups.entries()].map(([id, rows]) => ({ id, label: this.programName(id), ...this.aggregate(rows) })).sort((a, b) => b.rate - a.rate);
  });
  readonly trend = computed(() => {
    const groups = new Map<string, SuccessAnalyticsRecord[]>();
    for (const record of this.scopedRecords()) groups.set(record.year, [...(groups.get(record.year) ?? []), record]);
    return [...groups.entries()].map(([year, rows]) => ({ year, ...this.aggregate(rows) })).sort((a, b) => a.year.localeCompare(b.year));
  });
  readonly previousDelta = computed(() => { const trend = this.trend(); return trend.length < 2 ? null : Math.round((trend.at(-1)!.rate - trend.at(-2)!.rate) * 10) / 10; });
  readonly candidateCounts = computed(() => { const rows = this.detailRecord()?.candidates ?? []; return { all: rows.length, obtained: rows.filter(x => x.result === "obtained").length, partial: rows.filter(x => x.result === "partial").length, failed: rows.filter(x => x.result === "failed").length, absent: rows.filter(x => x.result === "absent").length }; });
  readonly filteredCandidates = computed(() => { const rows = this.detailRecord()?.candidates ?? []; const filter = this.candidateFilter(); return filter === "all" ? rows : rows.filter(x => x.result === filter); });

  constructor() {
    void this.realtime.start().catch(() => undefined);
    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const organizationId = this.workspace.organization()?.apiId ?? "";
      this.records.set([]);
      if (ready && organizationId) untracked(() => void this.load(organizationId));
    });
    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.certification\./.test(event.typeKey)) return;
      const organizationId = this.workspace.organization()?.apiId ?? "";
      if (organizationId) untracked(() => void this.load(organizationId));
    });
  }

  private async load(organizationId: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.reporting.certificationSuccess(organizationId));
      this.records.set((response ?? []).map((row) => this.mapRecord(row)));
    } catch {
      this.records.set([]);
      this.notifications.error("success.api.loadFailed", "/reussites");
    }
  }

  selectScope(scope: SuccessScope): void { this.scope.set(scope); if (scope === "cohort" && !this.selectedRecordId()) this.selectedRecordId.set(this.programRecords()[0]?.id ?? null); if (scope !== "cohort") this.selectedRecordId.set(null); }
  openDetails(record: SuccessAnalyticsRecord): void { this.selectedRecordId.set(record.id); this.scope.set("cohort"); this.candidateFilter.set("all"); }
  closeDetails(): void { this.selectedRecordId.set(null); this.scope.set("program"); this.candidateFilter.set("all"); }
  setCandidateFilter(filter: CandidateFilter): void { this.candidateFilter.set(filter); }
  siteName(id: string): string { return this.workspace.sites().find((item) => item.id === id)?.name ?? ""; }
  programName(id: string): string {
    for (const site of this.workspace.sites()) { const program = this.workspace.sitePrograms(site.id).find((item) => item.id === id); if (program) return program.name ?? ""; }
    return "";
  }
  resultClass(result: SuccessOutcome): string { switch (result) { case "obtained": return "bg-[#d8f8df] text-[#178a3d]"; case "partial": return "bg-[#fff0c9] text-[#8b5e00]"; case "failed": return "bg-[#ffe1df] text-[#d92d20]"; default: return "bg-[#eef2f6] text-[#637083]"; } }
  resultIcon(result: SuccessOutcome): string { switch (result) { case "obtained": return "ph-check-circle"; case "partial": return "ph-circle-half"; case "failed": return "ph-x-circle"; default: return "ph-minus-circle"; } }
  candidateName(candidate: SuccessCandidateDetail): string { return `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim(); }
  print(): void { window.print(); }
  exportPdf(): void { window.print(); }
  exportExcel(): void {
    try {
      const rows = this.scopedRecords();
      const csv = ["Promotion;Site;Programme;Présentés;Diplômés;Partiels;Échecs;Absents;Taux", ...rows.map((r) => [r.cohortName, this.siteName(r.siteId), this.programName(r.programId), r.presented, r.graduated, r.partial, r.failed, r.absent, r.rate].map(this.csv).join(";"))].join("\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
      try { const a = document.createElement("a"); a.href = url; a.download = "reussites.csv"; a.click(); } finally { URL.revokeObjectURL(url); }
    } catch { this.notifications.error("success.api.exportFailed", "/reussites"); }
  }

  private mapRecord(row: CertificationSuccessRecord): SuccessAnalyticsRecord {
    const organization = this.workspace.organization();
    const site = this.workspace.sites().find((item) => item.apiId === (row.siteId ?? ""));
    const siteId = site?.id ?? "";
    const program = siteId ? this.workspace.sitePrograms(siteId).find((item) => item.apiId === (row.programId ?? "")) : null;
    const year = this.academicYear(row.cohortStartDate, row.cohortEndDate);
    return {
      id: row.cohortKey ?? row.cohortId ?? "", organizationId: organization?.id ?? "", siteId, programId: program?.id ?? "", cohortName: row.cohortName ?? "", year,
      session: row.sessionTitle ?? "", presented: this.number(row.presented), graduated: this.number(row.graduated), partial: this.number(row.partial), failed: this.number(row.failed), absent: this.number(row.absent), rate: this.number(row.rate),
      candidates: (row.candidates ?? []).map((candidate) => ({ id: candidate.id ?? "", firstName: candidate.firstName ?? "", lastName: candidate.lastName ?? "", candidateNumber: candidate.candidateNumber ?? "", session: row.sessionTitle ?? "", result: this.outcome(candidate.result), unitResults: (candidate.unitResults ?? []).map((unit) => ({ code: unit.code ?? "", validated: unit.validated === true })) })),
    };
  }
  private academicYear(start: string, end: string): string { const sy = (start ?? "").slice(0, 4); const ey = (end ?? "").slice(0, 4); return sy && ey ? (sy === ey ? sy : `${sy}–${ey}`) : sy || ey || ""; }
  private outcome(value: unknown): SuccessOutcome { return value === "obtained" || value === "partial" || value === "failed" || value === "absent" ? value : "absent"; }
  private number(value: unknown): number { const n = typeof value === "number" ? value : Number(value); return Number.isFinite(n) ? n : 0; }
  private csv(value: unknown): string { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
  private aggregate(records: SuccessAnalyticsRecord[]): SuccessSummary {
    const presented = records.reduce((sum, item) => sum + this.number(item.presented), 0); const graduated = records.reduce((sum, item) => sum + this.number(item.graduated), 0);
    return { presented, graduated, partial: records.reduce((s, x) => s + this.number(x.partial), 0), failed: records.reduce((s, x) => s + this.number(x.failed), 0), absent: records.reduce((s, x) => s + this.number(x.absent), 0), promotions: records.length, rate: presented ? Math.round((graduated / presented) * 1000) / 10 : 0 };
  }
}
