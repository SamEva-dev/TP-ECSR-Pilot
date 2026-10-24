import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";

@Component({
  selector: "app-email-confirmation-pending",
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-[var(--ecsr-page)] flex items-center justify-center p-6">
      <section class="w-full max-w-xl rounded-2xl border border-[#d7dde6] bg-white p-8 text-center shadow-sm">
        <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-100 text-[#e96c00]">
          <i class="ph ph-envelope-simple-check text-3xl" aria-hidden="true"></i>
        </div>
        <h1 class="mt-5 text-3xl font-bold text-[#102847]">{{ "auth.confirmEmail.title" | t }}</h1>
        <p class="mt-4 text-[#49627d]">{{ "auth.confirmEmail.description" | t }}</p>
        @if (email) {
          <p class="mt-3 break-words font-semibold text-[#102847]">{{ email }}</p>
        }
        <p class="mt-4 text-sm text-[#6a788b]">{{ "auth.confirmEmail.instructions" | t }}</p>
        <a [routerLink]="['/connexion']" [queryParams]="{ email: email || undefined }"
           class="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#ff7000] px-7 font-semibold text-white">
          {{ "auth.confirmEmail.backToLogin" | t }}
        </a>
      </section>
    </main>
  `,
})
export class EmailConfirmationPendingComponent {
  private readonly route = inject(ActivatedRoute);
  readonly email = this.route.snapshot.queryParamMap.get("email") ?? "";
}
