import { HttpInterceptorFn } from "@angular/common/http";

const ACCESS_TOKEN_KEY = "pedagora-pilot.auth.access-token";

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (typeof localStorage === "undefined") return next(request);
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token || request.headers.has("Authorization")) return next(request);
  return next(
    request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
