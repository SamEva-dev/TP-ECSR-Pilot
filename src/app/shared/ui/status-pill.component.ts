import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import type { StudentStatus } from "../../core/models/app.models";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
@Component({
  selector: "app-status-pill",
  imports: [TranslatePipe],
  template: `<span
    [class]="
      'inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ' +
      classes()
    "
    >{{ "common.studentStatus." + status() | t }}</span
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPillComponent {
  readonly status = input.required<StudentStatus>();
  classes() {
    return this.status() === "good"
      ? "bg-[#d8f8df] text-[#18a547]"
      : this.status() === "warning"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f22b2b]";
  }
}
