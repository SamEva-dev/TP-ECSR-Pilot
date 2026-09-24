import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { TranslateService } from "../../../core/i18n/translate.service";
import { DEFAULT_SHEET_CATALOG, SHEET_CATEGORIES } from "../../../core/api-data/runtime-data.store";
import type { SheetCatalogItem, SheetCategory } from "../../../core/models/sheet-catalog.models";

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

@Component({
  selector: "app-sheets-configuration",
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: "./sheets-configuration.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetsConfigurationComponent {
  private readonly translate = inject(TranslateService);
  private readonly storageKey = "tp-ecsr-pilot.sheet-catalog";

  readonly categories = SHEET_CATEGORIES;
  readonly items = signal<SheetCatalogItem[]>(this.loadCatalog());
  readonly query = signal("");
  readonly categoryFilter = signal<"all" | SheetCategory>("all");
  readonly statusFilter = signal<"all" | "active" | "inactive">("all");
  readonly editorOpen = signal(false);
  readonly viewerOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly editing = signal(false);
  readonly selected = signal<SheetCatalogItem | null>(null);
  readonly pendingDelete = signal<SheetCatalogItem | null>(null);
  readonly duplicateNumber = signal(false);

  draft: SheetDraft = this.emptyDraft();

  readonly filteredItems = computed(() => {
    const q = this.query().trim().toLocaleLowerCase(this.translate.locale());
    const category = this.categoryFilter();
    const status = this.statusFilter();

    return this.items().filter((item) => {
      const title = this.titleOf(item).toLocaleLowerCase(
        this.translate.locale(),
      );
      const matchesQuery =
        !q ||
        title.includes(q) ||
        String(item.number).includes(q) ||
        (item.reference ?? "").toLocaleLowerCase().includes(q);
      const matchesCategory = category === "all" || item.category === category;
      const matchesStatus =
        status === "all" || (status === "active" ? item.active : !item.active);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  });

  readonly activeCount = computed(
    () => this.items().filter((item) => item.active).length,
  );
  readonly inactiveCount = computed(
    () => this.items().length - this.activeCount(),
  );
  readonly customCount = computed(
    () => this.items().filter((item) => !!item.customTitle).length,
  );

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  updateCategory(event: Event): void {
    this.categoryFilter.set(
      (event.target as HTMLSelectElement).value as "all" | SheetCategory,
    );
  }

  updateStatus(event: Event): void {
    this.statusFilter.set(
      (event.target as HTMLSelectElement).value as
        "all" | "active" | "inactive",
    );
  }

  titleOf(item: SheetCatalogItem): string {
    return (
      item.customTitle ??
      (item.titleKey ? this.translate.instant(item.titleKey) : "")
    );
  }

  categoryKey(category: SheetCategory): string {
    return `sheetConfig.categories.${category}`;
  }

  categoryClasses(category: SheetCategory): string {
    const classes: Record<SheetCategory, string> = {
      rules: "bg-[#e6f2ff] text-[#2a64a2]",
      risk: "bg-[#fff0c9] text-[#8b5e00]",
      vehicle: "bg-[#e7f7ed] text-[#188447]",
      pedagogy: "bg-[#f0eaff] text-[#7652b5]",
      exam: "bg-[#ffe8e4] text-[#c94738]",
      mobility: "bg-[#e8f7f5] text-[#287e74]",
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
      reference: item.reference ?? "",
      objective: item.customObjective ?? "",
      example: item.customExample ?? "",
      correction: item.customCorrection ?? "",
    };
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.duplicateNumber.set(false);
  }

  saveDraft(): void {
    const title = this.draft.title.trim();
    if (!title || this.draft.number < 1) return;

    const duplicate = this.items().some(
      (item) => item.number === this.draft.number && item.id !== this.draft.id,
    );
    this.duplicateNumber.set(duplicate);
    if (duplicate) return;

    const current = this.draft.id
      ? this.items().find((item) => item.id === this.draft.id)
      : undefined;
    const next: SheetCatalogItem = {
      id: current?.id ?? `custom-${Date.now()}`,
      number: this.draft.number,
      customTitle: title,
      category: this.draft.category,
      durationMinutes: Math.max(1, this.draft.durationMinutes || 40),
      active: this.draft.active,
      reference: this.draft.reference.trim() || undefined,
      customObjective: this.draft.objective.trim() || undefined,
      customExample: this.draft.example.trim() || undefined,
      customCorrection: this.draft.correction.trim() || undefined,
    };

    const updated = current
      ? this.items().map((item) => (item.id === current.id ? next : item))
      : [...this.items(), next];

    this.setItems(updated);
    this.editorOpen.set(false);
  }

  openView(item: SheetCatalogItem): void {
    this.selected.set(item);
    this.viewerOpen.set(true);
  }

  closeView(): void {
    this.viewerOpen.set(false);
    this.selected.set(null);
  }

  editFromView(): void {
    const item = this.selected();
    if (!item) return;
    this.closeView();
    this.openEdit(item);
  }

  requestDelete(item: SheetCatalogItem): void {
    this.pendingDelete.set(item);
    this.deleteOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteOpen.set(false);
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const item = this.pendingDelete();
    if (!item) return;
    this.setItems(this.items().filter((entry) => entry.id !== item.id));
    this.cancelDelete();
  }

  toggleActive(item: SheetCatalogItem): void {
    this.setItems(
      this.items().map((entry) =>
        entry.id === item.id ? { ...entry, active: !entry.active } : entry,
      ),
    );
  }

  resetDefaults(): void {
    this.setItems(DEFAULT_SHEET_CATALOG.map((item) => ({ ...item })));
  }

  objectiveOf(item: SheetCatalogItem): string {
    return (
      item.customObjective ||
      this.translate.instant("sheetConfig.viewer.defaultObjective", {
        title: this.titleOf(item),
      })
    );
  }

  exampleOf(item: SheetCatalogItem): string {
    return (
      item.customExample ||
      this.translate.instant("sheetConfig.viewer.defaultExample", {
        title: this.titleOf(item),
      })
    );
  }

  correctionOf(item: SheetCatalogItem): string {
    return (
      item.customCorrection ||
      this.translate.instant("sheetConfig.viewer.defaultCorrection", {
        title: this.titleOf(item),
      })
    );
  }

  private emptyDraft(): SheetDraft {
    const nextNumber = this.items
      ? Math.max(0, ...this.items().map((item) => item.number)) + 1
      : 59;
    return {
      number: nextNumber,
      title: "",
      category: "rules",
      durationMinutes: 40,
      active: true,
      reference: "",
      objective: "",
      example: "",
      correction: "",
    };
  }

  private setItems(items: SheetCatalogItem[]): void {
    const sorted = [...items].sort((a, b) => a.number - b.number);
    this.items.set(sorted);
    localStorage.setItem(this.storageKey, JSON.stringify(sorted));
  }

  private loadCatalog(): SheetCatalogItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as SheetCatalogItem[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {
      // Keep demo defaults if local data is invalid.
    }
    return DEFAULT_SHEET_CATALOG.map((item) => ({ ...item }));
  }
}
