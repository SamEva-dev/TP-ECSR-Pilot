import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SUCCESS_HISTORY } from "../../core/mock-data/certification.mock";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";

@Component({
  selector: "app-success",
  imports: [RouterLink, TranslatePipe, ProgressBarComponent],
  templateUrl: "./success.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuccessComponent {
  private readonly route = inject(ActivatedRoute);
  readonly history = SUCCESS_HISTORY;
  readonly selectedPromotionId =
    this.route.snapshot.paramMap.get("promotionId");
  readonly selected = computed(
    () =>
      this.history.find((item) => item.id === this.selectedPromotionId) ?? null,
  );
  readonly global = computed(() => {
    const presented = this.history.reduce(
      (sum, item) => sum + item.presented,
      0,
    );
    const graduated = this.history.reduce(
      (sum, item) => sum + item.graduated,
      0,
    );
    return {
      presented,
      graduated,
      promotions: this.history.length,
      rate: presented ? Math.round((graduated / presented) * 1000) / 10 : 0,
    };
  });

  barWidth(value: number): string {
    return `${Math.max(0, Math.min(100, value))}%`;
  }
}
