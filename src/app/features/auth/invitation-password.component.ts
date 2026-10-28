import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import { TranslatePipe } from "../../core/i18n/translate.pipe";

/** Password creation exclusively for a validated, unused invitation token. */
@Component({
  selector: "app-invitation-password",
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-screen items-center justify-center bg-[var(--ecsr-page)] px-5 py-10">
      <section class="w-full max-w-lg rounded-2xl border border-[#d7dde6] bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-extrabold text-[#102847]">{{ "invitationAcceptance.passwordTitle" | t }}</h1>
        <p class="mt-3 text-sm text-[#64748b]">{{ "invitationAcceptance.passwordDescription" | t }}</p>
        @if (errorKey()) { <p role="alert" class="mt-3 text-red-700">{{ errorKey() | t }}</p> }
        <form [formGroup]="form" (ngSubmit)="save()" class="mt-5 space-y-4">
          <label for="new-password" class="block text-sm font-semibold">{{ "invitationAcceptance.password" | t }}</label>
          <input id="new-password" type="password" autocomplete="new-password" formControlName="password" class="w-full rounded-lg border px-4 py-3" />
          <label for="confirm-password" class="block text-sm font-semibold">{{ "invitationAcceptance.confirmPassword" | t }}</label>
          <input id="confirm-password" type="password" autocomplete="new-password" formControlName="confirmPassword" class="w-full rounded-lg border px-4 py-3" />
          <p class="text-xs text-[#64748b]">{{ "invitationAcceptance.passwordHint" | t }}</p>
          <button type="submit" [disabled]="loading()" class="w-full rounded-lg bg-[#2a64a2] px-5 py-3 font-semibold text-white disabled:opacity-50">
            {{ (loading() ? "invitationAcceptance.processing" : "invitationAcceptance.submit") | t }}
          </button>
        </form>
      </section>
    </main>
  `,
})
export class InvitationPasswordComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly errorKey = signal("");
  readonly form = new FormGroup({
    password: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmPassword: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
  });

  async save(): Promise<void> {
    if (this.loading()) return;
    this.errorKey.set("");
    const token = this.route.snapshot.queryParamMap.get("token") ?? "";
    if (!token) { this.errorKey.set("invitationAcceptance.invalidLink"); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); this.errorKey.set("invitationAcceptance.passwordHint"); return; }
    const password = this.form.controls.password.value;
    if (password !== this.form.controls.confirmPassword.value) { this.errorKey.set("invitationAcceptance.mismatch"); return; }
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.http.post<{ email: string }>(
        `${environment.apiBaseUrl}/api/v1/access/invitations/accept`, { token, password },
      ));
      this.form.reset();
      await this.router.navigate(["/connexion"], { replaceUrl: true, queryParams: { email: result.email } });
    } catch (error: unknown) {
      const e = error as { code?: string; original?: HttpErrorResponse };
      const code = e.original?.error?.error ?? e.original?.error?.code ?? e.code;
      this.errorKey.set(code === "ACCESS_INVITATION_INVALID_OR_EXPIRED" || code === "ACCESS_INVITATION_NOT_FOUND"
        ? "invitationAcceptance.invalidLink" : "invitationAcceptance.failed");
    } finally { this.loading.set(false); }
  }
}
