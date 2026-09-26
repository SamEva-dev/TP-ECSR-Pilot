import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { ReferentialApiStoreService } from "../../../core/api-data/referential-api-store.service";
import { ProgramApiStoreService } from "../../../core/api-data/program-api-store.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { ReferentialStatus, ReferentialVersionFormValue, VolumeCategory } from "../../../core/models/referentials.models";
import { ReferentialCompareDrawerComponent } from "../referential-compare-drawer/referential-compare-drawer.component";
import { ReferentialVersionDrawerComponent } from "../referential-version-drawer/referential-version-drawer.component";

type DetailTab = "overview" | "skills" | "hours" | "stages" | "certification";

@Component({
  selector: "app-referential-detail",
  imports: [RouterLink, TranslatePipe, ReferentialCompareDrawerComponent, ReferentialVersionDrawerComponent],
  templateUrl: "./referential-detail.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferentialDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly programStore = inject(ProgramApiStoreService);
  readonly store = inject(ReferentialApiStoreService);
  readonly referentialId = this.route.snapshot.paramMap.get("id") ?? "";
  readonly activeTab = signal<DetailTab>("overview");
  readonly compareOpen = signal(false);
  readonly versionDrawerOpen = signal(false);
  readonly compareWithId = signal("");

  readonly referential = computed(() => this.store.items().find((item) => item.id === this.referentialId || item.apiId === this.referentialId) ?? null);
  readonly program = computed(() => this.programStore.programs().find((item) => item.id === this.referential()?.programId) ?? null);
  readonly comparisonCandidates = computed(() => this.store.items().filter((item) => item.programId === this.referential()?.programId && item.id !== this.referential()?.id));
  readonly compareWith = computed(() => this.comparisonCandidates().find((item) => item.id === this.compareWithId()) ?? this.comparisonCandidates().at(0) ?? null);
  readonly linkedCohorts = computed(() => this.referential()?.linkedCohorts ?? []);
  readonly subCompetencyCount = computed(() => this.referential()?.competencies.reduce((sum, item) => sum + item.subCompetencies.length, 0) ?? 0);
  readonly internshipHours = computed(() => this.referential()?.stageRequirements.reduce((sum, item) => sum + item.hours, 0) ?? 0);

  selectTab(tab: DetailTab): void { this.activeTab.set(tab); }
  async saveVersion(value: ReferentialVersionFormValue): Promise<void> {
    const saved = await this.store.createVersion(value);
    if (saved) this.versionDrawerOpen.set(false);
  }
  setComparison(event: Event): void { this.compareWithId.set((event.target as HTMLSelectElement).value); }
  openCompare(): void {
    const candidate = this.compareWith();
    if (!candidate) return;
    this.compareWithId.set(candidate.id);
    this.compareOpen.set(true);
  }

  statusClass(status: ReferentialStatus): string {
    return status === "active" ? "bg-[#e6f7ec] text-[#1b8f4d]" : status === "draft" ? "bg-[#fff1d2] text-[#8b6100]" : "bg-[#eef1f5] text-[#667085]";
  }
  volumeIcon(category: VolumeCategory): string {
    return category === "classroom" ? "ph-chalkboard-teacher" : category === "driving" ? "ph-car" : category === "internship" ? "ph-briefcase" : category === "assessment" ? "ph-exam" : "ph-clock";
  }
}
