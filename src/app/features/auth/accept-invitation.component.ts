import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import { AuthTokenStore } from "../../core/session/auth-token.store";
import { SessionService } from "../../core/session/session.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";

@Component({
  selector: "app-accept-invitation",
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-screen items-center justify-center bg-[var(--ecsr-page)] px-5 py-10">
      <section class="w-full max-w-lg rounded-2xl border border-[#d7dde6] bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-extrabold text-[#102847]">{{ "invitationAcceptance.title" | t }}</h1>
        @if (loading()) { <p class="mt-4" role="status">{{ "invitationAcceptance.processing" | t }}</p> }
        @if (errorKey()) { <p class="mt-4 text-red-700" role="alert">{{ errorKey() | t }}</p> }
      </section>
    </main>
  `,
})
export class AcceptInvitationComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tokens = inject(AuthTokenStore);
  private readonly session = inject(SessionService);
  readonly loading = signal(true);
  readonly errorKey = signal("");

  constructor() { void this.prepare(); }

  private async prepare(): Promise<void> {
    const token = this.route.snapshot.paramMap.get("token") ?? "";
    if (!token) { this.errorKey.set("invitationAcceptance.invalidLink"); this.loading.set(false); return; }
    try {
      const status = await firstValueFrom(this.http.post<{ email: string; existingActiveIdentity: boolean }>(
        `${environment.apiBaseUrl}/api/v1/access/invitations/prepare`, { token },
      ));
      if (!status.existingActiveIdentity) {
        // The invitation is still pending: password selection will perform acceptance.
        await this.router.navigate(["/change-password"], { replaceUrl: true, queryParams: { token } });
        return;
      }
      // Existing identities must authenticate before accepting an invitation.
      // The invitation token is not itself an AuthGate login credential.
      const invitationRoute = `/accept-invitation/${encodeURIComponent(token)}`;
      // A stored token can be expired or belong to someone else. Never attempt
      // acceptance until the session is valid and its email matches the invite.
      const connectedEmail = this.session.session()?.email?.trim().toLowerCase();
      if (!this.session.hasValidToken() || connectedEmail !== status.email.trim().toLowerCase()) {
        // If another identity is signed in, clear its session before switching.
        // Otherwise the HTTP interceptor would send the wrong user's bearer token.
        if (this.tokens.accessToken() && connectedEmail !== status.email.trim().toLowerCase()) {
          this.tokens.clear();
          this.session.disconnect();
        }
        await this.router.navigate(["/connexion"], { replaceUrl: true, queryParams: {
          email: status.email, returnUrl: invitationRoute,
        } });
        return;
      }
      await firstValueFrom(this.http.post(
        `${environment.apiBaseUrl}/api/v1/access/invitations/accept`, { token, password: null },
      ));
      // Access membership has changed. Reauthentication/context selection
      // obtains fresh claims, without retaining the old organization's rights.
      this.tokens.clear();
      this.session.disconnect();
      await this.router.navigate(["/connexion"], { replaceUrl: true, queryParams: { email: status.email } });
    } catch (error: unknown) {
      const e = error as { code?: string; original?: HttpErrorResponse };
      const code = e.original?.error?.error ?? e.original?.error?.code ?? e.code;
      this.errorKey.set(code === "ACCESS_INVITATION_INVALID_OR_EXPIRED" || code === "ACCESS_INVITATION_NOT_FOUND"
        ? "invitationAcceptance.invalidLink" : "invitationAcceptance.failed");
    } finally { this.loading.set(false); }
  }
}
