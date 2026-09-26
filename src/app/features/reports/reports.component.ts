import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReportsApiStoreService } from '../../core/api-data/reports-api-store.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ProgressBarComponent } from '../../shared/ui/progress-bar.component';
import { StatusPillComponent } from '../../shared/ui/status-pill.component';

type ReportType = 'individual' | 'hours' | 'absences' | 'progress' | 'promotion' | 'internship';

@Component({
  selector: 'app-reports',
  imports: [TranslatePipe, ProgressBarComponent, StatusPillComponent],
  templateUrl: './reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent {
  private readonly store = inject(ReportsApiStoreService);
  readonly selectedReport = signal<ReportType>('individual');
  readonly promotionId = this.store.promotionId;
  readonly students = this.store.students;
  readonly totalCompletedHours = this.store.totalCompletedHours;
  readonly totalCatchupHours = this.store.totalCatchupHours;
  readonly averageProgress = this.store.averageProgress;
  readonly canSeeAudit = this.store.canSeeAudit;

  get promotions() { return this.store.promotions(); }
  get auditLog() { return this.store.auditLog(); }

  readonly reportTypes: { key: ReportType; labelKey: string }[] = [
    { key: 'individual', labelKey: 'reports.types.individual' },
    { key: 'hours', labelKey: 'reports.types.hours' },
    { key: 'absences', labelKey: 'reports.types.absences' },
    { key: 'progress', labelKey: 'reports.types.progress' },
    { key: 'promotion', labelKey: 'reports.types.promotion' },
    { key: 'internship', labelKey: 'reports.types.internship' },
  ];

  selectReport(type: ReportType) { this.selectedReport.set(type); }

  updatePromotion(event: Event) {
    const value = (event.target as HTMLSelectElement).value ?? '';
    this.store.selectPromotion(value);
  }

  promotionName() { return this.store.promotionName(); }
  reportTitleKey() { return `reports.sections.${this.selectedReport()}.title`; }
  print() { window.print(); }
  exportPdf() { window.print(); }
  exportExcel() { void this.store.exportExcel(); }
}
