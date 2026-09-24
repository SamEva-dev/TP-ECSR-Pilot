import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { TrainingReferential } from "../../../core/models/referentials.models";

@Component({
  selector: "app-referential-compare-drawer",
  imports: [TranslatePipe],
  templateUrl: "./referential-compare-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferentialCompareDrawerComponent {
  readonly open = input(false);
  readonly left = input<TrainingReferential | null>(null);
  readonly right = input<TrainingReferential | null>(null);
  readonly closed = output<void>();

  delta(left: number, right: number): string {
    const value = right - left;
    return value === 0 ? "0" : value > 0 ? `+${value}` : `${value}`;
  }
}
