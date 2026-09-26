import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from "@angular/core";
import { ProgramApiStoreService } from "../../../core/api-data/program-api-store.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { ReferentialVersionFormValue, TrainingReferential } from "../../../core/models/referentials.models";

@Component({
  selector: "app-referential-version-drawer",
  imports: [TranslatePipe],
  templateUrl: "./referential-version-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferentialVersionDrawerComponent {
  private readonly programStore = inject(ProgramApiStoreService);
  readonly open = input(false);
  readonly referentials = input<TrainingReferential[]>([]);
  readonly defaultSourceId = input("");
  readonly closed = output<void>();
  readonly saved = output<ReferentialVersionFormValue>();

  get programs() {
    return this.programStore.programs();
  }

  readonly programId = signal("");
  readonly sourceId = signal("");
  readonly version = signal("");
  readonly code = signal("");
  readonly effectiveFrom = signal("");
  readonly status = signal<ReferentialVersionFormValue["status"]>("draft");

  readonly effectiveProgramId = computed(() => this.programId() || this.referentials().find((item) => item.id === this.defaultSourceId())?.programId || this.referentials()[0]?.programId || "");
  readonly sources = computed(() => this.referentials().filter((item) => item.programId === this.effectiveProgramId()));
  private wasOpen = false;

  constructor() {
    effect(() => {
      const open = this.open();
      if (open && !this.wasOpen) untracked(() => this.initialise());
      this.wasOpen = open;
    });
  }

  setProgram(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.programId.set(value);
    const source = this.sources()[0];
    this.sourceId.set(source?.id ?? "");
    this.code.set(source?.certificationCode ?? source?.code ?? "");
  }
  setSource(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sourceId.set(value);
    const source = this.referentials().find((item) => item.id === value);
    if (source) this.code.set(source.certificationCode ?? source.code ?? "");
  }
  setVersion(event: Event): void { this.version.set((event.target as HTMLInputElement).value); }
  setCode(event: Event): void { this.code.set((event.target as HTMLInputElement).value); }
  setEffectiveFrom(event: Event): void { this.effectiveFrom.set((event.target as HTMLInputElement).value); }
  setStatus(event: Event): void { this.status.set((event.target as HTMLSelectElement).value as ReferentialVersionFormValue["status"]); }

  initialise(): void {
    const source = this.referentials().find((item) => item.id === this.defaultSourceId()) ?? this.referentials()[0];
    if (!source) return;
    this.programId.set(source.programId);
    this.sourceId.set(source.id);
    this.version.set(source.version);
    this.code.set(source.certificationCode ?? source.code ?? "");
    this.effectiveFrom.set("");
    this.status.set("draft");
  }

  submit(): void {
    const sourceId = this.sourceId() || this.sources()[0]?.id || "";
    if (!sourceId || !this.version().trim() || !this.effectiveFrom()) return;
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
