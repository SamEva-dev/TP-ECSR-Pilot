import {
  ChangeDetectionStrategy,
  Component,
  signal,
  inject,
  effect,
  input,
  output,
} from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { PedagoraAccessApiService } from "../../../core/access/pedagora-access-api.service";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type {
  SiteFormValue,
  SiteOperationalStatus,
  SiteProfile,
} from "../../../core/models/sites.models";

@Component({
  selector: "app-site-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./site-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteDrawerComponent {
  private readonly accessApi = inject(PedagoraAccessApiService);
  private readonly workspace = inject(WorkspaceContextService);
  readonly eligibleManagers = signal<{ id: string; name: string }[]>([]);
  private managerRequest = 0;
  private async loadManagers(): Promise<void> {
    const request = ++this.managerRequest;
    const context = this.workspace.organization()?.apiId;
    try {
      const accounts = await this.accessApi.membersWithRole("site_direction");
      if (request !== this.managerRequest || context !== this.workspace.organization()?.apiId || !this.open()) return;
      this.eligibleManagers.set(accounts.map(account => ({
        id: account.id,
        name: `${account.firstName ?? ""} ${account.lastName ?? ""}`.trim() || account.email,
      })));
    } catch {
      if (request === this.managerRequest) this.eligibleManagers.set([]);
    }
  }

  readonly open = input(false);
  readonly site = input<SiteProfile | null>(null);
  readonly closed = output<void>();
  readonly saved = output<SiteFormValue>();

  readonly form = new FormGroup({
    code: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    name: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    city: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    address: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    postalCode: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    phone: new FormControl("", { nonNullable: true }),
    email: new FormControl("", {
      nonNullable: true,
      validators: [Validators.email],
    }),
    manager: new FormControl("", { nonNullable: true }),
    managerAuthGateUserId: new FormControl<string | null>(null),
    status: new FormControl<SiteOperationalStatus>("active", {
      nonNullable: true,
    }),
  });

  constructor() {
    effect(() => {
      if (!this.open()) { ++this.managerRequest; return; }
      const organization = this.workspace.organization()?.apiId;
      void organization;
      void this.loadManagers();
      const site = this.site();
      this.form.reset({
        code: site?.code ?? "",
        name: site?.name ?? "",
        city: site?.city ?? "",
        address: site?.address ?? "",
        postalCode: site?.postalCode ?? "",
        phone: site?.phone ?? "",
        email: site?.email ?? "",
        manager: site?.manager ?? "",
        managerAuthGateUserId: site?.managerAuthGateUserId ?? null,
        status: site?.status ?? "active",
      });
    });
  }

  submit(): void {
    const selectedId = this.form.controls.managerAuthGateUserId.value;
    const selectedManager = this.eligibleManagers().find(x => x.id === selectedId);
    const existing = this.site();
    const preservingLegacyManager = !!existing && !existing.managerAuthGateUserId && !selectedId;
    const preservingAssignedManager = !!existing?.managerAuthGateUserId && selectedId === existing.managerAuthGateUserId;
    if (!selectedManager && !preservingLegacyManager && !preservingAssignedManager) {
      this.form.controls.managerAuthGateUserId.setErrors({ required: true });
    } else {
      this.form.controls.managerAuthGateUserId.setErrors(null);
    }
    if (selectedManager) this.form.controls.manager.setValue(selectedManager.name);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(this.form.getRawValue());
  }
}
