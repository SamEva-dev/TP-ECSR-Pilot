import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { TranslateService } from "../../../core/i18n/translate.service";
import { PROGRAM_MODULES, type ProgramCatalogCategory, type ProgramCatalogItem, type ProgramCatalogStatus, type ProgramFormValue } from "../../../core/mock-data/programs.mock";
import type { ProgramModule } from "../../../core/models/workspace.models";

@Component({
  selector: "app-program-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./program-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramDrawerComponent {
  private readonly translate = inject(TranslateService);
  readonly open = input(false);
  readonly program = input<ProgramCatalogItem | null>(null);
  readonly closed = output<void>();
  readonly saved = output<ProgramFormValue>();
  readonly modules = PROGRAM_MODULES;
  readonly selectedModules = signal<ProgramModule[]>([]);

  readonly form = new FormGroup({
    code: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    category: new FormControl<ProgramCatalogCategory>("teacher", { nonNullable: true }),
    description: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    referenceVersion: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    durationHours: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    status: new FormControl<ProgramCatalogStatus>("active", { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const program = this.program();
      this.form.reset({
        code: program?.code ?? "",
        name: program?.name ?? "",
        category: program?.category ?? "teacher",
        description: program ? this.translate.instant(program.description) : "",
        referenceVersion: program?.referenceVersion ?? "",
        durationHours: program?.durationHours ?? 0,
        status: program?.status ?? "active",
      });
      this.selectedModules.set(program?.enabledModules ?? ["planning", "attendance", "sessions", "documents", "certification"]);
    });
  }

  hasModule(module: ProgramModule): boolean {
    return this.selectedModules().includes(module);
  }

  toggleModule(module: ProgramModule): void {
    this.selectedModules.update((items) => items.includes(module) ? items.filter((item) => item !== module) : [...items, module]);
  }

  submit(): void {
    if (this.form.invalid || this.selectedModules().length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.saved.emit({ ...raw, enabledModules: this.selectedModules() });
  }
}
