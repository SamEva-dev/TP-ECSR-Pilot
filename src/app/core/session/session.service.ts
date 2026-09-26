import { Injectable, computed, inject, signal } from "@angular/core";
import type { DemoSession, UserRole } from "../models/app.models";
import { AuthTokenStore } from "./auth-token.store";

const STORAGE_KEY = "tp-ecsr-pilot.session";
const LEGACY_KEY = "tp-ecsr-pilot.demo-session";

type JwtPayload = Record<string, unknown> & {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  org_id?: string;
  organization_id?: string;
  roles?: string | string[];
  role?: string | string[];
  permissions?: string | string[];
  permission?: string | string[];
  exp?: number;
};

@Injectable({ providedIn: "root" })
export class SessionService {
  private readonly tokens = inject(AuthTokenStore);
  private readonly sessionSignal = signal<DemoSession | null>(this.restore());
  private readonly promotionSignal = signal(
    this.sessionSignal()?.promotionId ?? "",
  );

  readonly session = this.sessionSignal.asReadonly();
  readonly promotionId = this.promotionSignal.asReadonly();
  readonly isConnected = computed(() => this.sessionSignal() !== null);
  readonly role = computed<UserRole>(
    () => this.sessionSignal()?.role ?? "direction",
  );

  hasValidToken(): boolean {
    const token = this.tokens.accessToken();
    const payload = token ? this.decodeJwt(token) : {};
    const session = this.sessionSignal();
    return (
      !!session &&
      !!payload.exp &&
      payload.exp * 1000 > Date.now() &&
      session.userId === payload.sub &&
      session.organizationId === (payload.org_id ?? payload.organization_id)
    );
  }

  connectAuthenticatedToken(accessToken: string): void {
    this.applyAuthenticatedToken(accessToken, "");
  }

  updateAuthenticatedToken(accessToken: string): void {
    this.applyAuthenticatedToken(accessToken, this.promotionSignal());
  }

  private applyAuthenticatedToken(accessToken: string, promotionId: string): void {
    const payload = this.decodeJwt(accessToken);
    if (
      !payload.exp ||
      payload.exp * 1000 <= Date.now() ||
      typeof payload.sub !== "string" ||
      typeof (payload.org_id ?? payload.organization_id) !== "string"
    ) {
      this.disconnect();
      this.tokens.clear();
      return;
    }
    this.connect(this.sessionFromPayload(payload, promotionId));
  }

  private sessionFromPayload(
    payload: JwtPayload,
    promotionId: string,
  ): DemoSession {
    const roles = this.readClaimValues(payload.roles, payload.role);
    const permissions = this.readClaimValues(
      payload.permissions,
      payload.permission,
    );

    const session: DemoSession = {
      authMode: "authgate",
      userId: typeof payload.sub === "string" ? payload.sub : undefined,
      organizationId:
        typeof payload.org_id === "string"
          ? payload.org_id
          : typeof payload.organization_id === "string"
            ? payload.organization_id
            : undefined,
      email: typeof payload.email === "string" ? payload.email : "",
      firstName:
        typeof payload.given_name === "string" ? payload.given_name : "",
      lastName:
        typeof payload.family_name === "string" ? payload.family_name : "",
      role: this.mapRole(roles),
      roles,
      permissions,
      // The real cohort is selected from /api/v1/me/workspace after login.
      promotionId,
    };

    return session;
  }

  setPromotion(id: string): void {
    this.promotionSignal.set(id);
    const s = this.sessionSignal();
    if (s) {
      const n = { ...s, promotionId: id };
      this.sessionSignal.set(n);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
    }
  }

  disconnect(): void {
    this.sessionSignal.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  }

  initials(): string {
    const s = this.sessionSignal();
    if (!s) return "";

    const first = s.firstName?.[0] ?? "";
    const last = s.lastName?.[0] ?? "";
    return `${first}${last}`.toUpperCase() || s.email.slice(0, 2).toUpperCase();
  }

  private connect(s: DemoSession): void {
    this.sessionSignal.set(s);
    this.promotionSignal.set(s.promotionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    localStorage.removeItem(LEGACY_KEY);
  }

  private restore(): DemoSession | null {
    if (typeof localStorage === "undefined") return null;

    const token = this.tokens.accessToken();
    const payload = token ? this.decodeJwt(token) : {};
    if (!payload.exp || payload.exp * 1000 <= Date.now()) {
      // Keep the refresh token available so authGuard can renew the session.
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const session = JSON.parse(raw) as DemoSession;
        if (
          session.authMode === "authgate" &&
          session.userId === payload.sub &&
          session.organizationId === (payload.org_id ?? payload.organization_id)
        ) {
          return this.sessionFromPayload(payload, session.promotionId ?? "");
        }
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    return null;
  }

  private decodeJwt(token: string): JwtPayload {
    try {
      const part = token.split(".")[1];
      if (!part) return {};
      const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        "=",
      );
      const json = decodeURIComponent(
        atob(padded)
          .split("")
          .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join(""),
      );
      return JSON.parse(json) as JwtPayload;
    } catch {
      return {};
    }
  }

  private readClaimValues(...values: unknown[]): string[] {
    const result = new Set<string>();

    for (const value of values) {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === "string" && item.trim()) result.add(item.trim());
        });
        continue;
      }

      if (typeof value !== "string" || !value.trim()) continue;

      const raw = value.trim();
      if (raw.startsWith("[")) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (typeof item === "string" && item.trim())
                result.add(item.trim());
            });
            continue;
          }
        } catch {
          // Fall through to scalar parsing.
        }
      }

      raw
        .split(/[ ,]+/)
        .filter(Boolean)
        .forEach((item) => result.add(item));
    }

    return [...result];
  }

  private mapRole(roles: string[]): UserRole {
    const normalized = roles.map((role) => role.toLowerCase());

    if (normalized.some((role) => role.includes("jury"))) return "jury";
    if (normalized.some((role) => role.includes("student"))) return "stagiaire";
    if (normalized.some((role) => role.includes("secretariat")))
      return "secretariat";
    if (
      normalized.some(
        (role) =>
          role.includes("trainer") || role.includes("pedagogicalmanager"),
      )
    ) {
      return "formateur";
    }

    if (
      normalized.some(
        (role) =>
          role.includes("organizationadministrator") ||
          role.includes("organizationdirection") ||
          role.includes("sitedirection") ||
          role.includes("platformadministrator"),
      )
    )
      return "direction";
    return "stagiaire";
  }
}
