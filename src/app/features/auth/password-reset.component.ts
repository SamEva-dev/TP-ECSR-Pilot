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
            <div class="relative"><input id="new-password" [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password" formControlName="password" class="h-[52px] w-full rounded-lg border border-[#d7dde6] px-4 pr-14" />
            <button type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? ('auth.passwordRecovery.hidePassword' | t) : ('auth.passwordRecovery.showPassword' | t)" [attr.aria-pressed]="showPassword()" class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#245d9b]">{{ (showPassword() ? "auth.passwordRecovery.hide" : "auth.passwordRecovery.show") | t }}</button></div>
            <p class="text-xs text-[#6a788b]">{{ "auth.passwordRecovery.requirements" | t }}</p>
            <ul class="space-y-1 text-xs" aria-live="polite">
              @for (rule of rules; track rule.key) { <li [class]="rule.ok(resetForm.controls.password.value) ? 'text-green-700' : 'text-[#6a788b]'">{{ rule.ok(resetForm.controls.password.value) ? "✓" : "○" }} {{ rule.key | t }}</li> }
            </ul>
            <label class="block text-sm font-semibold text-[#263b55]" for="confirm-password">{{ "auth.passwordRecovery.confirm" | t }}</label>
            <div class="relative"><input id="confirm-password" [type]="showConfirmation() ? 'text' : 'password'" autocomplete="new-password" formControlName="confirmPassword" class="h-[52px] w-full rounded-lg border border-[#d7dde6] px-4 pr-14" />
            <button type="button" (click)="showConfirmation.set(!showConfirmation())" [attr.aria-label]="showConfirmation() ? ('auth.passwordRecovery.hidePassword' | t) : ('auth.passwordRecovery.showPassword' | t)" class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#245d9b]">{{ (showConfirmation() ? "auth.passwordRecovery.hide" : "auth.passwordRecovery.show") | t }}</button></div>
            @if (resetForm.controls.confirmPassword.value) { <p class="text-xs" [class.text-green-700]="passwordsMatch" [class.text-red-600]="!passwordsMatch">{{ (passwordsMatch ? "auth.passwordRecovery.matches" : "auth.passwordRecovery.mismatch") | t }}</p> }
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
  readonly showPassword = signal(false);
  readonly showConfirmation = signal(false);
  readonly rules = [
    { key: "auth.passwordRecovery.ruleLength", ok: (v: string) => v.length >= 8 },
    { key: "auth.passwordRecovery.ruleUpper", ok: (v: string) => /[A-Z]/.test(v) },
    { key: "auth.passwordRecovery.ruleLower", ok: (v: string) => /[a-z]/.test(v) },
    { key: "auth.passwordRecovery.ruleDigit", ok: (v: string) => /[0-9]/.test(v) },
    { key: "auth.passwordRecovery.ruleSpecial", ok: (v: string) => /[\W_]/.test(v) },
  ];
  get passwordValid(): boolean { return this.rules.every(r => r.ok(this.resetForm.controls.password.value)); }
  get passwordsMatch(): boolean { return !!this.resetForm.controls.confirmPassword.value && this.resetForm.controls.password.value === this.resetForm.controls.confirmPassword.value; }
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
    if (!this.passwordValid) { this.errorKey.set("auth.passwordRecovery.requirementsNotMet"); return; }
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
