import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { HomeDashboardApiStoreService } from '../../core/api-data/home-dashboard-api-store.service';
import { SessionService } from '../../core/session/session.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';
import type { AlertLevel } from '../../core/models/app.models';
import { ProgressBarComponent } from '../../shared/ui/progress-bar.component';
import { StatusPillComponent } from '../../shared/ui/status-pill.component';
import { TypeBadgeComponent } from '../../shared/ui/type-badge.component';

interface HomeAlert {
  id: string;
  level: AlertLevel;
  titleKey: string;
  detailKey: string;
  titleParams: Record<string, string | number>;
  detailParams: Record<string, string | number>;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, KeyValuePipe, TranslatePipe, ProgressBarComponent, StatusPillComponent, TypeBadgeComponent],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly sessionService = inject(SessionService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly dashboard = inject(HomeDashboardApiStoreService);

  readonly promotion = computed(() => ({
    name: this.text(this.workspace.cohort()?.name),
    start: this.formatDate(this.workspace.cohort()?.start),
    end: this.formatDate(this.workspace.cohort()?.end),
  }));
  readonly students = computed(() => this.dashboard.students());
  readonly metrics = computed(() => this.dashboard.metrics());
  readonly studentsToWatch = computed(() => [...this.students()].sort((a, b) => b.catchupHours - a.catchupHours).slice(0, 6));
  readonly trainerStudents = computed(() => [...this.students()].slice(0, 6));
  readonly statusCounts = computed(() => ({
    good: this.students().filter((s) => s.status === 'good').length,
    warning: this.students().filter((s) => s.status === 'warning').length,
    late: this.students().filter((s) => s.status === 'late').length,
  }));

  get alerts(): HomeAlert[] {
    const result: HomeAlert[] = [];
    const catchup = this.students().filter((student) => student.catchupHours > 10);
    if (catchup.length) {
      result.push({
        id: 'catchup-over-10',
        level: 'danger',
        titleKey: 'home.direction.alerts.real.catchup.title',
        detailKey: 'home.direction.alerts.real.catchup.detail',
        titleParams: { count: catchup.length },
        detailParams: {
          names: catchup.map((student) => `${this.fullName(student)} (${student.catchupHours} h)`).join(', '),
        },
      });
    }

    const openAlerts = this.dashboard.openAlerts();
    if (openAlerts > 0) {
      result.push({
        id: 'backend-open-alerts',
        level: 'warning',
        titleKey: 'home.direction.alerts.real.open.title',
        detailKey: 'home.direction.alerts.real.open.detail',
        titleParams: { count: openAlerts },
        detailParams: {},
      });
    }
    return result;
  }

  get trainerAgenda() {
    return this.dashboard.trainerAgenda();
  }

  get observations() {
    return this.dashboard.observations();
  }

  get timeline() {
    return this.dashboard.timeline();
  }

  get sam() {
    return this.dashboard.selfStudent();
  }

  nextSession(index: number) {
    return this.dashboard.nextSessions()[index] ?? { dateText: '', title: '', meta: '' };
  }

  studentFileLink(): string[] {
    return this.sam.id ? ['/stagiaires', this.sam.id] : ['/stagiaires'];
  }

  fullName(s: { firstName: string; lastName: string }) {
    return [this.text(s.firstName), this.text(s.lastName)].filter(Boolean).join(' ');
  }

  roleIsDirection() {
    const r = this.sessionService.role();
    return r === 'direction' || r === 'secretariat';
  }

  roleIsTrainer() {
    return this.sessionService.role() === 'formateur';
  }

  alertClasses(l: AlertLevel) {
    return l === 'danger' ? 'bg-[#fee3df]' : l === 'warning' ? 'bg-[#ffefc9]' : 'bg-[#e5f2ff]';
  }

  alertIcon(l: AlertLevel) {
    return l === 'info' ? 'ph-info' : 'ph-warning';
  }

  alertIconClass(l: AlertLevel) {
    return l === 'danger' ? 'text-[#f04438]' : l === 'warning' ? 'text-[#79550c]' : 'text-[#2b66a4]';
  }

  dot(s: 'valid' | 'absence' | 'driving' | 'classroom') {
    return s === 'valid'
      ? 'bg-[#22a84b]'
      : s === 'absence'
        ? 'bg-[#ed2e38]'
        : s === 'driving'
          ? 'bg-[#f8a11a]'
          : 'bg-[#2a64a2]';
  }

  private formatDate(value: unknown): string {
    const text = this.text(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
    const [year, month, day] = text.split('-');
    return `${day}/${month}/${year}`;
  }

  private text(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}
