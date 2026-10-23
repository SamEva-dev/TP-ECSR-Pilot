import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { AuthGateService } from "../../core/session/auth-gate.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";

@Component({
  selector: "app-password-reset",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-[var(--ecsr-page)] px-5 py-16">
      <section class="mx-auto max-w-lg rounded-xl border border-[#d7dde6] bg-white p-8">
        <h1 class="text-2xl font-extrabold text-[#102847]">{{ "auth.passwordRecovery.title" | t }}</h1>
        @if (!hasToken()) {
          <p class="mt-3 text-sm text-[#6a788b]">{{ "auth.passwordRecovery.emailHint" | t }}</p>
          <form [formGroup]="requestForm" (ngSubmit)="submitRequest()" class="mt-6 space-y-4">
            <label class="block text-sm font-semibold text-[#263b55]" for="reset-email">{{ "auth.email" | t }}</label>
            <input id="reset-email" type="email" autocomplete="email" formControlName="email" class="h-[52px] w-full rounded-lg border border-[#d7dde6] px-4" />
            @if (requestForm.controls.email.touched && requestForm.controls.email.invalid) {
              <p class="text-sm text-red-600">{{ "auth.passwordRecovery.invalidEmail" | t }}</p>
            }
            <button type="submit" [disabled]="loading()" class="w-full rounded-lg bg-[var(--ecsr-orange-strong)] p-4 font-semibold text-white disabled:opacity-50">{{ "auth.passwordRecovery.send" | t }}</button>
          </form>
        } @else {
          <form [formGroup]="resetForm" (ngSubmit)="submitReset()" class="mt-6 space-y-4">
            <label class="block text-sm font-semibold text-[#263b55]" for="new-password">{{ "auth.passwordRecovery.newPassword" | t }}</label>
            <input id="new-password" type="password" autocomplete="new-password" formControlName="password" class="h-[52px] w-full rounded-lg border border-[#d7dde6] px-4" />
            <label class="block text-sm font-semibold text-[#263b55]" for="confirm-password">{{ "auth.passwordRecovery.confirm" | t }}</label>
            <input id="confirm-password" type="password" autocomplete="new-password" formControlName="confirmPassword" class="h-[52px] w-full rounded-lg border border-[#d7dde6] px-4" />
            <button type="submit" [disabled]="loading()" class="w-full rounded-lg bg-[var(--ecsr-orange-strong)] p-4 font-semibold text-white disabled:opacity-50">{{ "auth.passwordRecovery.save" | t }}</button>
          </form>
        }
        @if (errorKey()) { <p role="alert" class="mt-4 text-sm text-red-600">{{ errorKey() | t }}</p> }
        @if (successKey()) { <p role="status" class="mt-4 text-sm text-green-700">{{ successKey() | t }}</p> }
        <a routerLink="/connexion" class="mt-6 inline-block text-sm font-semibold text-[#245d9b]">{{ "auth.passwordRecovery.back" | t }}</a>
      </section>
    </main>
  `,
})
export class PasswordResetComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authGate = inject(AuthGateService);
  readonly token = this.route.snapshot.queryParamMap.get("token") ?? "";
  readonly hasToken = signal(this.token.length > 0);
  readonly loading = signal(false);
  readonly errorKey = signal("");
  readonly successKey = signal("");
  readonly requestForm = new FormGroup({
    email: new FormControl(this.route.snapshot.queryParamMap.get("email") ?? "", { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  readonly resetForm = new FormGroup({
    password: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmPassword: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
  });

  async submitRequest(): Promise<void> {
    this.errorKey.set(""); this.successKey.set("");
    if (this.requestForm.invalid) { this.requestForm.markAllAsTouched(); this.errorKey.set("auth.passwordRecovery.invalidEmail"); return; }
    this.loading.set(true);
    try {
      await firstValueFrom(this.authGate.requestPasswordReset(this.requestForm.controls.email.value));
      this.successKey.set("auth.passwordRecovery.sent");
    } catch {
      this.errorKey.set("auth.passwordRecovery.failed");
    } finally { this.loading.set(false); }
  }

  async submitReset(): Promise<void> {
    this.errorKey.set(""); this.successKey.set("");
    const email = this.route.snapshot.queryParamMap.get("email") ?? "";
    if (!email || !this.token) { this.errorKey.set("auth.passwordRecovery.invalidLink"); return; }
    if (this.resetForm.controls.password.value.length < 8) { this.errorKey.set("auth.passwordRecovery.short"); return; }
    if (this.resetForm.invalid || this.resetForm.controls.password.value !== this.resetForm.controls.confirmPassword.value) {
      this.errorKey.set("auth.passwordRecovery.mismatch"); return;
    }
    this.loading.set(true);
    try {
      await firstValueFrom(this.authGate.resetPassword(email, this.token, this.resetForm.controls.password.value, this.resetForm.controls.confirmPassword.value));
      this.resetForm.reset();
      this.successKey.set("auth.passwordRecovery.success");
    } catch { this.errorKey.set("auth.passwordRecovery.failed"); }
    finally { this.loading.set(false); }
  }
}
