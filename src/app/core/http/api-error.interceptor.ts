import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { throwError } from "rxjs";
import { catchError } from "rxjs/operators";

export interface PedagoraApiError {
  code: string;
  status: number;
  traceId?: string;
  errors?: Record<string, string[]>;
  original: HttpErrorResponse;
}

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const body =
        error.error && typeof error.error === "object" ? error.error : {};
      const normalized: PedagoraApiError = {
        code:
          typeof body.code === "string"
            ? body.code
            : error.status === 0
              ? "NETWORK_UNAVAILABLE"
              : "UNEXPECTED_ERROR",
        status: error.status,
        traceId: typeof body.traceId === "string" ? body.traceId : undefined,
        errors: body.errors,
        original: error,
      };
      return throwError(() => normalized);
    }),
  );
