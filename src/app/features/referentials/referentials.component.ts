import { ReferentialApiStoreService } from "../../core/api-data/referential-api-store.service";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type { ReferentialStatus, ReferentialVersionFormValue } from "../../core/models/referentials.models";

import { ReferentialVersionDrawerComponent } from "./referential-version-drawer/referential-version-drawer.component";
import { PROGRAM_CATALOG } from "../../core/api-data/runtime-data.store";

@Component({
  selector: "app-referentials",
  imports: [RouterLink, TranslatePipe, ReferentialVersionDrawerComponent],
  templateUrl: "./referentials.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferentialsComponent {
  readonly store = inject(ReferentialApiStoreService);
  readonly drawerOpen = signal(false);
  readonly query = signal("");
  readonly programId = signal("all");
  readonly status = signal<ReferentialStatus | "all">("all");
  readonly programs = PROGRAM_CATALOG;

  readonly rows = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.store.items().map((referential) => ({
      ...referential,
      program: PROGRAM_CATALOG.find((program) => program.id === referential.programId),
    })).filter((item) => {
      const matchesQuery = !query || `${item.name} ${item.code} ${item.version}`.toLowerCase().includes(query);
      const matchesProgram = this.programId() === "all" || item.programId === this.programId();
      const matchesStatus = this.status() === "all" || item.status === this.status();
      return matchesQuery && matchesProgram && matchesStatus;
    });
  });

  readonly activeCount = computed(() => this.store.items().filter((item) => item.status === "active").length);
  readonly draftCount = computed(() => this.store.items().filter((item) => item.status === "draft").length);
  readonly archivedCount = computed(() => this.store.items().filter((item) => item.status === "archived").length);

  saveVersion(value: ReferentialVersionFormValue): void {
    this.store.createVersion(value);
    this.drawerOpen.set(false);
  }

  setQuery(event: Event): void { this.query.set((event.target as HTMLInputElement).value); }
  setProgram(event: Event): void { this.programId.set((event.target as HTMLSelectElement).value); }
  setStatus(event: Event): void { this.status.set((event.target as HTMLSelectElement).value as ReferentialStatus | "all"); }

  statusClass(status: ReferentialStatus): string {
    return status === "active" ? "bg-[#e6f7ec] text-[#1b8f4d]" : status === "draft" ? "bg-[#fff1d2] text-[#8b6100]" : "bg-[#eef1f5] text-[#667085]";
  }
}
