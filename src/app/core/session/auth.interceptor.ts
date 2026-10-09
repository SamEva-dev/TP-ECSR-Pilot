import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, switchMap, throwError } from "rxjs";
import { environment } from "../../environments/environment";
import { AuthRefreshService } from "./auth-refresh.service";
import { AuthTokenStore } from "./auth-token.store";
import { SessionService } from "./session.service";

const AUTHGATE_PROTECTED_PREFIXES = [
  "/api/Users",
  "/api/pedagora/access",
  "/api/Roles",
  "/api/Permissions",
  "/api/admin",
  "/api/account/applications",
  "/api/Auth/change-password",
  "/api/Auth/logout",
  "/api/Auth/me",
];

function isAtOrBelowBase(url: string, base: string): boolean {
  const normalized = base.replace(/\/+$/, "");
  return url === normalized || url.startsWith(`${normalized}/`) || url.startsWith(`${normalized}?`);
}

function isProtectedAuthGatePath(path: string): boolean {
  return AUTHGATE_PROTECTED_PREFIXES.some(
    (prefix) =>
      path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`),
  );
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const tokens = inject(AuthTokenStore);
  const refresh = inject(AuthRefreshService);
  const router = inject(Router);
  const session = inject(SessionService);
  const token = tokens.accessToken();

  const isPedagoraApi = isAtOrBelowBase(request.url, environment.apiBaseUrl);
  const isAuthGate = isAtOrBelowBase(request.url, environment.authGateBaseUrl);
  const authGateBase = environment.authGateBaseUrl.replace(/\/+$/, "");
  const authGatePath = isAuthGate
    ? request.url.slice(authGateBase.length)
    : "";
  const isProtectedAuthGateCall = isAuthGate && isProtectedAuthGatePath(authGatePath);
  const shouldAuthorize = isPedagoraApi || isProtectedAuthGateCall;

  if (!shouldAuthorize || request.headers.has("Authorization")) {
    return next(request);
  }

  const authorizedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: { status?: number }) => {
      if (error?.status !== 401) {
        return throwError(() => error);
      }
      if (!tokens.getRefreshToken()) {
        tokens.clear();
        session.disconnect();
        void router.navigateByUrl("/connexion");
        return throwError(() => error);
      }

      return refresh.refreshAccessToken().pipe(
        switchMap((newToken) =>
          next(
            request.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` },
            }),
          ),
        ),
        catchError((retryError: { status?: number }) => {
          // A rejected refreshed token is invalid; other failures (403/5xx/network)
          // must retain their actual status and must not forcibly sign out the user.
          if (retryError?.status === 401) {
            tokens.clear();
            session.disconnect();
          }
          if (retryError?.status === 401 || !tokens.accessToken()) {
            void router.navigateByUrl("/connexion");
          }
          return throwError(() => retryError);
        }),
      );
    }),
  );
};
