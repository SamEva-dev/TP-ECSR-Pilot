import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  DocumentApiStoreService,
  type DocumentLibraryCategory,
  type DocumentLibraryItem,
  type DocumentLibraryVisibility,
} from "../../core/api-data/document-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";

@Component({
  selector: "app-documents",
  imports: [TranslatePipe],
  templateUrl: "./documents.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsComponent {
  readonly sessionService = inject(SessionService);
  readonly store = inject(DocumentApiStoreService);
  readonly search = signal("");
  readonly category = signal<"all" | DocumentLibraryCategory>("all");
  readonly selectedDocument = signal<DocumentLibraryItem | null>(null);

  readonly role = this.sessionService.role;
  readonly contextualDocuments = computed<DocumentLibraryItem[]>(() => this.store.documents());

  readonly canImport = computed(() => this.role() !== "stagiaire");
  readonly canManageDocument = computed(
    () => this.role() === "direction" || this.role() === "secretariat",
  );

  readonly visibleDocuments = computed(() => {
    const role = this.role();
    if (role === "stagiaire") return this.contextualDocuments();
    if (role === "formateur") {
      return this.contextualDocuments().filter(
        (document) => document.category !== "administrative" || document.visibleToStudent,
      );
    }
    return this.contextualDocuments();
  });

  readonly filteredDocuments = computed(() => {
    const query = this.search().trim().toLowerCase();
    const category = this.category();
    return this.visibleDocuments().filter((doc) => {
      const matchesCategory = category === "all" || doc.category === category;
      const matchesSearch =
        !query ||
        `${doc.title ?? ""} ${doc.author ?? ""} ${doc.fileName ?? ""}`
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
  });

  readonly categories = computed(() => {
    const docs = this.visibleDocuments();
    const count = (category: DocumentLibraryCategory) =>
      docs.filter((document) => document.category === category).length;
    return [
      {
        key: "all" as const,
        labelKey: "documents.categories.all",
        count: docs.length,
      },
      {
        key: "administrative" as const,
        labelKey: "documents.categories.administrative",
        count: count("administrative"),
      },
      {
        key: "pedagogical" as const,
        labelKey: "documents.categories.pedagogical",
        count: count("pedagogical"),
      },
      {
        key: "evaluation" as const,
        labelKey: "documents.categories.evaluation",
        count: count("evaluation"),
      },
      {
        key: "course" as const,
        labelKey: "documents.categories.course",
        count: count("course"),
      },
      {
        key: "internship" as const,
        labelKey: "documents.categories.internship",
        count: count("internship"),
      },
      {
        key: "student" as const,
        labelKey: "documents.categories.student",
        count: count("student"),
      },
      {
        key: "certification" as const,
        labelKey: "documents.categories.certification",
        count: count("certification"),
      },
      {
        key: "other" as const,
        labelKey: "documents.categories.other",
        count: count("other"),
      },
    ].filter((item) => item.key === "all" || item.count > 0);
  });

  titleKey(): string {
    return this.role() === "stagiaire"
      ? "documents.studentTitle"
      : this.role() === "formateur"
        ? "documents.trainerTitle"
        : "documents.title";
  }

  subtitleKey(): string {
    return this.role() === "stagiaire"
      ? "documents.studentSubtitle"
      : this.role() === "formateur"
        ? "documents.trainerSubtitle"
        : "documents.subtitle";
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement | null)?.value ?? "");
  }

  setCategory(category: "all" | DocumentLibraryCategory): void {
    this.category.set(category);
  }

  categoryLabelKey(category: DocumentLibraryCategory): string {
    return `documents.categories.${category}`;
  }

  visibilityLabelKey(visibility: DocumentLibraryVisibility): string {
    return `documents.visibility.${visibility}`;
  }

  openPreview(doc: DocumentLibraryItem): void {
    this.selectedDocument.set(doc);
  }

  closePreview(): void {
    this.selectedDocument.set(null);
  }

  async importDocument(): Promise<void> {
    await this.store.importFile();
  }

  async downloadDocument(doc: DocumentLibraryItem): Promise<void> {
    await this.store.download(doc);
  }

  async replaceDocument(doc: DocumentLibraryItem): Promise<void> {
    const updated = await this.store.replace(doc);
    if (updated) this.selectedDocument.set(updated);
  }

  async deleteDocument(doc: DocumentLibraryItem): Promise<void> {
    if (await this.store.delete(doc)) this.closePreview();
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.selectedDocument()) this.closePreview();
  }
}
