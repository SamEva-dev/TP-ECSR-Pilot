import { ChangeDetectionStrategy, Component, input } from "@angular/core";
@Component({
  selector: "app-progress-bar",
  template: `<div
    [class]="
      'w-full overflow-hidden rounded-full bg-[#edf1f6] ' + heightClass()
    "
    role="progressbar"
    [attr.aria-valuenow]="value()"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="h-full rounded-full bg-[linear-gradient(90deg,#2c67a7_0%,#f6a51e_100%)]"
      [style.width.%]="safe()"
    ></div>
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  readonly value = input.required<number>();
  readonly heightClass = input("h-[9px]");
  safe() {
    return Math.max(0, Math.min(100, this.value()));
  }
}
