import { Injectable, inject } from "@angular/core";
import { TranslateService } from "../i18n/translate.service";

export interface BackendApiError {
  code?: string;
  title?: string;
  traceId?: string;
  parameters?: Record<string, string | number>;
}

@Injectable({ providedIn: "root" })
export class ApiErrorService {
  private readonly translate = inject(TranslateService);

  message(error: BackendApiError | null | undefined): string {
    const code = error?.code || "COMMON_UNEXPECTED_ERROR";
    const key = `backendErrors.${code}`;
    const translated = this.translate.instant(key, error?.parameters);
    return translated === key
      ? this.translate.instant("backendErrors.COMMON_UNEXPECTED_ERROR")
      : translated;
  }
}
