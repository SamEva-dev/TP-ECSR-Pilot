import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { TranslateService } from "./core/i18n/translate.service";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  template: "<router-outlet />",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // Instantiation at app startup initializes <html lang="…"> from the saved locale.
  private readonly translate = inject(TranslateService);
}
