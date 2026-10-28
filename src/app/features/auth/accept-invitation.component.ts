import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
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
      // An existing identity must never receive a second password.
      await firstValueFrom(this.http.post(
        `${environment.apiBaseUrl}/api/v1/access/invitations/accept`, { token, password: null },
      ));
      await this.router.navigate(["/connexion"], { replaceUrl: true, queryParams: { email: status.email } });
    } catch (error: unknown) {
      const e = error as { code?: string; original?: HttpErrorResponse };
      const code = e.original?.error?.error ?? e.original?.error?.code ?? e.code;
      this.errorKey.set(code === "ACCESS_INVITATION_INVALID_OR_EXPIRED" || code === "ACCESS_INVITATION_NOT_FOUND"
        ? "invitationAcceptance.invalidLink" : "invitationAcceptance.failed");
    } finally { this.loading.set(false); }
  }
}
