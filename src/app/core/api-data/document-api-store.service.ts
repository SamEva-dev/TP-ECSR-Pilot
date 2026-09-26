import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import type { ApiDocumentCategory, ApiDocumentVisibility, DocumentDto } from "../documents/document.models";
import { DocumentApiService } from "../documents/document-api.service";
import { TranslateService } from "../i18n/translate.service";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { SessionService } from "../session/session.service";
import { ContextualTrainingDataService } from "../workspace/contextual-training-data.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

export type DocumentLibraryCategory = ApiDocumentCategory;
export type DocumentLibraryVisibility = ApiDocumentVisibility;

export interface DocumentLibraryItem {
  id: string;
  title: string;
  date: string;
  author: string;
  size: string;
  category: DocumentLibraryCategory;
  ownerStudentId?: string;
  ownerName?: string;
  visibleToStudent: boolean;
  fileName: string;
  format: string;
  version: string;
  pages: number;
  visibility: DocumentLibraryVisibility;
  descriptionKey: string;
  source: DocumentDto;
}

@Injectable({ providedIn: "root" })
export class DocumentApiStoreService {
  private readonly api = inject(DocumentApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly contextData = inject(ContextualTrainingDataService);
  private readonly session = inject(SessionService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly realtime = inject(RealtimeService);
  private readonly translate = inject(TranslateService);

  private readonly rowsSignal = signal<DocumentDto[]>([]);
  readonly loading = signal(false);
  readonly mutating = signal(false);
  readonly loadError = signal(false);
  private generation = 0;
  private request = 0;

  readonly documents = computed<DocumentLibraryItem[]>(() => {
    const siteId = this.text(this.workspace.site()?.apiId);
    const programId = this.text(this.workspace.program()?.apiId);
    const cohortId = this.text(this.workspace.cohort()?.apiId);
    return this.rowsSignal()
      .filter((row) => !row.siteId || !siteId || row.siteId === siteId)
      .filter((row) => !row.programId || !programId || row.programId === programId)
      .filter((row) => !row.cohortId || !cohortId || row.cohortId === cohortId)
      .map((row) => this.toLibraryItem(row));
  });

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      this.workspace.selection();
      const generation = ++this.generation;
      this.rowsSignal.set([]);
      this.loadError.set(false);
      if (ready) void this.reload(generation);
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.document\./.test(event.typeKey)) return;
      untracked(() => void this.reload(this.generation, false));
    });
  }

  async reload(generation = this.generation, notify = true): Promise<boolean> {
    const request = ++this.request;
    this.loading.set(true);
    try {
      const rows = await this.api.list();
      if (generation !== this.generation || request !== this.request) return false;
      this.rowsSignal.set((Array.isArray(rows) ? rows : []).map((row) => this.normalize(row)));
      this.loadError.set(false);
      return true;
    } catch {
      if (generation === this.generation && request === this.request) {
        this.rowsSignal.set([]);
        this.loadError.set(true);
        if (notify) this.notifications.error("documents.real.loadError", "/documents");
      }
      return false;
    } finally {
      if (generation === this.generation && request === this.request) this.loading.set(false);
    }
  }

  async importFile(): Promise<boolean> {
    const file = await this.pickFile();
    if (!file) return false;
    if (this.mutating()) return false;

    const form = this.buildUploadForm(file);
    this.mutating.set(true);
    try {
      const created = this.normalize(await this.api.upload(form));
      this.rowsSignal.update((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      await this.reload(this.generation, false);
      return true;
    } catch {
      this.notifications.error("documents.real.uploadError", "/documents");
      return false;
    } finally {
      this.mutating.set(false);
    }
  }

  async download(item: DocumentLibraryItem): Promise<boolean> {
    try {
      await this.api.download(item.source);
      return true;
    } catch {
      this.notifications.error("documents.real.downloadError", "/documents");
      return false;
    }
  }

  async replace(item: DocumentLibraryItem): Promise<DocumentLibraryItem | null> {
    const file = await this.pickFile();
    if (!file || this.mutating()) return null;

    const form = new FormData();
    form.set("AuthorDisplayName", this.currentUserName());
    form.set("File", file, file.name);

    this.mutating.set(true);
    try {
      const updated = this.normalize(await this.api.replace(item.id, form));
      this.upsert(updated);
      await this.reload(this.generation, false);
      return this.toLibraryItem(updated);
    } catch {
      this.notifications.error("documents.real.replaceError", "/documents");
      return null;
    } finally {
      this.mutating.set(false);
    }
  }

  async delete(item: DocumentLibraryItem): Promise<boolean> {
    if (this.mutating()) return false;
    if (typeof window !== "undefined" && !window.confirm(this.translate.instant("documents.real.confirmDelete"))) return false;

    this.mutating.set(true);
    try {
      await this.api.delete(item.id);
      this.rowsSignal.update((items) => items.filter((row) => row.id !== item.id));
      return true;
    } catch {
      this.notifications.error("documents.real.deleteError", "/documents");
      return false;
    } finally {
      this.mutating.set(false);
    }
  }

  private upsert(row: DocumentDto): void {
    this.rowsSignal.update((items) => [row, ...items.filter((item) => item.id !== row.id)]);
  }

  private buildUploadForm(file: File): FormData {
    const form = new FormData();
    const cohortId = this.text(this.workspace.cohort()?.apiId);
    const programId = this.text(this.workspace.program()?.apiId);
    const siteId = this.text(this.workspace.site()?.apiId);
    const organizationId = this.text(this.workspace.organization()?.apiId);
    const owner = cohortId
      ? { type: "cohort", id: cohortId }
      : programId
        ? { type: "program", id: programId }
        : siteId
          ? { type: "site", id: siteId }
          : organizationId
            ? { type: "organization", id: organizationId }
            : { type: "none", id: "" };

    form.set("Title", this.fileTitle(file.name));
    form.set("Description", "");
    form.set("Category", "other");
    form.set("Visibility", "staff");
    form.set("OwnerType", owner.type);
    if (owner.id) form.set("OwnerId", owner.id);
    if (siteId) form.set("SiteId", siteId);
    if (programId) form.set("ProgramId", programId);
    if (cohortId) form.set("CohortId", cohortId);
    form.set("AuthorDisplayName", this.currentUserName());
    form.set("File", file, file.name);
    return form;
  }

  private async pickFile(): Promise<File | null> {
    if (typeof document === "undefined") return null;
    return new Promise<File | null>((resolve) => {
      const input = document.createElement("input");
      let settled = false;
      const finish = (file: File | null) => {
        if (settled) return;
        settled = true;
        resolve(file);
      };
      input.type = "file";
      input.accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png";
      input.addEventListener("change", () => finish(input.files?.[0] ?? null), { once: true });
      input.addEventListener("cancel", () => finish(null), { once: true });
      if (typeof window !== "undefined") {
        window.addEventListener("focus", () => {
          window.setTimeout(() => finish(input.files?.[0] ?? null), 0);
        }, { once: true });
      }
      input.click();
    });
  }

  private toLibraryItem(row: DocumentDto): DocumentLibraryItem {
    const version = row.versions[0];
    const ownerName = row.ownerType === "enrollment" && row.ownerId
      ? this.contextData.students().find((student) => student.enrollmentId === row.ownerId)
      : undefined;
    return {
      id: row.id,
      title: row.title,
      date: this.displayDate(version?.uploadedAtUtc || row.updatedAtUtc || row.createdAtUtc),
      author: this.text(version?.uploadedByDisplayName) || row.createdByDisplayName,
      size: this.formatBytes(version?.sizeBytes),
      category: row.category,
      ownerStudentId: row.ownerType === "enrollment" ? this.text(row.ownerId) : undefined,
      ownerName: ownerName ? `${this.text(ownerName.firstName)} ${this.text(ownerName.lastName)}`.trim() : undefined,
      visibleToStudent: row.visibility === "all" || row.visibility === "student",
      fileName: this.text(version?.fileName),
      format: this.fileFormat(version?.fileName, version?.contentType),
      version: version ? String(version.versionNumber) : "",
      pages: 0,
      visibility: row.visibility,
      descriptionKey: this.text(row.description),
      source: row,
    };
  }

  private normalize(row: DocumentDto): DocumentDto {
    const category: ApiDocumentCategory = row?.category === "administrative" || row?.category === "pedagogical" || row?.category === "evaluation" || row?.category === "course" || row?.category === "internship" || row?.category === "student" || row?.category === "certification"
      ? row.category
      : "other";
    const visibility: ApiDocumentVisibility = row?.visibility === "all" || row?.visibility === "student" ? row.visibility : "staff";
    return {
      id: this.text(row?.id),
      organizationId: this.text(row?.organizationId),
      siteId: this.optionalText(row?.siteId),
      programId: this.optionalText(row?.programId),
      cohortId: this.optionalText(row?.cohortId),
      ownerType: this.text(row?.ownerType),
      ownerId: this.optionalText(row?.ownerId),
      title: this.text(row?.title),
      description: this.text(row?.description),
      category,
      visibility,
      status: this.text(row?.status),
      createdByDisplayName: this.text(row?.createdByDisplayName),
      createdAtUtc: this.text(row?.createdAtUtc),
      updatedAtUtc: this.text(row?.updatedAtUtc),
      versions: Array.isArray(row?.versions)
        ? row.versions
            .map((version) => ({
              id: this.text(version?.id),
              versionNumber: this.number(version?.versionNumber),
              fileName: this.text(version?.fileName),
              contentType: this.text(version?.contentType),
              sizeBytes: this.number(version?.sizeBytes),
              sha256: this.text(version?.sha256),
              blobAvailable: Boolean(version?.blobAvailable),
              securityStatus: this.text(version?.securityStatus),
              uploadedByDisplayName: this.text(version?.uploadedByDisplayName),
              uploadedAtUtc: this.text(version?.uploadedAtUtc),
            }))
            .sort((a, b) => b.versionNumber - a.versionNumber)
        : [],
    };
  }

  private fileTitle(fileName: string): string {
    const title = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    return title || fileName.trim();
  }

  private fileFormat(fileName: unknown, contentType: unknown): string {
    const name = this.text(fileName);
    const extension = name.includes(".") ? name.split(".").pop()?.toUpperCase() ?? "" : "";
    if (extension) return extension;
    const type = this.text(contentType);
    if (type === "application/pdf") return "PDF";
    if (type.includes("word")) return "DOC";
    if (type === "image/jpeg") return "JPG";
    if (type === "image/png") return "PNG";
    return "";
  }

  private displayDate(value: unknown): string {
    const date = new Date(this.text(value));
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  private formatBytes(value: unknown): string {
    const bytes = this.number(value);
    if (bytes <= 0) return "0 o";
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${this.compact(bytes / 1024)} Ko`;
    return `${this.compact(bytes / (1024 * 1024))} Mo`;
  }

  private compact(value: number): string {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
  }

  private currentUserName(): string {
    const user = this.session.session();
    const displayName = [this.text(user?.firstName), this.text(user?.lastName)]
      .filter(Boolean)
      .join(" ")
      .trim();
    return displayName || this.text(user?.email).trim();
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private optionalText(value: unknown): string | null {
    const text = this.text(value).trim();
    return text || null;
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
}
