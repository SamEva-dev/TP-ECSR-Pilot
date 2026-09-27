import {
  ChangeDetectionStrategy,
  Component,
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
    status: new FormControl<SiteOperationalStatus>("active", {
      nonNullable: true,
    }),
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
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
        status: site?.status ?? "active",
      });
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(this.form.getRawValue());
  }
}
