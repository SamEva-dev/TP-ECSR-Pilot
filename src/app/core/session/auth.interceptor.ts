import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { AuthTokenStore } from "./auth-token.store";

const AUTHGATE_PROTECTED_PREFIXES = [
  "/api/Users",
  "/api/pedagora/access",
  "/api/Roles",
  "/api/Permissions",
  "/api/admin",
  "/api/account/applications",
];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthTokenStore).accessToken();
  if (!token || request.headers.has("Authorization")) return next(request);

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

  // Public AuthGate endpoints (prelogin/login/register/refresh) deliberately stay token-free.
  if (!isPedagoraApi && !isProtectedAuthGateCall) return next(request);

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
