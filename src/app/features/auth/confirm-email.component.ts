import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { AuthGateService } from "../../core/session/auth-gate.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";

@Component({
  selector: "app-confirm-email",
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-[var(--ecsr-page)] flex items-center justify-center p-6">
      <section class="w-full max-w-xl rounded-2xl border border-[#d7dde6] bg-white p-8 text-center shadow-sm">
        <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-100 text-[#e96c00]">
          <i class="ph ph-envelope-simple-check text-3xl" aria-hidden="true"></i>
        </div>
        <h1 class="mt-5 text-3xl font-bold text-[#102847]">{{ 'auth.confirmEmail.title' | t }}</h1>
        @if (working()) {
          <p class="mt-4 text-[#49627d]" role="status">{{ 'auth.confirmEmail.verifying' | t }}</p>
        } @else if (success()) {
          <p class="mt-4 text-[#49627d]" role="status">{{ 'auth.confirmEmail.verified' | t }}</p>
        } @else {
          <p class="mt-4 text-red-700" role="alert">{{ 'auth.confirmEmail.invalid' | t }}</p>
        }
        <a [routerLink]="['/connexion']" [queryParams]="{ email: email || undefined }"
           class="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#ff7000] px-7 font-semibold text-white">
          {{ 'auth.confirmEmail.backToLogin' | t }}
        </a>
      </section>
    </main>
  `,
})
export class ConfirmEmailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authGate = inject(AuthGateService);
  readonly email = this.route.snapshot.queryParamMap.get("email") ?? "";
  readonly working = signal(true);
  readonly success = signal(false);

  constructor() {
    void this.confirm();
  }

  private async confirm(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get("token") ?? "";
    if (!this.email || !token) {
      this.working.set(false);
      return;
    }
    try {
      const result = await firstValueFrom(this.authGate.validateEmail(this.email, token));
      this.success.set(result.success === true);
    } catch {
      this.success.set(false);
    } finally {
      this.working.set(false);
    }
  }
}
