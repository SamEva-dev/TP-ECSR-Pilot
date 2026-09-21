import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";

type DocumentCategory =
  | "administrative"
  | "pedagogical"
  | "evaluation"
  | "course"
  | "internship"
  | "student";

type DocumentVisibility = "all" | "staff" | "student";
type DocumentFormat = "PDF" | "DOCX";

interface LibraryDocument {
  id: string;
  title: string;
  date: string;
  author: string;
  size: string;
  category: DocumentCategory;
  ownerStudentId?: string;
  ownerName?: string;
  visibleToStudent?: boolean;
  fileName: string;
  format: DocumentFormat;
  version: string;
  pages: number;
  visibility: DocumentVisibility;
  descriptionKey: string;
}

const DOCUMENTS: LibraryDocument[] = [
  {
    id: "d1",
    title: "Convention de stage — Sam Fokam",
    date: "28/05/2026",
    author: "Secrétariat",
    size: "182 Ko",
    category: "internship",
    ownerStudentId: "s1",
    ownerName: "Sam Fokam",
    visibleToStudent: true,
    fileName: "convention-stage-sam-fokam.pdf",
    format: "PDF",
    version: "1.0",
    pages: 4,
    visibility: "student",
    descriptionKey: "documents.descriptions.internshipAgreement",
  },
  {
    id: "d2",
    title: "Référentiel REMC 2026",
    date: "01/09/2026",
    author: "Claire Berthier",
    size: "1,4 Mo",
    category: "pedagogical",
    visibleToStudent: true,
    fileName: "referentiel-remc-2026.pdf",
    format: "PDF",
    version: "2026.1",
    pages: 86,
    visibility: "all",
    descriptionKey: "documents.descriptions.remc",
  },
  {
    id: "d3",
    title: "Grille évaluation conduite",
    date: "04/09/2026",
    author: "Marc Dupont",
    size: "96 Ko",
    category: "evaluation",
    visibleToStudent: true,
    fileName: "grille-evaluation-conduite.pdf",
    format: "PDF",
    version: "2.1",
    pages: 2,
    visibility: "all",
    descriptionKey: "documents.descriptions.drivingEvaluation",
  },
  {
    id: "d4",
    title: "Support — Les intersections",
    date: "18/09/2026",
    author: "Yanis Morel",
    size: "3,2 Mo",
    category: "course",
    visibleToStudent: true,
    fileName: "support-intersections.pdf",
    format: "PDF",
    version: "1.2",
    pages: 22,
    visibility: "all",
    descriptionKey: "documents.descriptions.intersections",
  },
  {
    id: "d5",
    title: "Règlement intérieur du centre",
    date: "25/08/2026",
    author: "Direction",
    size: "240 Ko",
    category: "administrative",
    visibleToStudent: true,
    fileName: "reglement-interieur.pdf",
    format: "PDF",
    version: "2026.1",
    pages: 12,
    visibility: "all",
    descriptionKey: "documents.descriptions.rules",
  },
  {
    id: "d6",
    title: "Attestation d'assiduité — Julie Moreau",
    date: "15/09/2026",
    author: "Secrétariat",
    size: "78 Ko",
    category: "student",
    ownerStudentId: "s2",
    ownerName: "Julie Moreau",
    fileName: "attestation-assiduite-julie-moreau.pdf",
    format: "PDF",
    version: "1.0",
    pages: 1,
    visibility: "student",
    descriptionKey: "documents.descriptions.attendanceCertificate",
  },
  {
    id: "d7",
    title: "Support — Méthode interrogative",
    date: "10/09/2026",
    author: "Claire Berthier",
    size: "2,1 Mo",
    category: "course",
    visibleToStudent: true,
    fileName: "methode-interrogative.docx",
    format: "DOCX",
    version: "3.0",
    pages: 18,
    visibility: "all",
    descriptionKey: "documents.descriptions.interrogativeMethod",
  },
  {
    id: "d8",
    title: "Bilan de stage — Julie Moreau",
    date: "18/07/2026",
    author: "Paul Nguyen",
    size: "310 Ko",
    category: "evaluation",
    ownerStudentId: "s2",
    ownerName: "Julie Moreau",
    fileName: "bilan-stage-julie-moreau.pdf",
    format: "PDF",
    version: "1.0",
    pages: 5,
    visibility: "staff",
    descriptionKey: "documents.descriptions.internshipAssessment",
  },
];

@Component({
  selector: "app-documents",
  imports: [TranslatePipe],
  templateUrl: "./documents.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsComponent {
  readonly sessionService = inject(SessionService);
  readonly contextData = inject(ContextualTrainingDataService);
  readonly search = signal("");
  readonly category = signal<"all" | DocumentCategory>("all");
  readonly selectedDocument = signal<LibraryDocument | null>(null);

  readonly role = this.sessionService.role;
  readonly contextualDocuments = computed<LibraryDocument[]>(() => {
    const program = this.contextData.program();
    const referential = this.contextData.referential();
    if (!program || program.id === "program-ecsr") return DOCUMENTS;
    return DOCUMENTS.map((doc) => {
      if (doc.id === "d2") {
        return {
          ...doc,
          title: `Référentiel ${program.name} — ${referential?.version ?? "actif"}`,
          fileName: `referentiel-${program.code.toLowerCase()}.pdf`,
        };
      }
      if (doc.id === "d3") return { ...doc, title: `Grille évaluation — ${program.name}` };
      if (doc.id === "d4") return { ...doc, title: `Support — ${program.name}` };
      return doc;
    });
  });

  readonly canImport = computed(() => this.role() !== "stagiaire");
  readonly canManageDocument = computed(
    () => this.role() === "direction" || this.role() === "secretariat",
  );

  readonly visibleDocuments = computed(() => {
    const role = this.role();
    if (role === "stagiaire") {
      return this.contextualDocuments().filter(
        (d) => d.ownerStudentId === "s1" || d.visibleToStudent === true,
      );
    }
    if (role === "formateur") {
      return this.contextualDocuments().filter(
        (d) => d.category !== "administrative" || d.visibleToStudent === true,
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
        `${doc.title} ${doc.author} ${doc.fileName}`
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
  });

  readonly categories = computed(() => {
    const docs = this.visibleDocuments();
    const count = (category: DocumentCategory) =>
      docs.filter((d) => d.category === category).length;
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
    ].filter((item) => item.key === "all" || item.count > 0);
  });

  titleKey() {
    return this.role() === "stagiaire"
      ? "documents.studentTitle"
      : this.role() === "formateur"
        ? "documents.trainerTitle"
        : "documents.title";
  }

  subtitleKey() {
    return this.role() === "stagiaire"
      ? "documents.studentSubtitle"
      : this.role() === "formateur"
        ? "documents.trainerSubtitle"
        : "documents.subtitle";
  }

  setSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setCategory(category: "all" | DocumentCategory) {
    this.category.set(category);
  }

  categoryLabelKey(category: DocumentCategory) {
    return `documents.categories.${category}`;
  }

  visibilityLabelKey(visibility: DocumentVisibility) {
    return `documents.visibility.${visibility}`;
  }

  openPreview(doc: LibraryDocument) {
    this.selectedDocument.set(doc);
  }

  closePreview() {
    this.selectedDocument.set(null);
  }

  @HostListener("document:keydown.escape")
  onEscape() {
    if (this.selectedDocument()) {
      this.closePreview();
    }
  }
}
