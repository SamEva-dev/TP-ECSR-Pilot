import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from "@angular/core";
import { Router } from "@angular/router";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { PedagoraAccessApiService, type ProductAccount } from "../../../core/access/pedagora-access-api.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { TranslateService } from "../../../core/i18n/translate.service";
import { PROGRAM_MODULES } from "../../../core/api-data/runtime-data.store";
import type { ProgramCatalogCategory, ProgramCatalogItem, ProgramCatalogStatus, ProgramFormValue } from "../../../core/models/programs.models";
import type { ProgramModule } from "../../../core/models/workspace.models";

@Component({
  selector: "app-program-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./program-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramDrawerComponent {
  private readonly translate = inject(TranslateService);
  private readonly accessApi = inject(PedagoraAccessApiService);
  private readonly router = inject(Router);
  readonly trainersLoading = signal(false);
  readonly trainersLoadError = signal(false);
  private trainersRequest = 0;
  readonly trainers = signal<ProductAccount[]>([]);
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
    status: new FormControl<ProgramCatalogStatus>("draft", { nonNullable: true }),
    responsibleTrainerAuthGateUserId: new FormControl("", { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      if (!this.open()) { ++this.trainersRequest; return; }
      const program = this.program();
      this.form.reset({
        code: program?.code ?? "",
        name: program?.name ?? "",
        category: program?.category ?? "teacher",
        description: program ? this.translate.instant(program.description) : "",
        referenceVersion: program?.referenceVersion ?? "",
        durationHours: program?.durationHours ?? 0,
        status: program?.status ?? "draft",
        responsibleTrainerAuthGateUserId: program?.responsibleTrainerAuthGateUserId ?? "",
      });
      this.selectedModules.set(program?.enabledModules ?? ["planning", "attendance", "sessions", "documents", "certification"]);
      void this.loadTrainers();
    });
  }

  hasModule(module: ProgramModule): boolean {
    return this.selectedModules().includes(module);
  }

  toggleModule(module: ProgramModule): void {
    this.selectedModules.update((items) => items.includes(module) ? items.filter((item) => item !== module) : [...items, module]);
  }

  private async loadTrainers(): Promise<void> {
    const request = ++this.trainersRequest;
    this.trainersLoading.set(true);
    this.trainersLoadError.set(false);
    try {
      const rows = await this.accessApi.membersWithRole("pedagogical_manager");
      if (request === this.trainersRequest && this.open())
        this.trainers.set((Array.isArray(rows) ? rows : []).filter(x => x.status === "Active"));
    } catch {
      if (request === this.trainersRequest) { this.trainers.set([]); this.trainersLoadError.set(true); }
    } finally {
      if (request === this.trainersRequest) this.trainersLoading.set(false);
    }
  }

  async manageResponsible(): Promise<void> {
    this.closed.emit();
    await this.router.navigate(["/acces"], { queryParams: { inviteRole: "pedagogical_manager" } });
  }

  trainerName(trainer: ProductAccount): string { return `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim(); }

  submit(): void {
    if (this.form.controls.status.value === "active" && !this.form.controls.responsibleTrainerAuthGateUserId.value) {
      this.form.controls.responsibleTrainerAuthGateUserId.setErrors({ required: true });
    } else {
      this.form.controls.responsibleTrainerAuthGateUserId.setErrors(null);
    }
    if (this.form.invalid || this.selectedModules().length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.responsibleTrainerAuthGateUserId && !this.trainers().some(x => x.id === raw.responsibleTrainerAuthGateUserId)) return;
    const trainer = this.trainers().find((x) => x.id === raw.responsibleTrainerAuthGateUserId);
    this.saved.emit({ ...raw, responsibleTrainerDisplayName: trainer ? `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() : "", enabledModules: this.selectedModules() });
  }
}
