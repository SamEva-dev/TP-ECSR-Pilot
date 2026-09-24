import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, tap } from "rxjs";
import { environment } from "../../environments/environment";
import { AuthTokenStore } from "./auth-token.store";

export type AuthGatePreLoginStep =
  | "Password"
  | "Register"
  | "RegisterApplication"
  | "Error";

export interface AuthGatePreLoginResponse {
  nextStep: AuthGatePreLoginStep | string;
  error?: string | null;
}

export interface AuthGateLoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceFingerprint?: string;
}

export interface AuthGateLoginResponse {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  requiresMfa: boolean;
  mfaToken: string | null;
  passwordChangeRequired: boolean;
  passwordChangeBeforeUtc: string | null;
}

export interface AuthGateRegistrationRequest {
  email: string;
  password: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface AuthGateRegistrationResponse {
  userId: string;
  email: string;
  organizationId?: string | null;
  organizationCode?: string | null;
  organizationName?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  role?: string | null;
  status?: string | null;
  message?: string | null;
}

export interface AuthGateProvisioningStatusResponse {
  status: string;
  organizationId?: string | null;
  message?: string | null;
  canRetry?: boolean;
}

@Injectable({ providedIn: "root" })
export class AuthGateService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(AuthTokenStore);
  private readonly baseUrl = `${environment.authGateBaseUrl}/api/Auth`;

  prelogin(email: string): Observable<AuthGatePreLoginResponse> {
    return this.http.post<AuthGatePreLoginResponse>(`${this.baseUrl}/prelogin`, {
      email: email.trim().toLowerCase(),
      clientId: environment.authGateClientId,
    });
  }

  login(request: AuthGateLoginRequest): Observable<AuthGateLoginResponse> {
    return this.http
      .post<AuthGateLoginResponse>(`${this.baseUrl}/login`, {
        ...request,
        email: request.email.trim().toLowerCase(),
        clientId: environment.authGateClientId,
      })
      .pipe(
        tap((response) => {
          if (response.accessToken && !response.requiresMfa) {
            this.tokens.setTokens(
              response.accessToken,
              response.refreshToken,
              request.rememberMe === true,
            );
          }
        }),
      );
  }

  registerOrganization(
    request: AuthGateRegistrationRequest,
  ): Observable<AuthGateRegistrationResponse> {
    return this.http
      .post<AuthGateRegistrationResponse>(`${this.baseUrl}/register-with-tenant`, {
        clientId: environment.authGateClientId,
        ...request,
        email: request.email.trim().toLowerCase(),
      })
      .pipe(
        tap((response) => {
          if (response.accessToken) {
            this.tokens.setTokens(
              response.accessToken,
              response.refreshToken,
              true,
            );
          }
        }),
      );
  }

  provisioningStatus(
    email: string,
  ): Observable<AuthGateProvisioningStatusResponse> {
    const params = new HttpParams()
      .set("email", email.trim().toLowerCase())
      .set("clientId", environment.authGateClientId);

    return this.http.get<AuthGateProvisioningStatusResponse>(
      `${this.baseUrl}/provisioning-status`,
      { params },
    );
  }

  logout(): void {
    this.tokens.clear();
  }
}
