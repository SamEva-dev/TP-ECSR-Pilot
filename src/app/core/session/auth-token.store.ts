import { Injectable, signal } from "@angular/core";

const ACCESS_TOKEN_KEY = "pedagora-pilot.auth.access-token";
const REFRESH_TOKEN_KEY = "pedagora-pilot.auth.refresh-token";
const REMEMBER_KEY = "pedagora-pilot.auth.remember";

@Injectable({ providedIn: "root" })
export class AuthTokenStore {
  private readonly accessTokenSignal = signal<string | null>(
    this.restoreAccessToken(),
  );
  readonly accessToken = this.accessTokenSignal.asReadonly();

  setTokens(
    accessToken: string,
    refreshToken?: string | null,
    rememberMe = false,
  ): void {
    this.clearStorageOnly();

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(REMEMBER_KEY, rememberMe ? "1" : "0");

    this.accessTokenSignal.set(accessToken);
  }

  getRefreshToken(): string | null {
    return (
      localStorage.getItem(REFRESH_TOKEN_KEY) ??
      sessionStorage.getItem(REFRESH_TOKEN_KEY)
    );
  }

  rememberMe(): boolean {
    return localStorage.getItem(REMEMBER_KEY) === "1";
  }

  clear(): void {
    this.clearStorageOnly();
    localStorage.removeItem(REMEMBER_KEY);
    this.accessTokenSignal.set(null);
  }

  private restoreAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem(ACCESS_TOKEN_KEY) ??
      sessionStorage.getItem(ACCESS_TOKEN_KEY)
    );
  }

  private clearStorageOnly(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
