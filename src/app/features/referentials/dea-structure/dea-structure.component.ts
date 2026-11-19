import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { DEA_SECTIONS, type DeaSection, type DeaStructureDocument, deaSectionProperty } from './dea-structure.models';

/** Presentation and draft editing only. Parent must supply data loaded from GET and persist via PUT. */
@Component({
  selector: 'app-dea-structure',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './dea-structure.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeaStructureComponent {
  @Input({ required: true }) versionId = '';
  @Input() isDraft = false;
  @Input() canManage = false;
  @Input() busy = false;
  @Input() errorKey = '';
  @Output() saveRequested = new EventEmitter<DeaStructureDocument>();
  @Output() refreshRequested = new EventEmitter<void>();

  readonly sections = DEA_SECTIONS;
  readonly activeSection = signal<DeaSection>('blocks');
  readonly source = signal<DeaStructureDocument | null>(null);
  readonly updatedAt = signal('');
  readonly editing = signal(false);
  readonly editor = signal('');
  readonly validationError = signal('');
  readonly sectionRows = computed(() => this.source()?.[deaSectionProperty(this.activeSection())] ?? []);

  @Input() set document(value: DeaStructureDocument | null) {
    this.source.set(value ? structuredClone(value) : null);
    this.editing.set(false);
    this.validationError.set('');
  }
  @Input() set lastUpdatedAt(value: string | null) { this.updatedAt.set(value ?? ''); }

  selectSection(section: DeaSection): void {
    this.activeSection.set(section);
    this.editing.set(false);
    this.validationError.set('');
  }
  startEdit(): void {
    if (!this.isDraft || !this.canManage || !this.source() || this.busy) return;
    this.editor.set(JSON.stringify(this.sectionRows(), null, 2));
    this.validationError.set('');
    this.editing.set(true);
  }
  cancel(): void { this.editing.set(false); this.validationError.set(''); }
  submit(): void {
    const source = this.source();
    if (!source || !this.editing() || !this.isDraft || !this.canManage || this.busy) return;
    try {
      const rows: unknown = JSON.parse(this.editor());
      if (!Array.isArray(rows) || rows.some(row => row === null || typeof row !== 'object' || Array.isArray(row))) {
        this.validationError.set('qa41b4.errors.invalidArray');
        return;
      }
      // The backend validates the entire document, including cross-section references.
      const proposed: DeaStructureDocument = structuredClone(source);
      const key = deaSectionProperty(this.activeSection());
      proposed[key] = rows;
      this.validationError.set('');
      this.saveRequested.emit(proposed);
    } catch {
      this.validationError.set('qa41b4.errors.invalidJson');
    }
  }
  readonly trackRow = (index: number): number => index;
  stringify(row: unknown): string { return JSON.stringify(row, null, 2); }
}
