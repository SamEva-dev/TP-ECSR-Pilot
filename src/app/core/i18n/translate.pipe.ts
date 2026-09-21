import { Pipe, PipeTransform, inject } from "@angular/core";
import { TranslateService } from "./translate.service";

@Pipe({
  name: "t",
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(key: string, params?: Record<string, string | number>): string {
    // Read the signal so Angular refreshes the template when the locale changes.
    this.translate.locale();
    return this.translate.instant(key, params);
  }
}
