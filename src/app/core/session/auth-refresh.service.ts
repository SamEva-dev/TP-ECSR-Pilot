import { HttpBackend, HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, catchError, finalize, map, shareReplay, throwError } from "rxjs";
import { environment } from "../../environments/environment";
import { AuthTokenStore } from "./auth-token.store";
import { SessionService } from "./session.service";

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  passwordChangeRequired: boolean;
  passwordChangeBeforeUtc: string | null;
}

@Injectable({ providedIn: "root" })
export class AuthRefreshService {
  private readonly tokens = inject(AuthTokenStore);
  private readonly session = inject(SessionService);
  private readonly http = new HttpClient(inject(HttpBackend));
  private inFlight: Observable<string> | null = null;

  refreshAccessToken(): Observable<string> {
    if (this.inFlight) return this.inFlight;

    const refreshToken = this.tokens.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error("REFRESH_TOKEN_MISSING"));
    }

    const rememberMe = this.tokens.rememberMe();
    const accessToken = this.tokens.accessToken();
    const url = `${environment.authGateBaseUrl}/api/Auth/refresh`;

    this.inFlight = this.http
      .post<RefreshTokenResponse>(url, {
        refreshToken,
        accessToken: accessToken ?? null,
      })
      .pipe(
        map((response) => {
          const nextAccessToken = response?.accessToken ?? "";
          const nextRefreshToken = response?.refreshToken ?? "";
          if (!nextAccessToken || !nextRefreshToken) {
            throw new Error("REFRESH_TOKEN_RESPONSE_INVALID");
          }
          if (response?.passwordChangeRequired === true) {
            throw new Error("PASSWORD_CHANGE_REQUIRED");
          }
          this.tokens.setTokens(nextAccessToken, nextRefreshToken, rememberMe);
          this.session.updateAuthenticatedToken(nextAccessToken);
          return nextAccessToken;
        }),
        catchError((error) => {
          this.tokens.clear();
          this.session.disconnect();
          return throwError(() => error);
        }),
        finalize(() => {
          this.inFlight = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.inFlight;
  }
}
