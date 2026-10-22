import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from "@angular/core";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { PublishedBrandingService } from "../../core/branding/published-branding.service";
import { brandingForProgram } from "./program-branding.config";

@Component({
  selector: "app-program-logo",
  standalone: true,
  template: `
    <span class="flex min-w-0 items-center gap-3">
      <span
        [class]="iconContainerClass()"
        [style.background]="organizationBrand()?.secondaryColor ?? branding().accentColor"
        [attr.title]="workspace.program()?.name ?? branding().brandName"
      >
        @if (organizationLogo(); as logo) {
          <img [src]="logo" [alt]="organizationBrand()?.name || 'Logo'" class="max-h-full max-w-full object-contain" />
        } @else {
          <i [class]="'ph ' + branding().icon + ' text-[20px]'" aria-hidden="true"></i>
        }
      </span>

      <span [class]="labelClass()">
        @if (organizationBrand()?.name) {
          <span class="truncate">{{ organizationBrand()?.name }}</span>
        } @else {
          <span class="truncate">{{ branding().brandName }}</span>
          <span class="shrink-0 text-[#f8a11a]">Pilot</span>
        }
      </span>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramLogoComponent {
  readonly workspace = inject(WorkspaceContextService);
  readonly publishedBranding = inject(PublishedBrandingService);
  readonly organizationBrand = this.publishedBranding.configuration;
  readonly organizationLogo = computed(() => this.publishedBranding.assetUrl(this.organizationBrand()?.logoAssetId));
  readonly compact = input(false);
  readonly theme = input<"dark" | "light">("dark");
  readonly branding = computed(() =>
    brandingForProgram(this.workspace.program()),
  );

  readonly iconContainerClass = computed(() =>
    this.compact()
      ? "flex size-[34px] shrink-0 items-center justify-center rounded-full text-[#13233b] shadow-[0_5px_12px_rgba(248,161,26,0.18)]"
      : "flex size-[38px] shrink-0 items-center justify-center rounded-full text-[#13233b] shadow-[0_5px_12px_rgba(248,161,26,0.18)]",
  );

  readonly labelClass = computed(() => {
    const base = this.compact()
      ? "flex min-w-0 items-baseline gap-1 text-[17px] font-extrabold tracking-[-0.3px]"
      : "flex min-w-0 items-baseline gap-1 text-[19px] font-extrabold tracking-[-0.35px]";
    return `${base} ${this.theme() === "dark" ? "text-white" : "text-[#1d497d]"}`;
  });
}
