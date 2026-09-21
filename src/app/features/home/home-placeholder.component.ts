import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";

@Component({
  selector: "app-home-placeholder",
  imports: [RouterLink, TranslatePipe],
  template: `
    <main
      class="flex min-h-screen items-center justify-center bg-[var(--ecsr-page)] p-6"
    >
      <section
        class="w-full max-w-xl rounded-2xl bg-white p-10 text-center shadow-lg"
      >
        <div
          class="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--ecsr-orange)]"
        >
          <i class="ph ph-car text-2xl"></i>
        </div>
        <h1 class="mt-5 text-2xl font-bold">
          {{ "home.placeholderTitle" | t }}
        </h1>
        <p class="mt-2 text-[var(--ecsr-muted)]">
          {{ "home.placeholderBody" | t }}
        </p>
        <a
          routerLink="/connexion"
          class="mt-6 inline-flex rounded-lg bg-[var(--ecsr-action-blue)] px-5 py-3 font-semibold text-white"
        >
          TP ECSR Pilot
        </a>
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePlaceholderComponent {}
