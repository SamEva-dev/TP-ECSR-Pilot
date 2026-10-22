import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SessionService } from '../../core/session/session.service';
import { ApplicationNotificationService } from '../../core/notifications/application-notification.service';
import { SignatureApiService, type SignatureCenterItem, type SignatureEnvelope, type SignatureCenterPage, type DailyObservationSignatureCandidate } from '../../core/signatures/signature-api.service';

@Component({
  selector: 'app-signature-center',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './signature-center.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignatureCenterComponent {
  private readonly api = inject(SignatureApiService);
  readonly session = inject(SessionService);
  private readonly notifications = inject(ApplicationNotificationService);
  readonly data = signal<SignatureCenterPage>({items: [], total: 0, page: 1, pageSize: 25, statusCounts: {}});
  readonly pending = signal(false);
  readonly mutating = signal(false);
  readonly status = signal('');
  readonly team = signal(false);
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly page = signal(1);
  readonly date = signal(this.today());
  readonly daily = signal<DailyObservationSignatureCandidate[]>([]);
  readonly selectedDaily = signal<ReadonlySet<string>>(new Set());
  private generation = 0;
  private dailyGeneration = 0;
  private currentOrganization = '';
  private today(): string {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }
  private readonly permissions = computed(() => this.session.session()?.permissions ?? []);
  readonly canRequest = computed(() => this.permissions().some(p => /^(pedagora\.)?signatures\.request$/i.test(p)));
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.data().total / this.data().pageSize)));
  readonly selectedCount = computed(() => this.selected().size);

  constructor() {
    effect(() => {
      const orgId = this.session.session()?.organizationId ?? '';
      if (orgId === this.currentOrganization) return;
      this.currentOrganization = orgId;
      this.data.set({items: [], total: 0, page: 1, pageSize: 25, statusCounts: {}});
      this.selected.set(new Set());
      this.dailyGeneration++;
      this.daily.set([]);
      this.selectedDaily.set(new Set());
      this.page.set(1);
      void this.load();
    });
  }

  private async getCandidates() {
    return await firstValueFrom(this.api.myDailyObservations(this.date()));
  }

  async load(): Promise<void> {
    const organization = this.session.session()?.organizationId ?? '';
    const generation = ++this.generation;
    this.selected.set(new Set());
    if (!organization) return;
    this.pending.set(true);
    try {
      const response = await firstValueFrom(this.api.center({
        page: this.page(), pageSize: 25, status: this.status() || undefined,
        team: this.team(),
      }));
      if (generation !== this.generation || organization !== this.session.session()?.organizationId) return;
      this.data.set({items: Array.isArray(response?.items) ? response.items : [],
        statusCounts: response?.statusCounts && typeof response.statusCounts === 'object' ? response.statusCounts : {},
        total: Number.isFinite(response?.total) ? response.total : 0,
        page: Number.isFinite(response?.page) ? response.page : 1,
        pageSize: Number.isFinite(response?.pageSize) ? response.pageSize : 25});
    } catch {
      if (generation === this.generation) {
        this.data.set({items: [], total: 0, page: this.page(), pageSize: 25, statusCounts: {}});
        this.notifications.error('signatures.center.loadError', '/signatures/centre');
      }
    } finally { if (generation === this.generation) this.pending.set(false); }
  }

  chooseStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
    this.page.set(1); void this.load();
  }

  setTeam(event: Event): void {
    this.team.set((event.target as HTMLInputElement).checked);
    this.page.set(1); void this.load();
  }

  navigatePage(offset: number): void {
    const next = this.page() + offset;
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next); void this.load();
  }

  select(id: string, event: Event): void {
    const copy = new Set(this.selected());
    if ((event.target as HTMLInputElement).checked) copy.add(id);
    else copy.delete(id);
    this.selected.set(copy);
  }

  canSend(item: SignatureCenterItem): boolean {
    return this.canRequest() && item.envelope.status === 'draft';
  }

  canRemind(item: SignatureCenterItem): boolean {
    if (!this.canRequest() || !['pending', 'viewed'].includes(item.envelope.status)) return false;
    const now = Date.now();
    const last = item.lastReminderAtUtc || item.envelope.requestedAtUtc;
    return item.reminderCount < 3 && Boolean(last) && now - Date.parse(last!) >= 24 * 3600 * 1000
      && (!item.expiresAtUtc || Date.parse(item.expiresAtUtc) > now);
  }

  routeTo(item: SignatureCenterItem): string {
    return item.envelope.sourceType === 'attendance'
      ? `/signatures/attendance/${item.envelope.id}` : `/signatures/${item.envelope.id}`;
  }

  async downloadArchive(id: string, manifest = false): Promise<void> {
    if (this.mutating()) return;
    const row = this.data().items.find(x => x.envelope.id === id);
    if (!row || !['signed', 'declined'].includes(row.envelope.status)) return;
    const organization = this.session.session()?.organizationId ?? '';
    this.mutating.set(true);
    try {
      const blob = await firstValueFrom(this.api.archivedDocument(id, manifest));
      if (organization !== (this.session.session()?.organizationId ?? '')) return;
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = `pedagora-attestation-${id}.${manifest ? 'json' : 'pdf'}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch { this.notifications.error('signatures.center.archiveError', '/signatures/centre'); }
    finally { this.mutating.set(false); }
  }

  async sendSelected(): Promise<void> {
    if (!this.canRequest() || this.mutating()) return;
    const ids = this.data().items.filter(i => this.selected().has(i.envelope.id) && this.canSend(i)).map(i => i.envelope.id);
    if (!ids.length || ids.length > 50 || ids.length !== this.selected().size) return;
    this.mutating.set(true);
    try {
      await firstValueFrom(this.api.requestBatch(ids));
      await this.load();
    } catch { this.notifications.error('signatures.center.sendError', '/signatures/centre'); }
    finally { this.mutating.set(false); }
  }

  async remind(id: string): Promise<void> {
    const item = this.data().items.find(i => i.envelope.id === id);
    if (!item || !this.canRemind(item) || this.mutating()) return;
    this.mutating.set(true);
    try { await firstValueFrom(this.api.remind(id)); await this.load(); }
    catch { this.notifications.error('signatures.center.remindError', '/signatures/centre'); }
    finally { this.mutating.set(false); }
  }

  async loadDaily(): Promise<void> {
    if (!this.canRequest() || this.mutating()) return;
    const org = this.session.session()?.organizationId ?? '';
    this.daily.set([]); this.selectedDaily.set(new Set());
    const generation = ++this.dailyGeneration;
    const date = this.date();
    this.mutating.set(true);
    try {
      const items = await this.getCandidates();
      if (generation === this.dailyGeneration && date === this.date()
          && org === this.session.session()?.organizationId)
        this.daily.set(Array.isArray(items) ? items : []);
    } catch { this.notifications.error('signatures.center.dailyError', '/signatures/centre'); }
    finally { this.mutating.set(false); }
  }

  toggleDaily(id: string, event: Event): void {
    const selected = new Set(this.selectedDaily());
    if ((event.target as HTMLInputElement).checked) selected.add(id);
    else selected.delete(id);
    this.selectedDaily.set(selected);
  }

  readonly dailyGroups = computed(() => {
    const groups = new Map<string, { enrollmentId: string; name: string; ids: string[] }>();
    for (const row of this.daily()) {
      if (!this.selectedDaily().has(row.sourceId)) continue;
      const group = groups.get(row.enrollmentId) ?? { enrollmentId: row.enrollmentId, name: row.learnerName, ids: [] };
      group.ids.push(row.sourceId);
      groups.set(row.enrollmentId, group);
    }
    return [...groups.values()];
  });

  async sendDailyRecaps(): Promise<void> {
    if (!this.canRequest() || this.mutating() || !this.dailyGroups().length) return;
    const org = this.session.session()?.organizationId ?? '';
    this.mutating.set(true);
    let success = 0;
    let errors = 0;
    const failedIds = new Set<string>();
    try {
      // One immutable envelope PER trainee, potentially containing several observations.
      // Individual failures do not undo successful envelopes for other trainees.
      for (const group of this.dailyGroups()) {
        if (org !== this.session.session()?.organizationId) break;
        try {
          const draft: SignatureEnvelope = await firstValueFrom(this.api.createDailySummary({
            enrollmentId: group.enrollmentId, date: this.date(), evaluationIds: group.ids,
          }));
          await firstValueFrom(this.api.requestObservation(draft.id));
          success++;
        } catch { errors++; group.ids.forEach(id => failedIds.add(id)); }
      }
      this.selectedDaily.set(failedIds);
      if (!errors) this.daily.set([]);
      await this.load();
      if (errors) this.notifications.error('signatures.center.partialError', '/signatures/centre');
    } finally { this.mutating.set(false); }
    // Counts remain observable in the signature center; no delivery confirmation is implied.
    void success;
  }

  updateDate(event: Event): void {
    this.date.set((event.target as HTMLInputElement).value);
    this.dailyGeneration++;
    this.daily.set([]); this.selectedDaily.set(new Set());
  }
}
