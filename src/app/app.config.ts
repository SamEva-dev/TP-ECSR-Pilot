import { ApplicationConfig, provideBrowserGlobalErrorListeners } from "@angular/core";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter, withComponentInputBinding } from "@angular/router";
import { routes } from "./app.routes";
import { apiErrorInterceptor } from "./core/http/api-error.interceptor";
import { authInterceptor } from "./core/session/auth.interceptor";
import { idempotencyInterceptor } from "./core/http/idempotency.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([
      authInterceptor,
      idempotencyInterceptor,
      apiErrorInterceptor,
    ])),
    provideRouter(routes, withComponentInputBinding()),
  ],
};
