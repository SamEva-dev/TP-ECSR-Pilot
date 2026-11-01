import { Injectable } from '@angular/core';

/** OIDC protocol layer only: never grants application roles or memberships. */
export interface OidcClientConfiguration {
  authority: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  apiAudience: string;
}
export interface OidcTokenResult {
  access_token: string;
  token_type: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
}
interface Pending { state: string; nonce: string; verifier: string; returnUrl: string; createdAt: number; }

@Injectable({ providedIn: 'root' })
export class OidcBrowserClient {
  private readonly key = 'itech.oidc.pending';
  private readonly tokenKey = 'itech.oidc.test-token';
  private config: OidcClientConfiguration | null = null;

  configure(config: OidcClientConfiguration): void { this.config = config; }

  async login(returnUrl = '/'): Promise<void> {
    this.identityProbeTask = undefined;
    const cfg = this.requiredConfig();
    const authority = new URL(cfg.authority);
    if (authority.protocol !== 'https:' || authority.username || authority.password) throw new Error('OIDC_AUTHORITY_INVALID');
    const redirect = new URL(cfg.redirectUri);
    if (redirect.origin !== location.origin || redirect.pathname !== '/auth/callback') throw new Error('OIDC_CALLBACK_INVALID');
    const verifier = this.random(48);
    const challenge = this.toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    const state = this.random(32);
    const nonce = this.random(32);
    const safe = this.safeReturn(returnUrl);
    const pending: Pending = { state, nonce, verifier, returnUrl: safe, createdAt: Date.now() };
    sessionStorage.setItem(this.key, JSON.stringify(pending));
    const url = new URL('connect/authorize', authority);
    for (const [k,v] of Object.entries({response_type:'code',client_id:cfg.clientId,redirect_uri:redirect.href,scope:cfg.scope,code_challenge:challenge,code_challenge_method:'S256',state,nonce})) url.searchParams.set(k,v);
    location.assign(url.href);
  }

  /** Runs on callback. Never writes legacy tokens. */
  async exchangeCallback(): Promise<{ token: OidcTokenResult; returnUrl: string }> {
    const cfg = this.requiredConfig();
    const raw = sessionStorage.getItem(this.key);
    sessionStorage.removeItem(this.key);
    if (!raw) throw new Error('OIDC_TRANSACTION_MISSING');
    let pending: Pending;
    try { pending = JSON.parse(raw) as Pending; } catch { throw new Error('OIDC_TRANSACTION_CORRUPT'); }
    const query = new URLSearchParams(location.search);
    if (query.has('error')) throw new Error('OIDC_AUTHORIZATION_REJECTED');
    const state = query.get('state');
    const code = query.get('code');
    if (!state || !pending.state || state !== pending.state || !pending.createdAt || Math.abs(Date.now()-pending.createdAt)>300000) throw new Error('OIDC_STATE_INVALID');
    if (!code || !pending.verifier) throw new Error('OIDC_CODE_MISSING');
    history.replaceState(history.state, '', location.pathname);
    const authority = new URL(cfg.authority);
    const response = await fetch(new URL('connect/token', authority), {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({grant_type:'authorization_code', client_id:cfg.clientId, code, redirect_uri:cfg.redirectUri, code_verifier:pending.verifier}).toString(),
      cache:'no-store', credentials:'omit'
    });
    if (!response.ok) throw new Error('OIDC_TOKEN_EXCHANGE_FAILED_'+response.status);
    const token = await response.json() as OidcTokenResult;
    if (!token.access_token || token.token_type.toLowerCase() !== 'bearer') throw new Error('OIDC_TOKEN_RESPONSE_INVALID');
    // OIDC identity signature/nonce verification must be delegated to a certified OIDC SDK
    // before enabling a full production login. This is a local protocol smoke test only.
    sessionStorage.setItem(this.tokenKey, JSON.stringify({clientId:cfg.clientId,expiresAt:Date.now()+(token.expires_in||0)*1000}));
    return {token,returnUrl:this.safeReturn(pending.returnUrl)};
  }

  /** Idempotent, in-memory smoke probe. Avoids a second callback consuming the already-used PKCE state. */
  private identityProbeTask?: Promise<string>;

  probeIdentity(apiBaseUrl: string): Promise<string> {
    return this.identityProbeTask ??= this.probeIdentityOnce(apiBaseUrl);
  }

  private async probeIdentityOnce(apiBaseUrl: string): Promise<string> {
    try {
      const { token } = await this.exchangeCallback();
      const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/api/v1/oidc/identity`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token.access_token}` },
        cache: 'no-store',
        credentials: 'omit'
      });
      if (!response.ok) {
        return `PKCE OK ; API OIDC refusée (HTTP ${response.status}). Voir les logs de l'API.`;
      }
      const identity = await response.json() as { authenticated?: boolean; subject?: string };
      if (identity.authenticated !== true || !identity.subject) {
        throw new Error('OIDC_IDENTITY_RESPONSE_INVALID');
      }
      return 'E2E identité OK : AuthGate → navigateur → callback PKCE → API. Subject confirmé (masqué).';
    } finally {
      // Never retain a usable access token in the local smoke-test client.
      this.clearTest();
    }
  }

  clearTest(): void { sessionStorage.removeItem(this.tokenKey); sessionStorage.removeItem(this.key); }
  private requiredConfig(): OidcClientConfiguration { if (!this.config) throw new Error('OIDC_CONFIG_MISSING'); return this.config; }
  private random(count: number): string {const bytes=new Uint8Array(count);crypto.getRandomValues(bytes);return this.toBase64Url(bytes);}
  private toBase64Url(bytes: Uint8Array): string {let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  private safeReturn(url: string): string { return /^\/(?!\/)[^\\]*$/.test(url) && !url.startsWith('/auth/callback') ? url : '/'; }
}
