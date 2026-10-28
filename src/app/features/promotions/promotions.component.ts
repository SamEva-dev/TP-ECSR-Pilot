import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { PedagoraAccessApiService } from "../../core/access/pedagora-access-api.service";
import { TrainingCatalogApiService } from "../../core/training/training-catalog-api.service";
import { RouterLink } from "@angular/router";
import { CohortApiStoreService } from "../../core/api-data/cohort-api-store.service";
import { AccessPolicyService } from "../../core/access/access-policy.service";
import { ReferentialApiStoreService } from "../../core/api-data/referential-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslateService } from "../../core/i18n/translate.service";
import type { ContextualPromotionSummary } from "../../core/models/contextual-promotions.models";
import type { WorkspaceCohort } from "../../core/models/workspace.models";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import {
  CreatePromotionDrawerComponent,
  type CreatePromotionPayload,
} from "./create-promotion-drawer/create-promotion-drawer.component";

type PromotionStatusFilter = "all" | WorkspaceCohort["status"];

@Component({
  selector: "app-promotions",
  imports: [RouterLink, FormsModule, TranslatePipe, ProgressBarComponent, CreatePromotionDrawerComponent],
  templateUrl: "./promotions.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionsComponent {
  readonly workspace = inject(WorkspaceContextService);
  private readonly cohortsApi = inject(TrainingCatalogApiService);
  private readonly accessApi = inject(PedagoraAccessApiService);
  readonly copying = signal(false);
  readonly copySource = signal<ContextualPromotionSummary | null>(null);
  readonly copyError = signal("");
  readonly copyManagers = signal<{ id: string; name: string }[]>([]);
  copySiteId = "";
  copyName = "";
  copyCode = "";
  copyStart = "";
  copyEnd = "";
  copyCapacity = 1;
  copyManagerId = "";
  readonly copyDestinations = computed(() => {
    const source = this.copySource();
    if (!source) return [];
    return this.workspace.sites().filter(site => site.id !== source.siteId &&
      !!this.workspace.offeringForSiteProgram(site.id, source.programId));
  });
  readonly access = inject(AccessPolicyService);
  private readonly translate = inject(TranslateService);
  readonly store = inject(CohortApiStoreService);
  readonly referentials = inject(ReferentialApiStoreService);
  readonly drawerOpen = signal(false);
  readonly createdPromotionName = signal("");
  readonly creatingPromotion = signal(false);
  readonly statusFilter = signal<PromotionStatusFilter>("all");

  readonly siteProgramPromotions = computed(() =>
    [...this.store.promotions()]
      .filter(item => {
        const selection = this.workspace.selection();
        return item.organizationId === selection.organizationId &&
          (!selection.siteId || item.siteId === selection.siteId) &&
          (!selection.programId || item.programId === selection.programId) &&
          (!selection.cohortId || item.id === selection.cohortId);
      })
      .sort((a, b) => b.start.localeCompare(a.start)),
  );

  readonly filteredPromotions = computed(() => {
    const filter = this.statusFilter();
    return this.siteProgramPromotions().filter((item) => filter === "all" || item.status === filter);
  });

  readonly counts = computed(() => ({
    all: this.siteProgramPromotions().length,
    active: this.siteProgramPromotions().filter((item) => item.status === "active").length,
    planned: this.siteProgramPromotions().filter((item) => item.status === "planned").length,
    completed: this.siteProgramPromotions().filter((item) => item.status === "completed").length,
  }));

  readonly activeStudents = computed(() =>
    this.siteProgramPromotions()
      .filter((item) => item.status === "active")
      .reduce((total, item) => total + this.number(item.studentCount), 0),
  );

  readonly referentialLabel = computed(() => {
    const cohort = this.workspace.cohort();
    if (!cohort) return "";
    return this.referentials.items().find(
      (item) => item.apiId === cohort.referentialVersionId || item.id === cohort.referentialVersionId,
    )?.version ?? "";
  });

  async openCopy(item: ContextualPromotionSummary): Promise<void> {
    if (!this.access.can("promotions.create")) return;
    this.copySource.set(item);
    this.copyError.set("");
    this.copySiteId = "";
    this.copyName = item.name;
    // A different code must always be supplied explicitly for the destination.
    this.copyCode = "";
    this.copyStart = item.start;
    this.copyEnd = item.end;
    this.copyCapacity = Math.max(1, item.capacity);
    this.copyManagerId = "";
    this.copyManagers.set([]);
    try {
      const members = await this.accessApi.membersWithRole("pedagogical_manager");
      if (this.copySource()?.id !== item.id) return;
      this.copyManagers.set((members ?? [])
        .filter(m => m.status === "Active" && !m.isInvitation)
        .map(m => ({ id: m.id, name: `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email }))
        .filter(m => !!m.id));
    } catch {
      this.copyError.set(this.translate.instant("promotions.copy.managersUnavailable"));
    }
  }

  closeCopy(): void {
    if (this.copying()) return;
    this.copySource.set(null);
    this.copyError.set("");
  }

  async submitCopy(): Promise<void> {
    const source = this.copySource();
    if (!source || this.copying() || !this.access.can("promotions.create")) return;
    const offering = this.workspace.offeringForSiteProgram(this.copySiteId, source.programId);
    const version = this.referentials.items().find(r =>
      r.id === source.referentialVersionId || r.apiId === source.referentialVersionId);
    const manager = this.copyManagers().find(m => m.id === this.copyManagerId);
    const code = this.copyCode.trim();
    const name = this.copyName.trim();
    if (!offering?.apiId || !version?.apiId || version.status !== "active" ||
        !manager || !name || name.length > 80 || !/^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/.test(code) ||
        !this.copyStart || !this.copyEnd || this.copyEnd < this.copyStart ||
        !Number.isInteger(this.copyCapacity) || this.copyCapacity < 1) {
      this.copyError.set(this.translate.instant("promotions.copy.invalid"));
      return;
    }
    this.copying.set(true);
    this.copyError.set("");
    try {
      const destination = this.workspace.sites().find(site => site.id === this.copySiteId);
      const created = await this.cohortsApi.createCohort({
        programOfferingId: offering.apiId,
        referentialVersionId: version.apiId,
        code,
        name,
        startDate: this.copyStart,
        endDate: this.copyEnd,
        capacity: this.copyCapacity,
        pedagogicalManagerAuthGateUserId: manager.id,
        pedagogicalManagerDisplayName: manager.name,
        externalKey: null,
        initialStatus: "draft",
      });
      // Only a committed server resource counts as success.
      if (!created?.id || created.siteId !== destination?.apiId ||
          created.programOfferingId !== offering.apiId) {
        this.copyError.set(this.translate.instant("promotions.copy.unexpectedResponse"));
        return;
      }
      this.copySource.set(null);
      this.createdPromotionName.set(created.name);
      // Keep the current source context unchanged. Reload the global workspace so
      // the new destination cohort appears when that site is selected.
      await this.workspace.reload();
      await this.store.reload();
    } catch {
      this.copyError.set(this.translate.instant("promotions.copy.failed"));
    } finally {
      this.copying.set(false);
    }
  }

  openCreateDrawer(): void {
    void this.referentials.reload();
    this.drawerOpen.set(true);
  }

  closeCreateDrawer(): void {
    this.drawerOpen.set(false);
  }

  setStatusFilter(filter: PromotionStatusFilter): void {
    this.statusFilter.set(filter);
  }

  selectPromotion(item: ContextualPromotionSummary): void {
    const cohort = this.workspace.cohorts().find((candidate) => candidate.id === item.id);
    if (cohort) this.workspace.selectCohort(cohort.id);
  }

  async deletePromotion(item: ContextualPromotionSummary): Promise<void> {
    if (!this.access.can("promotions.delete")) return;
    const confirmed = typeof window === "undefined" || window.confirm(
      this.translate.instant("promotions.delete.confirm", { name: item.name }),
    );
    if (!confirmed) return;
    await this.store.delete(item.id);
  }

  async createPromotion(payload: CreatePromotionPayload): Promise<void> {
    if (this.creatingPromotion()) return;
    this.creatingPromotion.set(true);
    try {
      const created = await this.store.create({
      name: payload.name,
      startDate: payload.startDate,
      endDate: payload.endDate,
      capacity: payload.studentCount,
      referentialVersionId: payload.referentialVersionId,
      status: payload.status,
      managerUserId: payload.managerUserId,
      managerDisplayName: payload.manager,
      });
      if (!created) return;

      this.createdPromotionName.set(created.name);
      this.drawerOpen.set(false);
      setTimeout(() => this.createdPromotionName.set(""), 3500);
    } finally {
      this.creatingPromotion.set(false);
    }
  }

  formatDate(value: string): string {
    if (!value) return "";
    const [year = "", month = "", day = ""] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : "";
  }

  statusClass(status: WorkspaceCohort["status"]): string {
    switch (status) {
      case "active":
        return "bg-[#dff7e5] text-[#178344]";
      case "planned":
      case "draft":
        return "bg-[#e7f2ff] text-[#2a64a2]";
      case "completed":
      case "cancelled":
        return "bg-[#eef0f4] text-[#5d6878]";
    }
  }

  statusIcon(status: WorkspaceCohort["status"]): string {
    switch (status) {
      case "active":
        return "ph-play-circle";
      case "planned":
      case "draft":
        return "ph-calendar-plus";
      case "completed":
        return "ph-check-circle";
      case "cancelled":
        return "ph-x-circle";
    }
  }

  metricValue(value: number, suffix = ""): string {
    return `${this.number(value).toLocaleString("fr-FR")}${suffix}`;
  }

  learnerInitials(firstName: string, lastName: string): string {
    return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
  }

  learnerStatusClass(status: "good" | "warning" | "late"): string {
    return status === "good"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "warning"
        ? "bg-[#fff1d2] text-[#a16a00]"
        : "bg-[#ffe3e3] text-[#c33c3c]";
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
}
