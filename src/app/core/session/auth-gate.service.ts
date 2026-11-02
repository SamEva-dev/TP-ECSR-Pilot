import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, tap } from "rxjs";
import { environment } from "../../environments/environment";
import { AuthTokenStore } from "./auth-token.store";

export type AuthGatePreLoginStep =
  "Password" | "Register" | "RegisterApplication" | "EmailConfirmationRequired" | "ProvisioningPending" | "Error";

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

export interface AuthGateTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  passwordChangeRequired: boolean;
  passwordChangeBeforeUtc: string | null;
}

export interface AuthGateVerifyMfaRequest {
  mfaToken: string;
  code: string;
  rememberDevice?: boolean;
  deviceFingerprint?: string;
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

export interface AuthGateMembership {
  organizationId: string;
  applicationCode: string;
  initialRole: string | null;
}

export interface AuthGateContextTokens {
  accessToken: string;
  refreshToken: string;
  organizationId: string;
}

@Injectable({ providedIn: "root" })
export class AuthGateService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(AuthTokenStore);
  private readonly baseUrl = `${environment.authGateBaseUrl}/api/Auth`;

  listContexts(): Observable<{ memberships: AuthGateMembership[] }> {
    return this.http.get<{ memberships: AuthGateMembership[] }>(
      `${environment.authGateBaseUrl}/api/account/applications/memberships`,
    );
  }

  selectContext(organizationId: string): Observable<AuthGateContextTokens> {
    return this.http.post<AuthGateContextTokens>(
      `${environment.authGateBaseUrl}/api/account/applications/context:select`,
      { organizationId },
    ).pipe(tap(response => {
      // Never replace a valid session before validating the selected tenant.
      // Server-side authorization remains authoritative; this prevents a
      // mismatched or stale token response from poisoning the local session.
      const payload = readJwtPayload(response?.accessToken);
      const currentPayload = readJwtPayload(this.tokens.accessToken());
      const currentSubject = currentPayload?.["sub"];
      // Switching tenant must never silently switch the globally authenticated identity.
      if (typeof currentSubject !== "string" || !currentSubject ||
          currentSubject !== payload?.["sub"]) {
        throw new Error("AUTHGATE_CONTEXT_IDENTITY_MISMATCH");
      }
      const tokenOrganization = payload?.["org_id"] ?? payload?.["organization_id"];
      const exp = payload?.["exp"];
      if (
        !response?.accessToken ||
        response.organizationId !== organizationId ||
        tokenOrganization !== organizationId ||
        typeof exp !== "number" || exp * 1000 <= Date.now() ||
        typeof payload?.["sub"] !== "string" || !payload["sub"]
      ) {
        throw new Error("AUTHGATE_CONTEXT_TOKEN_MISMATCH");
      }
      this.tokens.setTokens(response.accessToken, response.refreshToken, this.tokens.rememberMe());
    }));
  }

  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.authGateBaseUrl}/api/PasswordReset/request`,
      { email: email.trim().toLowerCase(), clientId: environment.authGateClientId },
    );
  }

  resetPassword(email: string, token: string, newPassword: string, confirmPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.authGateBaseUrl}/api/PasswordReset/reset`,
      { email: email.trim().toLowerCase(), token, newPassword, confirmPassword },
    );
  }

  validateEmail(email: string, token: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/validate-email`, {
      email: email.trim().toLowerCase(), token,
    });
  }

  prelogin(email: string): Observable<AuthGatePreLoginResponse> {
    return this.http.post<AuthGatePreLoginResponse>(
      `${this.baseUrl}/prelogin`,
      {
        email: email.trim().toLowerCase(),
        clientId: environment.authGateClientId,
      },
    );
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

  verifyMfa(
    request: AuthGateVerifyMfaRequest,
    rememberMe: boolean,
  ): Observable<AuthGateLoginResponse> {
    return this.http
      .post<AuthGateLoginResponse>(`${this.baseUrl}/verify-2fa`, request)
      .pipe(
        tap((response) => {
          if (response.accessToken) {
            this.tokens.setTokens(
              response.accessToken,
              response.refreshToken,
              rememberMe,
            );
          }
        }),
      );
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
    rememberMe: boolean,
  ): Observable<AuthGateTokenResponse> {
    return this.http
      .post<AuthGateTokenResponse>(`${this.baseUrl}/change-password`, {
        currentPassword,
        newPassword,
      })
      .pipe(
        tap((response) => {
          if (response.accessToken) {
            this.tokens.setTokens(
              response.accessToken,
              response.refreshToken,
              rememberMe,
            );
          }
        }),
      );
  }

  revokeSession(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {});
  }

  registerOrganization(
    request: AuthGateRegistrationRequest,
  ): Observable<AuthGateRegistrationResponse> {
    // Registration does not authenticate the browser. The caller redirects to login.
    return this.http.post<AuthGateRegistrationResponse>(
      `${this.baseUrl}/register-with-tenant`,
      {
        clientId: environment.authGateClientId,
        ...request,
        email: request.email.trim().toLowerCase(),
      },
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

/** Decode claims only to fail closed before storing a context token.
 * This is not JWT signature verification; AuthGate and the API validate it.
 */
function readJwtPayload(token: string | null | undefined): Record<string, unknown> | null {
  if (!token || typeof atob !== "function") return null;
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const parsed: unknown = JSON.parse(atob(padded));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
