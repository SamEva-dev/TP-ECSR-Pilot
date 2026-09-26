import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslateService } from '../../../core/i18n/translate.service';
import { LearningApiService } from '../../../core/learning/learning-api.service';
import type { PedagogicalTopicDto } from '../../../core/learning/learning.models';
import { ApplicationNotificationService } from '../../../core/notifications/application-notification.service';
import { WorkspaceContextService } from '../../../core/workspace/workspace-context.service';

type SheetCategory = 'rules' | 'risk' | 'vehicle' | 'pedagogy' | 'exam' | 'mobility';

interface SheetCatalogItem {
  id: string;
  code: string;
  number: number;
  customTitle: string;
  category: SheetCategory;
  durationMinutes: number;
  active: boolean;
  reference: string;
  customObjective: string;
  customExample: string;
  customCorrection: string;
  custom: boolean;
}

interface SheetDraft {
  id?: string;
  number: number;
  title: string;
  category: SheetCategory;
  durationMinutes: number;
  active: boolean;
  reference: string;
  objective: string;
  example: string;
  correction: string;
}

const SHEET_CATEGORIES: readonly SheetCategory[] = ['rules', 'risk', 'vehicle', 'pedagogy', 'exam', 'mobility'];

@Component({
  selector: 'app-sheets-configuration',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './sheets-configuration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetsConfigurationComponent {
  private readonly translate = inject(TranslateService);
  private readonly api = inject(LearningApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly notifications = inject(ApplicationNotificationService);
  private loadSequence = 0;

  readonly categories = SHEET_CATEGORIES;
  readonly items = signal<SheetCatalogItem[]>([]);
  readonly query = signal('');
  readonly categoryFilter = signal<'all' | SheetCategory>('all');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly editorOpen = signal(false);
  readonly viewerOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly editing = signal(false);
  readonly selected = signal<SheetCatalogItem | null>(null);
  readonly pendingDelete = signal<SheetCatalogItem | null>(null);
  readonly duplicateNumber = signal(false);
  private readonly referentialVersionId = computed(() => String(this.workspace.cohort()?.referentialVersionId ?? ''));

  draft: SheetDraft = this.emptyDraft();

  readonly filteredItems = computed(() => {
    const q = this.query().trim().toLocaleLowerCase(this.translate.locale());
    const category = this.categoryFilter();
    const status = this.statusFilter();

    return this.items().filter((item) => {
      const title = this.titleOf(item).toLocaleLowerCase(this.translate.locale());
      const matchesQuery = !q || title.includes(q) || String(item.number).includes(q) || item.reference.toLocaleLowerCase().includes(q);
      const matchesCategory = category === 'all' || item.category === category;
      const matchesStatus = status === 'all' || (status === 'active' ? item.active : !item.active);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  });

  readonly activeCount = computed(() => this.items().filter((item) => item.active).length);
  readonly inactiveCount = computed(() => this.items().length - this.activeCount());
  readonly customCount = computed(() => this.items().filter((item) => item.custom).length);

  constructor() {
    effect(() => {
      const referentialVersionId = this.referentialVersionId();
      void this.reload(referentialVersionId, true);
    });
  }

  updateQuery(event: Event): void { this.query.set((event.target as HTMLInputElement).value ?? ''); }
  updateCategory(event: Event): void { this.categoryFilter.set(((event.target as HTMLSelectElement).value || 'all') as 'all' | SheetCategory); }
  updateStatus(event: Event): void { this.statusFilter.set(((event.target as HTMLSelectElement).value || 'all') as 'all' | 'active' | 'inactive'); }

  titleOf(item: SheetCatalogItem): string { return item.customTitle ?? ''; }
  categoryKey(category: SheetCategory): string { return `sheetConfig.categories.${category}`; }

  categoryClasses(category: SheetCategory): string {
    const classes: Record<SheetCategory, string> = {
      rules: 'bg-[#e6f2ff] text-[#2a64a2]',
      risk: 'bg-[#fff0c9] text-[#8b5e00]',
      vehicle: 'bg-[#e7f7ed] text-[#188447]',
      pedagogy: 'bg-[#f0eaff] text-[#7652b5]',
      exam: 'bg-[#ffe8e4] text-[#c94738]',
      mobility: 'bg-[#e8f7f5] text-[#287e74]',
    };
    return classes[category];
  }

  openCreate(): void {
    this.editing.set(false);
    this.duplicateNumber.set(false);
    this.draft = this.emptyDraft();
    this.editorOpen.set(true);
  }

  openEdit(item: SheetCatalogItem): void {
    this.editing.set(true);
    this.duplicateNumber.set(false);
    this.draft = {
      id: item.id,
      number: item.number,
      title: this.titleOf(item),
      category: item.category,
      durationMinutes: item.durationMinutes,
      active: item.active,
      reference: item.reference,
      objective: item.customObjective,
      example: item.customExample,
      correction: item.customCorrection,
    };
    this.editorOpen.set(true);
  }

  closeEditor(): void { this.editorOpen.set(false); this.duplicateNumber.set(false); }

  async saveDraft(): Promise<void> {
    const referentialVersionId = this.referentialVersionId();
    const title = (this.draft.title ?? '').trim();
    if (!referentialVersionId || !title || (this.draft.number ?? 0) < 1 || (this.draft.durationMinutes ?? 0) < 1) return;

    const duplicate = this.items().some((item) => item.number === this.draft.number && item.id !== this.draft.id);
    this.duplicateNumber.set(duplicate);
    if (duplicate) return;

    const body = {
      number: this.draft.number ?? 0,
      title,
      category: this.draft.category ?? 'rules',
      durationMinutes: this.draft.durationMinutes ?? 0,
      active: !!this.draft.active,
      reference: (this.draft.reference ?? '').trim(),
      objective: (this.draft.objective ?? '').trim(),
      example: (this.draft.example ?? '').trim(),
      correction: (this.draft.correction ?? '').trim(),
    };

    try {
      if (this.draft.id) await firstValueFrom(this.api.updateTopicCatalog(referentialVersionId, this.draft.id, body));
      else await firstValueFrom(this.api.createTopic(referentialVersionId, body));
      await this.reload(referentialVersionId, true);
      this.editorOpen.set(false);
      this.duplicateNumber.set(false);
    } catch {
      this.notifications.error('sheetConfig.api.saveError', '/administration/fiches');
    }
  }

  openView(item: SheetCatalogItem): void { this.selected.set(item); this.viewerOpen.set(true); }
  closeView(): void { this.viewerOpen.set(false); this.selected.set(null); }
  editFromView(): void { const item = this.selected(); if (!item) return; this.closeView(); this.openEdit(item); }
  requestDelete(item: SheetCatalogItem): void { this.pendingDelete.set(item); this.deleteOpen.set(true); }
  cancelDelete(): void { this.deleteOpen.set(false); this.pendingDelete.set(null); }

  async confirmDelete(): Promise<void> {
    const item = this.pendingDelete();
    const referentialVersionId = this.referentialVersionId();
    if (!item || !referentialVersionId) return;
    try {
      await firstValueFrom(this.api.deleteTopic(referentialVersionId, item.id));
      await this.reload(referentialVersionId, true);
      this.cancelDelete();
    } catch {
      this.notifications.error('sheetConfig.api.deleteError', '/administration/fiches');
    }
  }

  async toggleActive(item: SheetCatalogItem): Promise<void> {
    const referentialVersionId = this.referentialVersionId();
    if (!referentialVersionId) return;
    try {
      await firstValueFrom(this.api.updateTopicCatalog(referentialVersionId, item.id, {
        number: item.number, title: item.customTitle, category: item.category, durationMinutes: item.durationMinutes,
        active: !item.active, reference: item.reference, objective: item.customObjective, example: item.customExample, correction: item.customCorrection,
      }));
      await this.reload(referentialVersionId, true);
    } catch {
      this.notifications.error('sheetConfig.api.saveError', '/administration/fiches');
    }
  }

  resetDefaults(): void { void this.reload(this.referentialVersionId(), true); }
  objectiveOf(item: SheetCatalogItem): string { return item.customObjective ?? ''; }
  exampleOf(item: SheetCatalogItem): string { return item.customExample ?? ''; }
  correctionOf(item: SheetCatalogItem): string { return item.customCorrection ?? ''; }

  private emptyDraft(): SheetDraft {
    const nextNumber = Math.max(0, ...this.items().map((item) => item.number ?? 0)) + 1;
    return { number: nextNumber, title: '', category: 'rules', durationMinutes: 0, active: true, reference: '', objective: '', example: '', correction: '' };
  }

  private async reload(referentialVersionId: string, notify: boolean): Promise<void> {
    const seq = ++this.loadSequence;
    if (!referentialVersionId) { this.items.set([]); return; }
    try {
      const rows = await firstValueFrom(this.api.getTopicCatalog(referentialVersionId));
      if (seq !== this.loadSequence) return;
      this.items.set((rows ?? []).map((row) => this.mapTopic(row)).sort((a, b) => a.number - b.number));
    } catch {
      if (seq !== this.loadSequence) return;
      this.items.set([]);
      if (notify) this.notifications.error('sheetConfig.api.loadError', '/administration/fiches');
    }
  }

  private mapTopic(row: PedagogicalTopicDto): SheetCatalogItem {
    const code = String(row?.code ?? '');
    return {
      id: String(row?.id ?? ''),
      code,
      number: Number(row?.number ?? 0),
      customTitle: String(row?.title ?? ''),
      category: this.normalizeCategory(row?.category),
      durationMinutes: Number(row?.durationMinutes ?? 0),
      active: !!row?.active,
      reference: String(row?.reference ?? ''),
      customObjective: String(row?.objective ?? ''),
      customExample: String(row?.example ?? ''),
      customCorrection: String(row?.correction ?? ''),
      custom: code.toUpperCase().startsWith('SHEET-'),
    };
  }

  private normalizeCategory(value: string | null | undefined): SheetCategory {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (SHEET_CATEGORIES.includes(normalized as SheetCategory)) return normalized as SheetCategory;
    if (normalized.includes('risk')) return 'risk';
    if (normalized.includes('vehic')) return 'vehicle';
    if (normalized.includes('pedag') || normalized.includes('remc')) return 'pedagogy';
    if (normalized.includes('exam') || normalized.includes('certif')) return 'exam';
    if (normalized.includes('mobil')) return 'mobility';
    return 'rules';
  }
}
