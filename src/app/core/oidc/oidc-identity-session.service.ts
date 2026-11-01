import { Injectable, computed, signal } from '@angular/core';
import { OidcBrowserClient, OidcTokenResult } from './oidc-browser.client';

/** Ephemeral OIDC identity session, not a business authorization session.
 * Never grants memberships, roles or organization permissions.
 * Access tokens stay in memory, never localStorage/sessionStorage.
 */
export interface AuthenticatedOidcIdentity {
  subject: string;
  authenticated: true;
}

@Injectable({ providedIn: 'root' })
export class OidcIdentitySessionService {
  private readonly current = signal<AuthenticatedOidcIdentity | null>(null);
  private accessToken: string | null = null;
  private expiresAt = 0;
  private apiOrigin: string | null = null;
  private readonly clockSkewMs = 30_000;
  readonly identity = this.current.asReadonly();
  readonly authenticated = computed(() => this.current() !== null && this.accessToken !== null && Date.now() < this.expiresAt);

  constructor(private readonly client: OidcBrowserClient) {}

  /** Call ONLY from /auth/callback; request authorization using the intended API audience. */
  async completeCallback(apiBaseUrl: string): Promise<AuthenticatedOidcIdentity> {
    const { token } = await this.client.exchangeCallback();
    try {
      return await this.validateAndEstablish(apiBaseUrl, token);
    } finally {
      this.client.clearTest();
    }
  }

  async validateAndEstablish(apiBaseUrl: string, token: OidcTokenResult): Promise<AuthenticatedOidcIdentity> {
    this.clear();
    const api = new URL(apiBaseUrl);
    if (api.protocol !== 'https:' && !(api.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(api.hostname))) {
      throw new Error('OIDC_API_ORIGIN_INVALID');
    }
    if (!token.access_token || token.token_type?.toLowerCase() !== 'bearer' || !token.expires_in || token.expires_in <= 30) {
      throw new Error('OIDC_ACCESS_TOKEN_INVALID');
    }
    // Restrict this access token to the configured API. Never forward it to arbitrary URLs.
    const endpoint = new URL('/api/v1/oidc/identity', api.origin);
    const response = await fetch(endpoint.href, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token.access_token}` },
      credentials: 'omit', cache: 'no-store', redirect: 'error'
    });
    if (!response.ok) throw new Error(`OIDC_API_IDENTITY_HTTP_${response.status}`);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') throw new Error('OIDC_IDENTITY_INVALID');
    const identity = data as Record<string, unknown>;
    if (identity['authenticated'] !== true || typeof identity['subject'] !== 'string' || !identity['subject']) {
      throw new Error('OIDC_IDENTITY_INVALID');
    }
    this.accessToken = token.access_token;
    this.expiresAt = Date.now() + token.expires_in * 1000 - this.clockSkewMs;
    this.apiOrigin = api.origin;
    const result: AuthenticatedOidcIdentity = { authenticated: true, subject: identity['subject'] };
    this.current.set(result);
    return result;
  }

  /** Identity-scoped API call. A business endpoint still must enforce its own permissions. */
  async fetchFromOwnApi(path: string, init: RequestInit = {}): Promise<Response> {
    if (Date.now() >= this.expiresAt || !this.current() || !this.apiOrigin || !this.accessToken) {
      this.clear();
      throw new Error('OIDC_SESSION_EXPIRED');
    }
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw new Error('OIDC_API_PATH_INVALID');
    const target = new URL(path, this.apiOrigin);
    if (target.origin !== this.apiOrigin || target.username || target.password) throw new Error('OIDC_API_ORIGIN_MISMATCH');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.accessToken}`);
    return fetch(target.href, { ...init, headers, credentials: 'omit', redirect: 'error', cache: 'no-store' });
  }

  clear(): void {
    this.accessToken = null;
    this.expiresAt = 0;
    this.apiOrigin = null;
    this.current.set(null);
  }
}
