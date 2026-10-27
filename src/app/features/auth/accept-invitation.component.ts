import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import { TranslatePipe } from "../../core/i18n/translate.pipe";

/** Public invitation acceptance: the bearer invitation token is validated server-side. */
@Component({
  selector: "app-accept-invitation",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-screen items-center justify-center bg-[var(--ecsr-page)] px-5 py-10">
      <section class="w-full max-w-lg rounded-2xl border border-[#d7dde6] bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-extrabold text-[#102847]">{{ "invitationAcceptance.title" | t }}</h1>
        @if (accepted()) {
          <p class="mt-4 text-green-700" role="status">{{ "invitationAcceptance.success" | t }}</p>
          <a routerLink="/connexion" class="mt-6 inline-flex rounded-lg bg-[#2a64a2] px-6 py-3 font-semibold text-white">{{ "invitationAcceptance.login" | t }}</a>
        } @else if (!token) {
          <p class="mt-4 text-red-700" role="alert">{{ "invitationAcceptance.invalidLink" | t }}</p>
        } @else {
          <p class="mt-3 text-sm text-[#64748b]">{{ "invitationAcceptance.description" | t }}</p>
          <form [formGroup]="form" (ngSubmit)="accept()" class="mt-5 space-y-4">
            <label class="block text-sm font-semibold text-[#334155]" for="invite-password">{{ "invitationAcceptance.password" | t }}</label>
            <input id="invite-password" type="password" autocomplete="new-password" formControlName="password"
              class="w-full rounded-lg border border-[#d7dde6] px-4 py-3" />
            <label class="block text-sm font-semibold text-[#334155]" for="invite-confirm">{{ "invitationAcceptance.confirmPassword" | t }}</label>
            <input id="invite-confirm" type="password" autocomplete="new-password" formControlName="confirmPassword"
              class="w-full rounded-lg border border-[#d7dde6] px-4 py-3" />
            <p class="text-xs text-[#64748b]">{{ "invitationAcceptance.passwordHint" | t }}</p>
            @if (errorKey()) { <p class="text-sm text-red-700" role="alert">{{ errorKey() | t }}</p> }
            <button type="submit" [disabled]="loading()" [attr.aria-busy]="loading()"
              class="w-full rounded-lg bg-[#2a64a2] px-5 py-3 font-semibold text-white disabled:opacity-50">
              {{ (loading() ? "invitationAcceptance.processing" : "invitationAcceptance.submit") | t }}
            </button>
          </form>
        }
      </section>
    </main>
  `,
})
export class AcceptInvitationComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly token = this.route.snapshot.paramMap.get("token") ?? "";
  readonly loading = signal(false);
  readonly accepted = signal(false);
  readonly errorKey = signal("");
  readonly form = new FormGroup({
    password: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmPassword: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
  });

  async accept(): Promise<void> {
    if (this.loading() || this.accepted()) return;
    this.errorKey.set("");
    if (!this.token) { this.errorKey.set("invitationAcceptance.invalidLink"); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); this.errorKey.set("invitationAcceptance.passwordHint"); return; }
    const password = this.form.controls.password.value;
    if (password !== this.form.controls.confirmPassword.value) {
      this.errorKey.set("invitationAcceptance.mismatch"); return;
    }
    this.loading.set(true);
    try {
      await firstValueFrom(this.http.post<{ userId: string; status: string }>(
        `${environment.apiBaseUrl}/api/v1/access/invitations/accept`,
        { token: this.token, password },
      ));
      this.form.reset();
      this.accepted.set(true);
    } catch (error: unknown) {
      const normalized = error as { code?: string; status?: number; original?: HttpErrorResponse };
      const serverCode = normalized.original?.error?.error ?? normalized.original?.error?.code ?? normalized.code;
      if (serverCode === "ACCESS_INVITATION_INVALID_OR_EXPIRED" || serverCode === "ACCESS_INVITATION_NOT_FOUND") {
        this.errorKey.set("invitationAcceptance.invalidLink");
      } else if (serverCode === "ACCESS_INVITATION_PASSWORD_REQUIRED") {
        this.errorKey.set("invitationAcceptance.passwordHint");
      } else {
        this.errorKey.set("invitationAcceptance.failed");
      }
    } finally {
      this.loading.set(false);
    }
  }
}
