import { HttpInterceptorFn } from "@angular/common/http";
import { environment } from "../../environments/environment";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

export const idempotencyInterceptor: HttpInterceptorFn = (request, next) => {
  const method = request.method.toUpperCase();
  const baseUrl = environment.apiBaseUrl.replace(/\/+$/, "");
  const isPedagoraApi =
    request.url === baseUrl ||
    request.url.startsWith(`${baseUrl}/`) ||
    request.url.startsWith(`${baseUrl}?`);
  if (
    !isPedagoraApi ||
    !["POST", "PUT", "PATCH", "DELETE"].includes(method) ||
    request.headers.has("Idempotency-Key")
  )
    return next(request);
  return next(request.clone({ setHeaders: { "Idempotency-Key": uuid() } }));
};
