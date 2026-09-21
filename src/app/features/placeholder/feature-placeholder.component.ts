import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
@Component({
  selector: "app-feature-placeholder",
  imports: [TranslatePipe],
  template: `<section class="mx-auto max-w-[1450px]">
    <div class="rounded-[17px] border border-[#dfe5ec] bg-white p-8 shadow-sm">
      <h1 class="text-2xl font-extrabold">{{ titleKey | t }}</h1>
      <p class="mt-2 text-sm text-[#6c788b]">
        {{ "common.nextScreenPlaceholder" | t }}
      </p>
    </div>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  readonly titleKey = this.route.snapshot.data["titleKey"] as string;
}
