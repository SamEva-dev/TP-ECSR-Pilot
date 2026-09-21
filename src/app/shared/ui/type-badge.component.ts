import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import type { SessionType } from "../../core/models/app.models";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
@Component({
  selector: "app-type-badge",
  imports: [TranslatePipe],
  template: `<span
    [class]="
      'inline-flex shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ' +
      classes()
    "
    >{{ "common.sessionType." + type() | t }}</span
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeBadgeComponent {
  readonly type = input.required<SessionType>();
  classes() {
    return this.type() === "driving"
      ? "bg-[#e6f2ff] text-[#205a98]"
      : this.type() === "classroom"
        ? "bg-[#2b66a4] text-white"
        : this.type() === "presentation"
          ? "bg-[#f0f2f5] text-[#6b7280]"
          : "bg-[#ffe4e0] text-[#f04438]";
  }
}
