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

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const tokens = inject(AuthTokenStore);
  const refresh = inject(AuthRefreshService);
  const router = inject(Router);
  const session = inject(SessionService);
  const token = tokens.accessToken();

  const isPedagoraApi = request.url.startsWith(environment.apiBaseUrl);
  const isAuthGate = request.url.startsWith(environment.authGateBaseUrl);
  const authGatePath = isAuthGate
    ? request.url.slice(environment.authGateBaseUrl.length)
    : "";
  const isProtectedAuthGateCall =
    isAuthGate &&
    AUTHGATE_PROTECTED_PREFIXES.some((prefix) =>
      authGatePath.startsWith(prefix),
    );
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
        catchError(() => {
          void router.navigateByUrl("/connexion");
          return throwError(() => error);
        }),
      );
    }),
  );
};
