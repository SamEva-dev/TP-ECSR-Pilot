import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { PROGRAM_CATALOG } from "../../../core/mock-data/programs.mock";
import type { ReferentialVersionFormValue, TrainingReferential } from "../../../core/mock-data/referentials.mock";

@Component({
  selector: "app-referential-version-drawer",
  imports: [TranslatePipe],
  templateUrl: "./referential-version-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferentialVersionDrawerComponent {
  readonly open = input(false);
  readonly referentials = input<TrainingReferential[]>([]);
  readonly defaultSourceId = input("");
  readonly closed = output<void>();
  readonly saved = output<ReferentialVersionFormValue>();
  readonly programs = PROGRAM_CATALOG;

  readonly programId = signal("");
  readonly sourceId = signal("");
  readonly version = signal("");
  readonly code = signal("");
  readonly effectiveFrom = signal("2027-01-01");
  readonly status = signal<ReferentialVersionFormValue["status"]>("draft");

  readonly effectiveProgramId = computed(() => this.programId() || this.referentials().find((item) => item.id === this.defaultSourceId())?.programId || this.referentials()[0]?.programId || "");
  readonly sources = computed(() => this.referentials().filter((item) => item.programId === this.effectiveProgramId()));

  setProgram(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.programId.set(value);
    this.sourceId.set(this.sources()[0]?.id ?? "");
  }
  setSource(event: Event): void { this.sourceId.set((event.target as HTMLSelectElement).value); }
  setVersion(event: Event): void { this.version.set((event.target as HTMLInputElement).value); }
  setCode(event: Event): void { this.code.set((event.target as HTMLInputElement).value); }
  setEffectiveFrom(event: Event): void { this.effectiveFrom.set((event.target as HTMLInputElement).value); }
  setStatus(event: Event): void { this.status.set((event.target as HTMLSelectElement).value as ReferentialVersionFormValue["status"]); }

  initialise(): void {
    const source = this.referentials().find((item) => item.id === this.defaultSourceId()) ?? this.referentials()[0];
    if (!source) return;
    this.programId.set(source.programId);
    this.sourceId.set(source.id);
    this.version.set(`${source.version} · copie`);
    this.code.set(`${source.code}-COPY`);
  }

  submit(): void {
    const sourceId = this.sourceId() || this.sources()[0]?.id || "";
    if (!sourceId || !this.version().trim() || !this.code().trim()) return;
    this.saved.emit({
      programId: this.effectiveProgramId(),
      sourceReferentialId: sourceId,
      version: this.version().trim(),
      code: this.code().trim(),
      effectiveFrom: this.effectiveFrom(),
      status: this.status(),
    });
  }
}
