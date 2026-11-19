import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { CertificationApiService } from "../../../core/certification/certification-api.service";
import type { CertificationScheme } from "../../../core/certification/certification.models";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AccessPolicyService } from "../../../core/access/access-policy.service";
import { ReferentialApiStoreService } from "../../../core/api-data/referential-api-store.service";
import { ProgramApiStoreService } from "../../../core/api-data/program-api-store.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { apiErrorCode } from "../../../core/errors/api-error-code";
import type {
  ReferentialStatus,
  ReferentialVersionFormValue,
  VolumeCategory,
} from "../../../core/models/referentials.models";
import { DeaStructureComponent } from "../dea-structure/dea-structure.component";
import { DeaStructureApiService } from "../dea-structure/dea-structure-api.service";
import type { DeaStructureDocument } from "../dea-structure/dea-structure.models";
import { ReferentialCompareDrawerComponent } from "../referential-compare-drawer/referential-compare-drawer.component";
import { ReferentialVersionDrawerComponent } from "../referential-version-drawer/referential-version-drawer.component";

type DetailTab = "overview" | "skills" | "hours" | "stages" | "certification";

@Component({
  selector: "app-referential-detail",
  imports: [
    RouterLink,
    FormsModule,
    TranslatePipe,
    ReferentialCompareDrawerComponent,
    ReferentialVersionDrawerComponent,
    DeaStructureComponent,
  ],
  templateUrl: "./referential-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferentialDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly accessPolicy = inject(AccessPolicyService);
  readonly canManage = computed(() => this.accessPolicy.can("administration.manage"));
  readonly canManageCertification = computed(() => this.accessPolicy.can("certification.manage"));
  private readonly certificationApi = inject(CertificationApiService);
  readonly certificationSchemes = signal<CertificationScheme[]>([]);
  readonly selectedCertificationId = signal("");
  readonly certificationBusy = signal(false);
  readonly certificationError = signal("");
  readonly selectedCertificationScheme = computed(() => this.certificationSchemes().find(x => x.id === this.selectedCertificationId()) ?? null);
  newSchemeCode = "";
  newSchemeName = "";
  newUnitCode = "";
  newUnitTitle = "";
  newStepCode = "";
  newStepTitle = "";
  newStepKind = "Practical";
  newStepUnitId = "";
  newStepDuration = 60;
  effectiveFrom = "";
  effectiveTo = "";

  private async refreshCertificationSchemes(): Promise<void> {
    const versionId = this.referential()?.apiId;
    if (!versionId) return;
    try {
      const rows = await firstValueFrom(this.certificationApi.getSchemes(versionId));
      if (this.referential()?.apiId !== versionId) return;
      this.certificationSchemes.set(rows ?? []);
      if (!rows?.some(x => x.id === this.selectedCertificationId()))
        this.selectedCertificationId.set(rows?.[0]?.id ?? "");
    } catch {
      this.certificationError.set("load");
    }
  }

  private async performCertificationMutation(action: () => Promise<unknown>): Promise<void> {
    if (!this.canManageCertification() || this.certificationBusy()) return;
    this.certificationBusy.set(true);
    this.certificationError.set("");
    try {
      await action();
      await this.refreshCertificationSchemes();
      await this.store.reload();
    } catch (error: unknown) {
      const payload = (error as { error?: { code?: string; errorCode?: string } })?.error;
      this.certificationError.set(payload?.code ?? payload?.errorCode ?? "request");
    } finally {
      this.certificationBusy.set(false);
    }
  }

  async createCertificationScheme(): Promise<void> {
    const versionId = this.referential()?.apiId;
    if (!versionId || !this.newSchemeCode.trim() || !this.newSchemeName.trim()) return;
    await this.performCertificationMutation(async () => {
      const result = await firstValueFrom(this.certificationApi.createScheme({
        referentialVersionId: versionId, code: this.newSchemeCode.trim(), name: this.newSchemeName.trim(),
      }));
      this.selectedCertificationId.set(result.id);
      this.newSchemeCode = "";
      this.newSchemeName = "";
    });
  }

  async addCertificationUnit(): Promise<void> {
    const scheme = this.selectedCertificationScheme();
    if (!scheme || !this.newUnitCode.trim() || !this.newUnitTitle.trim()) return;
    await this.performCertificationMutation(async () => {
      await firstValueFrom(this.certificationApi.addSchemeUnit(scheme.id, {
        code: this.newUnitCode.trim(), title: this.newUnitTitle.trim(), sortOrder: scheme.units.length + 1,
      }));
      this.newUnitCode = "";
      this.newUnitTitle = "";
    });
  }

  async addCertificationStep(): Promise<void> {
    const scheme = this.selectedCertificationScheme();
    if (!scheme || !this.newStepCode.trim() || !this.newStepTitle.trim() || this.newStepDuration <= 0) return;
    await this.performCertificationMutation(async () => {
      await firstValueFrom(this.certificationApi.addSchemeStep(scheme.id, {
        code: this.newStepCode.trim(), title: this.newStepTitle.trim(), kind: this.newStepKind,
        unitId: this.newStepUnitId || null, durationMinutes: this.newStepDuration,
        sortOrder: scheme.steps.length + 1,
      }));
      this.newStepCode = "";
      this.newStepTitle = "";
    });
  }

  async publishCertificationScheme(): Promise<void> {
    const scheme = this.selectedCertificationScheme();
    if (!scheme || !this.effectiveFrom || !scheme.units.length || !scheme.steps.length) return;
    await this.performCertificationMutation(async () => {
      await firstValueFrom(this.certificationApi.publishScheme(scheme.id, {
        effectiveFrom: this.effectiveFrom, effectiveTo: this.effectiveTo || null,
      }));
    });
  }

  readonly publishing = signal(false);
  private readonly programStore = inject(ProgramApiStoreService);
  readonly store = inject(ReferentialApiStoreService);
  readonly referentialId = this.route.snapshot.paramMap.get("id") ?? "";
  readonly activeTab = signal<DetailTab>("overview");
  readonly compareOpen = signal(false);
  readonly versionDrawerOpen = signal(false);
  readonly compareWithId = signal("");

  private readonly deaApi = inject(DeaStructureApiService);
  readonly isDea = computed(() => this.program()?.familyCode?.toUpperCase() === "EMERGENCY_MEDICAL");
  readonly deaDocument = signal<DeaStructureDocument | null>(null);
  readonly deaUpdatedAt = signal<string | null>(null);
  readonly deaBusy = signal(false);
  readonly deaState = signal<"idle" | "loading" | "empty" | "ready" | "error">("idle");
  readonly deaErrorKey = signal("");
  private deaRequestId = 0;
  private deaLoadedKey = "";
  private deaLoadingVersion = "";

  constructor() {
    effect(() => {
      const versionId = this.referential()?.apiId ?? "";
      const key = this.isDea() && versionId ? versionId : "";
      // Do not repeat the initial GET when unrelated reactive state changes.
      if (key === this.deaLoadedKey) return;
      this.deaLoadedKey = key;
      ++this.deaRequestId;
      this.deaDocument.set(null);
      this.deaUpdatedAt.set(null);
      this.deaErrorKey.set("");
      this.deaState.set("idle");
      this.deaBusy.set(false);
      if (key) void this.loadDeaStructure();
    });
  }

  async loadDeaStructure(): Promise<void> {
    const versionId = this.referential()?.apiId;
    if (!versionId || !this.isDea() || this.deaLoadingVersion === versionId) return;
    const requestId = ++this.deaRequestId;
    this.deaLoadingVersion = versionId;
    this.deaBusy.set(true);
    this.deaState.set("loading");
    this.deaErrorKey.set("");
    try {
      const result = await this.deaApi.get(versionId);
      if (requestId !== this.deaRequestId || this.referential()?.apiId !== versionId) return;
      this.deaDocument.set(result.content);
      this.deaUpdatedAt.set(result.updatedAtUtc);
      this.deaState.set("ready");
    } catch (error: unknown) {
      if (requestId !== this.deaRequestId || this.referential()?.apiId !== versionId) return;
      const status = (error as { status?: number; original?: { status?: number } })?.status
        ?? (error as { original?: { status?: number } })?.original?.status;
      if (status === 404) {
        // The version exists, but its DEA document has not yet been initialized.
        this.deaDocument.set(null);
        this.deaUpdatedAt.set(null);
        this.deaState.set("empty");
      } else {
        this.deaState.set("error");
        this.deaErrorKey.set("qa41b4.errors.load");
      }
    } finally {
      if (this.deaLoadingVersion === versionId) this.deaLoadingVersion = "";
      if (requestId === this.deaRequestId) this.deaBusy.set(false);
    }
  }

  /** Empty sections are an authoring scaffold, not regulatory DEA content. */
  async initializeDeaStructure(): Promise<void> {
    if (this.deaState() !== "empty") return;
    await this.saveDeaStructure({
      blocks: [], competencies: [], modules: [], stages: [], assessmentByBlock: [],
      totalHours: 801, instituteHours: 556, internshipHours: 245, pedagogicalFollowupHours: 3,
    });
  }

  async saveDeaStructure(document: DeaStructureDocument): Promise<void> {
    const current = this.referential();
    if (!current?.apiId || !this.isDea() || current.status !== "draft" || !this.canManage() || this.deaBusy()) return;
    const versionId = current.apiId;
    const requestId = ++this.deaRequestId;
    this.deaBusy.set(true);
    this.deaErrorKey.set("");
    try {
      const result = await this.deaApi.save(versionId, document);
      if (requestId !== this.deaRequestId || this.referential()?.apiId !== versionId) return;
      this.deaDocument.set(result.content);
      this.deaUpdatedAt.set(result.updatedAtUtc);
      this.deaState.set("ready");
    } catch (error: unknown) {
      if (requestId === this.deaRequestId) {
        const errorCode = apiErrorCode(error);
        this.deaErrorKey.set(
          errorCode === "DEA_STRUCTURE_INVALID"
            ? "qa41b4.errors.invalidStructure"
            : "qa41b4.errors.save",
        );
        // An unsuccessful initialization remains empty and retryable.
        if (this.deaState() !== "empty") this.deaState.set("ready");
      }
    } finally {
      if (requestId === this.deaRequestId) this.deaBusy.set(false);
    }
  }


  readonly referential = computed(
    () =>
      this.store
        .items()
        .find(
          (item) =>
            item.id === this.referentialId || item.apiId === this.referentialId,
        ) ?? null,
  );
  readonly program = computed(
    () =>
      this.programStore
        .programs()
        .find((item) => item.id === this.referential()?.programId) ?? null,
  );
  readonly comparisonCandidates = computed(() =>
    this.store
      .items()
      .filter(
        (item) =>
          item.programId === this.referential()?.programId &&
          item.id !== this.referential()?.id,
      ),
  );
  readonly compareWith = computed(
    () =>
      this.comparisonCandidates().find(
        (item) => item.id === this.compareWithId(),
      ) ?? null,
  );
  readonly linkedCohorts = computed(
    () => this.referential()?.linkedCohorts ?? [],
  );
  readonly subCompetencyCount = computed(
    () =>
      this.referential()?.competencies.reduce(
        (sum, item) => sum + item.subCompetencies.length,
        0,
      ) ?? 0,
  );
  readonly internshipHours = computed(
    () =>
      this.referential()?.stageRequirements.reduce(
        (sum, item) => sum + item.hours,
        0,
      ) ?? 0,
  );

  async publishDraft(): Promise<void> {
    const item = this.referential();
    if (!item || item.status !== "draft" || !this.canManage() || this.publishing()) return;
    this.publishing.set(true);
    try {
      await this.store.publish(item.apiId);
    } finally {
      this.publishing.set(false);
    }
  }

  selectTab(tab: DetailTab): void {
    this.activeTab.set(tab);
    if (tab === "certification") void this.refreshCertificationSchemes();
  }
  async saveVersion(value: ReferentialVersionFormValue): Promise<void> {
    const saved = await this.store.createVersion(value);
    if (saved) this.versionDrawerOpen.set(false);
  }
  setComparison(event: Event): void {
    this.compareWithId.set((event.target as HTMLSelectElement).value);
  }
  openCompare(): void {
    const candidate = this.compareWith();
    if (!candidate) return;
    this.compareWithId.set(candidate.id);
    this.compareOpen.set(true);
  }

  statusClass(status: ReferentialStatus): string {
    return status === "active"
      ? "bg-[#e6f7ec] text-[#1b8f4d]"
      : status === "draft"
        ? "bg-[#fff1d2] text-[#8b6100]"
        : "bg-[#eef1f5] text-[#667085]";
  }
  volumeIcon(category: VolumeCategory): string {
    return category === "classroom"
      ? "ph-chalkboard-teacher"
      : category === "driving"
        ? "ph-car"
        : category === "internship"
          ? "ph-briefcase"
          : category === "assessment"
            ? "ph-exam"
            : "ph-clock";
  }
}
