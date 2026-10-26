import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { ReferentialApiStoreService } from "../../core/api-data/referential-api-store.service";
import { ProgramApiStoreService } from "../../core/api-data/program-api-store.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type {
  ReferentialStatus,
  ReferentialVersionFormValue,
} from "../../core/models/referentials.models";
import { ReferentialVersionDrawerComponent } from "./referential-version-drawer/referential-version-drawer.component";

@Component({
  selector: "app-referentials",
  imports: [RouterLink, TranslatePipe, ReferentialVersionDrawerComponent],
  templateUrl: "./referentials.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferentialsComponent {
  readonly store = inject(ReferentialApiStoreService);
  private readonly programStore = inject(ProgramApiStoreService);
  readonly workspace = inject(WorkspaceContextService);
  readonly scopeProgramIds = computed(() => {
    const level = this.workspace.activeLevel();
    const sites = level === "organization" ? this.workspace.sites() : this.workspace.site() ? [this.workspace.site()!] : [];
    const ids = new Set(sites.flatMap(site => this.workspace.sitePrograms(site.id).map(program => program.id)));
    const selected = this.workspace.program()?.id;
    if (level === "program" || level === "cohort") return new Set(selected && ids.has(selected) ? [selected] : []);
    return ids;
  });
  readonly scopedItems = computed(() => this.store.items().filter(item => this.scopeProgramIds().has(item.programId)));
  readonly drawerOpen = signal(false);
  readonly query = signal("");
  readonly programId = signal("all");
  readonly status = signal<ReferentialStatus | "all">("all");

  get programs() {
    return this.programStore.programs().filter(program => this.scopeProgramIds().has(program.id));
  }

  readonly rows = computed(() => {
    const query = this.query().trim().toLowerCase();
    const programs = this.programs;
    return this.scopedItems()
      .map((referential) => ({
        ...referential,
        program: programs.find(
          (program) => program.id === referential.programId,
        ),
      }))
      .filter((item) => {
        const matchesQuery =
          !query ||
          `${item.name} ${item.code} ${item.version}`
            .toLowerCase()
            .includes(query);
        const matchesProgram =
          this.programId() === "all" || item.programId === this.programId();
        const matchesStatus =
          this.status() === "all" || item.status === this.status();
        return matchesQuery && matchesProgram && matchesStatus;
      });
  });

  readonly activeCount = computed(
    () => this.scopedItems().filter((item) => item.status === "active").length,
  );
  readonly draftCount = computed(
    () => this.scopedItems().filter((item) => item.status === "draft").length,
  );
  readonly archivedCount = computed(
    () =>
      this.scopedItems().filter((item) => item.status === "archived").length,
  );

  async saveVersion(value: ReferentialVersionFormValue): Promise<void> {
    const saved = await this.store.createVersion(value);
    if (saved) this.drawerOpen.set(false);
  }

  setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  setProgram(event: Event): void {
    this.programId.set((event.target as HTMLSelectElement).value);
  }
  setStatus(event: Event): void {
    this.status.set(
      (event.target as HTMLSelectElement).value as ReferentialStatus | "all",
    );
  }

  statusClass(status: ReferentialStatus): string {
    return status === "active"
      ? "bg-[#e6f7ec] text-[#1b8f4d]"
      : status === "draft"
        ? "bg-[#fff1d2] text-[#8b6100]"
        : "bg-[#eef1f5] text-[#667085]";
  }
}
