import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  PROGRAM_OFFERINGS,
  TRAINING_REFERENTIALS,
} from "../../core/api-data/runtime-data.store";
import { TrainingCatalogApiService } from "../../core/training/training-catalog-api.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import type { WorkspaceCohort } from "../../core/models/workspace.models";
import {
  CreatePromotionDrawerComponent,
  type CreatePromotionPayload,
} from "./create-promotion-drawer/create-promotion-drawer.component";

type StatusFilter = "all" | WorkspaceCohort["status"];

@Component({
  selector: "app-promotions",
  imports: [TranslatePipe, CreatePromotionDrawerComponent],
  templateUrl: "./promotions.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionsComponent {
  readonly workspace = inject(WorkspaceContextService);
  private readonly api = inject(TrainingCatalogApiService);
  readonly drawerOpen = signal(false);
  readonly saving = signal(false);
  readonly error = signal("");
  readonly createdPromotionName = signal("");
  readonly statusFilter = signal<StatusFilter>("all");
  readonly promotions = computed(() =>
    this.workspace
      .cohorts()
      .slice()
      .sort((a, b) => b.start.localeCompare(a.start)),
  );
  readonly filtered = computed(() =>
    this.promotions().filter(
      (p) => this.statusFilter() === "all" || p.status === this.statusFilter(),
    ),
  );
  readonly activeCount = computed(
    () => this.promotions().filter((p) => p.status === "active").length,
  );
  readonly learnerCount = computed(() =>
    this.promotions().reduce((total, p) => total + p.studentCount, 0),
  );

  referenceName(cohort: WorkspaceCohort): string {
    const version = TRAINING_REFERENTIALS.find(
      (x) =>
        x.apiId === cohort.referentialVersionId ||
        x.id === cohort.referentialVersionId,
    );
    return version ? `${version.name} · ${version.version}` : "—";
  }

  async createPromotion(value: CreatePromotionPayload): Promise<void> {
    const site = this.workspace.site();
    const program = this.workspace.program();
    const offering = PROGRAM_OFFERINGS.find(
      (x) => x.siteId === site?.id && x.programId === program?.id && x.active,
    );
    const reference = TRAINING_REFERENTIALS.find(
      (x) => x.id === value.referentialVersionId && x.status === "active",
    );
    if (!offering?.apiId || !reference?.apiId || this.saving()) {
      this.error.set("promotions.api.invalidContext");
      return;
    }
    this.saving.set(true);
    this.error.set("");
    try {
      const created = await firstValueFrom(
        this.api.createCohort({
          programOfferingId: offering.apiId,
          referentialVersionId: reference.apiId,
          code: value.code.trim(),
          name: value.name.trim(),
          startDate: value.startDate,
          endDate: value.endDate,
          capacity: value.capacity,
          externalKey: null,
        }),
      );
      await this.workspace.reload();
      if (!this.workspace.remoteWorkspaceLoaded())
        this.error.set("promotions.api.refreshFailed");
      const cohort = this.workspace
        .cohorts()
        .find((x) => x.apiId === created.id);
      if (cohort) this.workspace.selectCohort(cohort.id);
      this.createdPromotionName.set(value.name.trim());
      this.drawerOpen.set(false);
      setTimeout(() => this.createdPromotionName.set(""), 3500);
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? error.status
          : 0;
      this.error.set(
        status === 409
          ? "promotions.api.conflict"
          : status === 403
            ? "promotions.api.forbidden"
            : "promotions.api.createFailed",
      );
    } finally {
      this.saving.set(false);
    }
  }

  selectPromotion(cohort: WorkspaceCohort): void {
    this.workspace.selectCohort(cohort.id);
  }
  formatDate(value: string): string {
    return value ? new Date(`${value}T12:00:00`).toLocaleDateString() : "—";
  }
}
