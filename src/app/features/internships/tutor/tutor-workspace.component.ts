import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { WorkplaceApiService } from '../../../core/workplace/workplace-api.service';
import type { WorkplacePeriodDto, WorkplaceActivityDto } from '../../../core/workplace/workplace.models';
import { SessionService } from '../../../core/session/session.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-tutor-workspace',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './tutor-workspace.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TutorWorkspaceComponent {
  private readonly api = inject(WorkplaceApiService);
  private readonly session = inject(SessionService);
  readonly rows = signal<WorkplacePeriodDto[]>([]);
  readonly selectedId = signal('');
  readonly selected = computed(() => this.rows().find(p => p.id === this.selectedId()) ?? null);
  readonly pending = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal(false);
  readonly completedHours = signal(0);
  readonly observation = signal('');
  readonly summary = signal('');
  readonly strengths = signal('');
  readonly improvementAreas = signal('');
  readonly validated = signal<'yes'|'no'|'unset'>('unset');
  private generation = 0;

  constructor() {
    effect(() => {
      // Changing organization invalidates all previously retrieved tutor data.
      this.session.session()?.organizationId;
      this.rows.set([]); this.selectedId.set(''); this.error.set('');
      void this.load();
    });
  }

  async load(): Promise<void> {
    const organization = this.session.session()?.organizationId;
    const request = ++this.generation;
    if (!organization) return;
    this.pending.set(true); this.error.set('');
    try {
      const periods = await this.api.getTutorPeriods();
      if (request !== this.generation || this.session.session()?.organizationId !== organization) return;
      this.rows.set(Array.isArray(periods) ? periods : []);
      const exists = this.rows().find(p => p.id === this.selectedId());
      this.choose(exists?.id ?? this.rows()[0]?.id ?? '');
    } catch {
      if (request === this.generation) { this.rows.set([]); this.selectedId.set(''); this.error.set('load'); }
    } finally { if (request === this.generation) this.pending.set(false); }
  }

  choose(id: string): void {
    this.selectedId.set(id);
    const period = this.selected();
    this.completedHours.set(period?.completedHours ?? 0);
    this.observation.set(period?.tutorObservation ?? '');
    this.summary.set(''); this.strengths.set(''); this.improvementAreas.set('');
    this.validated.set('unset'); this.success.set(false); this.error.set('');
  }
  setHours(event: Event): void { this.completedHours.set(Number((event.target as HTMLInputElement).value)); }
  setObservation(event: Event): void { this.observation.set((event.target as HTMLTextAreaElement).value); }
  setSummary(event: Event): void { this.summary.set((event.target as HTMLTextAreaElement).value); }
  setStrengths(event: Event): void { this.strengths.set((event.target as HTMLTextAreaElement).value); }
  setImprovements(event: Event): void { this.improvementAreas.set((event.target as HTMLTextAreaElement).value); }
  setValidated(event: Event): void { this.validated.set((event.target as HTMLSelectElement).value as 'yes'|'no'|'unset'); }

  private updatePeriod(updated: WorkplacePeriodDto): void {
    this.rows.update(rows => rows.map(row => row.id === updated.id ? updated : row));
    this.success.set(true);
  }
  async saveHours(): Promise<void> {
    const period = this.selected();
    if (!period || this.saving() || !Number.isFinite(this.completedHours()) || this.completedHours() < 0 || this.completedHours() > period.plannedHours) return;
    this.saving.set(true); this.error.set(''); this.success.set(false);
    try {
      const updated = await this.api.updateTutorHours(period.id, this.completedHours(), this.observation());
      if (this.selectedId() === period.id) this.updatePeriod(updated);
    } catch { this.error.set('save'); }
    finally { this.saving.set(false); }
  }
  async saveActivity(activity: WorkplaceActivityDto, status: WorkplaceActivityDto['status'], comment: string): Promise<void> {
    const period = this.selected();
    if (!period || this.saving()) return;
    this.saving.set(true); this.error.set(''); this.success.set(false);
    try {
      const updated = await this.api.updateTutorActivity(period.id, activity.id, status, comment);
      if (this.selectedId() === period.id) this.updatePeriod(updated);
    } catch { this.error.set('save'); }
    finally { this.saving.set(false); }
  }
  async saveEvaluation(): Promise<void> {
    const period = this.selected();
    if (!period || this.saving() || !this.summary().trim()) return;
    this.saving.set(true); this.error.set(''); this.success.set(false);
    try {
      const answer = this.validated() === 'unset' ? null : this.validated() === 'yes';
      const updated = await this.api.submitTutorEvaluation(period.id, this.summary().trim(), this.strengths(), this.improvementAreas(), answer);
      if (this.selectedId() === period.id) { this.updatePeriod(updated); this.summary.set(''); this.strengths.set(''); this.improvementAreas.set(''); this.validated.set('unset'); }
    } catch { this.error.set('save'); }
    finally { this.saving.set(false); }
  }
}
