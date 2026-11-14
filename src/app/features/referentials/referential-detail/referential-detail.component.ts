import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import type {
  ReferentialStatus,
  ReferentialVersionFormValue,
  VolumeCategory,
} from "../../../core/models/referentials.models";
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
      ) ??
      this.comparisonCandidates().at(0) ??
      null,
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
