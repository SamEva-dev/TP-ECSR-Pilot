import { Injectable, computed, signal } from '@angular/core';
import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';
import { environment } from '../../environments/environment';

/** Session OIDC de l'application, distincte des autorisations métier legacy.
 * Le SDK vérifie state, nonce, issuer, ID token et JWKS durant le callback.
 * Aucun rôle n'est dérivé du jeton d'identité.
 */

const OIDC_ALLOWED_HUB_PATHS = ["/hubs/notifications"].map(path => path.toLowerCase());
const OIDC_REQUIRES_WORKSPACE = true;

export interface OidcWorkspace { id: string; label: string; active?: boolean; roles?: string[]; }
export interface OidcBusinessBootstrap {
  subject: string;
  state: string;
  workspaces: OidcWorkspace[];
  selectedWorkspaceId?: string | null;
  permissions?: string[];
  roles?: string[];
  permissionsResolved: boolean;
  businessSessionEstablished: boolean;
  version?: number;
  profile?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class OidcApplicationSessionService {
  private readonly manager = new UserManager({
    authority: environment.oidc.authority,
    client_id: environment.oidc.clientId,
    redirect_uri: environment.oidc.redirectUri,
    response_type: 'code',
    scope: environment.oidc.scope,
    loadUserInfo: false,
    automaticSilentRenew: false, // AuthGate ne propose pas encore refresh_token/end_session.
    monitorSession: false,
    userStore: new WebStorageStateStore({ store: sessionStorage }),
    stateStore: new WebStorageStateStore({ store: sessionStorage }),
    post_logout_redirect_uri: `${location.origin}/auth/logout-callback`,
  });
  private readonly context = signal<OidcBusinessBootstrap | null>(null);
  readonly bootstrapResult = this.context.asReadonly();
  readonly ready = computed(() => this.context()?.businessSessionEstablished === true &&
    this.context()?.permissionsResolved === true && this.context()?.state === 'ready');
  private pendingCallback?: Promise<{ response: OidcBusinessBootstrap; returnUrl: string }>;
  private pendingRestore?: Promise<OidcBusinessBootstrap | null>;
  private readonly ownApi = new URL(environment.apiBaseUrl);
  private readonly workspaceStoreKey = `itech.oidc.workspace.${environment.oidc.clientId}`;
  private readonly reauthAttemptKey = `itech.oidc.reauth.${environment.oidc.clientId}`;

  /** One channel per OIDC client, never shared across applications. No credentials in messages. */
  private readonly logoutChannel: BroadcastChannel | null =
    typeof BroadcastChannel === 'undefined' ? null :
    new BroadcastChannel(`itech.oidc.logout.${environment.oidc.clientId}`);

  constructor() {
    this.logoutChannel?.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (!event.data || typeof event.data !== 'object' ||
          (event.data as { action?: unknown }).action !== 'signout') return;
      this.invalidateBusinessContext();
      // A different tab signed out. Remove only this application's local OIDC user.
      // Do not call clearLocal(): it broadcasts again and could create a loop.
      void this.manager.removeUser().catch(() => this.invalidateBusinessContext());
    });
    this.manager.events.addAccessTokenExpired(() => this.invalidateBusinessContext());
    this.manager.events.addUserUnloaded(() => this.invalidateBusinessContext());
    if (this.ownApi.protocol !== 'https:' &&
        !(this.ownApi.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(this.ownApi.hostname))) {
      throw new Error('OIDC_API_HTTPS_REQUIRED');
    }
  }

  async begin(returnUrl = '/', emailHint?: string): Promise<void> {
    // Ne jamais réutiliser les claims d'un JWT historique pour une connexion OIDC.
    this.context.set(null);
    await this.manager.signinRedirect({
      state: { returnUrl: this.localReturn(returnUrl) },
      ...(emailHint && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailHint.trim())
        ? { login_hint: emailHint.trim().toLowerCase() } : {}),
    });
  }

  /** Appel unique au callback. Idempotent contre le double rendu Angular. */
  complete(): Promise<{ response: OidcBusinessBootstrap; returnUrl: string }> {
    return this.pendingCallback ??= this.completeOnce();
  }

  private async completeOnce(): Promise<{ response: OidcBusinessBootstrap; returnUrl: string }> {
    try {
      // The authorization code can be redeemed exactly once. After a successful
      // exchange, clear code/state from the URL BEFORE calling the product API.
      // If bootstrap fails, retry only the API with the stored, verified OIDC user.
      const query = new URL(location.href).searchParams;
      const hasAuthorizationResponse = query.has('code') || query.has('state') || query.has('error');
      const user = hasAuthorizationResponse
        ? await this.manager.signinRedirectCallback()
        : await this.manager.getUser();
      if (!user || user.expired !== false || !user.access_token || !user.profile.sub) {
        throw new Error('OIDC_CALLBACK_SESSION_MISSING');
      }
      if (hasAuthorizationResponse) history.replaceState(history.state, '', '/auth/callback');
      sessionStorage.removeItem(this.reauthAttemptKey);
      const state = user.state as { returnUrl?: unknown } | undefined;
      const response = await this.bootstrap(user);
      return { response, returnUrl: this.localReturn(state?.returnUrl) };
    } catch (error) {
      this.context.set(null);
      // A failed callback or bootstrap must not keep a permanently rejected promise.
      // If the token exchange succeeded, restore() may retry API bootstrap safely.
      this.pendingCallback = undefined;
      throw error;
    }
  }

  /** A validated OIDC identity may retry business bootstrap without replaying the code. */
  async canResumeCallback(): Promise<boolean> {
    const user = await this.manager.getUser();
    return !!user && user.expired === false && !!user.access_token && !!user.profile.sub;
  }

  async restore(): Promise<OidcBusinessBootstrap | null> {
    const user = await this.manager.getUser();
    if (!user || user.expired !== false) {
      this.invalidateBusinessContext();
      return null;
    }
    return this.bootstrap(user);
  }

  async selectWorkspace(workspaceId: string): Promise<OidcBusinessBootstrap> {
    const current = this.context();
    if (!current || !current.workspaces.some(w => w.id.toLowerCase() === workspaceId.toLowerCase() && w.active !== false)) {
      throw new Error('OIDC_WORKSPACE_NOT_AVAILABLE');
    }
    const user = await this.verifiedUser();
    // The server's context response does not repeat the discovery list.
    // Reuse ONLY the workspaces returned by the authenticated discovery endpoint;
    // the selected identifier is accepted only after a successful server POST.
    try {
      const response = await this.request('/api/v1/session/context', user, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      }, false);
      // Never replace a verified workspace by a different one sent by the server.
      if (response.selectedWorkspaceId && response.selectedWorkspaceId.toLowerCase() !== workspaceId.toLowerCase()) {
        throw new Error('OIDC_WORKSPACE_CONTEXT_MISMATCH');
      }
      const scoped: OidcBusinessBootstrap = {
        ...response,
        workspaces: current.workspaces,
        selectedWorkspaceId: workspaceId,
      };
      this.context.set(scoped);
      this.rememberWorkspace(scoped.subject, workspaceId);
      return scoped;
    } catch (error) {
      // A revoked membership or failed context switch must never retain old privileges.
      this.context.set(null);
      this.forgetWorkspace();
      throw error;
    }
  }

  /** Accepts a server-verified invitation, never a client-provided user id or role. */
  async acceptInvitation(invitationToken: string): Promise<OidcBusinessBootstrap> {
    const token = invitationToken.trim();
    if (!token || token.length > 4096) throw new Error('PEDAGORA_INVITATION_TOKEN_INVALID');
    const user = await this.verifiedUser();
    const target = new URL('/api/v1/oidc/registration/invitation/accept', this.ownApi.origin);
    if (target.origin !== this.ownApi.origin) throw new Error('OIDC_CROSS_ORIGIN_BLOCKED');
    const response = await fetch(target.href, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invitationToken: token }),
      credentials: 'omit', cache: 'no-store', redirect: 'error',
    });
    if (!response.ok) throw new Error(`PEDAGORA_INVITATION_HTTP_${response.status}`);
    // Invitation acceptance is not authorization. Re-resolve actual server permissions.
    this.context.set(null);
    this.forgetWorkspace();
    return await this.bootstrap(user);
  }

  /** No legacy JWT, role, or front-end defaults are trusted in OIDC mode. */
  async ensureReady(): Promise<boolean> {
    if (this.ready()) {
      const user = await this.manager.getUser();
      if (user && user.expired === false && user.profile.sub?.toLowerCase() ===
          this.context()?.subject.toLowerCase()) return true;
      this.context.set(null);
    }
    if (!this.pendingRestore) {
      this.pendingRestore = this.restore()
        .catch(() => null)
        .finally(() => { this.pendingRestore = undefined; });
    }
    await this.pendingRestore;
    if (this.ready()) return true;
    // A previously authenticated user with an expired token can reauthorize
    // through the existing AuthGate browser SSO cookie. Do not redirect a new
    // user: the application's prelogin/registration flow must remain the entry.
    const staleUser = await this.manager.getUser();
    if (staleUser?.expired === true && staleUser.profile.sub) {
      await this.reauthorizeOnce();
    }
    return false;
  }

  /** At most one normal OIDC redirect per minute; never use an iframe or fake refresh token. */
  private async reauthorizeOnce(): Promise<void> {
    const now = Date.now();
    const last = Number(sessionStorage.getItem(this.reauthAttemptKey) ?? '0');
    if (Number.isFinite(last) && last > 0 && now - last < 60_000) return;
    sessionStorage.setItem(this.reauthAttemptKey, String(now));
    this.invalidateBusinessContext();
    try {
      await this.begin(this.localReturn(location.pathname + location.search));
    } catch {
      // Keep the rate limit on a failed redirect, avoiding a navigation loop.
      this.invalidateBusinessContext();
    }
  }

  hasPermission(permission: string): boolean {
    return this.ready() && (this.context()?.permissions ?? []).includes(permission);
  }

  hasRole(role: string): boolean {
    if (!this.ready()) return false;
    const result = this.context();
    // Roles must come from the *selected context response*, not a previous listing.
    const scopedRoles = result?.roles ?? [];
    return scopedRoles.some(value => value.toLowerCase() === role.toLowerCase());
  }

  /** Access token is only available to this application's own API after server authorization. */
  async accessTokenForApi(requestUrl: string): Promise<string | null> {
    if (!this.ready()) return null;
    let target: URL;
    if (!/^https?:\/\//i.test(requestUrl)) return null;
    try { target = new URL(requestUrl); }
    catch { return null; }
    if (target.origin !== this.ownApi.origin ||
        !target.pathname.startsWith('/api/')) return null;
    const user = await this.manager.getUser();
    if (!user || user.expired !== false || !user.access_token ||
        user.profile.sub?.toLowerCase() !== this.context()?.subject.toLowerCase()) {
      this.context.set(null);
      return null;
    }
    return user.access_token;
  }

  /**
   * URL strictly restricted to this product's realtime hubs. Workspace is a
   * selector, never an authorization grant; the hub validates membership.
   * Never put the access token in the URL: SignalR owns transport negotiation.
   */
  authorizedHubEndpoint(inputUrl: string): string | null {
    if (!this.ready()) return null;
    let target: URL;
    try { target = new URL(inputUrl); } catch { return null; }
    if (target.origin !== this.ownApi.origin ||
        !OIDC_ALLOWED_HUB_PATHS.includes(target.pathname.toLowerCase()) ||
        target.searchParams.has('access_token') || target.searchParams.has('workspaceId')) return null;
    if (OIDC_REQUIRES_WORKSPACE) {
      const workspaceId = this.context()?.selectedWorkspaceId;
      if (!workspaceId || !this.context()?.workspaces.some(w =>
          w.active !== false && w.id.toLowerCase() === workspaceId.toLowerCase())) return null;
      target.searchParams.set('workspaceId', workspaceId);
    }
    return target.href;
  }

  /** Only return a token after validating the exact hub URL and current subject. */
  async accessTokenForHub(inputUrl: string): Promise<string> {
    if (!this.authorizedHubEndpoint(inputUrl)) throw new Error('OIDC_HUB_CONTEXT_UNAVAILABLE');
    const user = await this.verifiedUser();
    if (user.profile.sub?.toLowerCase() !== this.context()?.subject.toLowerCase()) {
      this.context.set(null);
      throw new Error('OIDC_SUBJECT_CHANGED');
    }
    return user.access_token;
  }

  /** Local sign-out leaves the central AuthGate cookie intact (other apps remain signed in). */
  async clearLocal(): Promise<void> {
    this.context.set(null);
    this.forgetWorkspace();
    try {
      await this.manager.removeUser();
    } finally {
      this.announceSignout();
    }
  }

  /** Browser redirect to AuthGate end-session; requires explicit confirmation at AuthGate. */
  async signOutGlobally(): Promise<void> {
    this.context.set(null);
    this.forgetWorkspace();
    // Clear this application's other tabs before leaving for AuthGate.
    this.announceSignout();
    try {
      await this.manager.signoutRedirect();
    } catch (error) {
      // A failed central logout must not leave a privileged local session active.
      await this.manager.removeUser();
      throw error;
    }
  }

  /** Process the OpenID Provider's state-checked post-logout redirect. */
  async completeGlobalSignOut(): Promise<void> {
    try {
      await this.manager.signoutRedirectCallback();
    } finally {
      await this.clearLocal();
    }
  }

  private async bootstrap(user: User): Promise<OidcBusinessBootstrap> {
    try {
      const response = await this.request('/api/v1/session/bootstrap', user);
      this.context.set(response);
      // One and only one active workspace: proceed straight to the product.
      // The context POST still checks membership and all effective permissions.
      if (response.state === 'select_workspace') {
        const available = response.workspaces.filter(workspace => workspace.active !== false);
        if (available.length === 1) return await this.selectWorkspace(available[0].id);
      }
      const remembered = this.recalledWorkspace(response.subject, response);
      if (response.state === 'select_workspace' && remembered) {
        try {
          // Revalidate on the API after EACH reload. Never restore permissions from storage.
          return await this.selectWorkspace(remembered);
        } catch {
          this.context.set(response);
          this.forgetWorkspace();
        }
      }
      if (response.state === 'no_access' || response.workspaces.length === 0) this.forgetWorkspace();
      return response;
    } catch (error) {
      this.context.set(null);
      throw error;
    }
  }

  /** Stores only the verified workspace identifier, never roles, tokens or permissions. */
  private rememberWorkspace(subject: string, workspaceId: string): void {
    sessionStorage.setItem(this.workspaceStoreKey, JSON.stringify({ subject, workspaceId }));
  }

  private recalledWorkspace(subject: string, discovery: OidcBusinessBootstrap): string | null {
    try {
      const raw = sessionStorage.getItem(this.workspaceStoreKey);
      if (!raw) return null;
      const saved: unknown = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return null;
      const value = saved as { subject?: unknown; workspaceId?: unknown };
      if (typeof value.subject !== 'string' || value.subject.toLowerCase() !== subject.toLowerCase() ||
          typeof value.workspaceId !== 'string') {
        this.forgetWorkspace();
        return null;
      }
      const savedWorkspace = value.workspaceId;
      return discovery.workspaces.some(w => w.active !== false &&
        w.id.toLowerCase() === savedWorkspace.toLowerCase()) ? savedWorkspace : null;
    } catch {
      this.forgetWorkspace();
      return null;
    }
  }

  private forgetWorkspace(): void { sessionStorage.removeItem(this.workspaceStoreKey); }

  private announceSignout(): void {
    // Signal only: never broadcast tokens, subjects, email addresses or permissions.
    this.logoutChannel?.postMessage({ action: 'signout' });
  }

  /** Fail closed on token expiry, user unload, and server authorization denial. */
  private invalidateBusinessContext(): void {
    this.context.set(null);
    this.forgetWorkspace();
  }

  private async verifiedUser(): Promise<User> {
    const user = await this.manager.getUser();
    if (!user || user.expired !== false || !user.access_token || !user.profile.sub) {
      this.invalidateBusinessContext();
      throw new Error('OIDC_SESSION_EXPIRED');
    }
    return user;
  }

  private async request(
    path: string, user: User, init: RequestInit = {}, requireWorkspaceList = true,
  ): Promise<OidcBusinessBootstrap> {
    if (user.expired !== false || !user.access_token || !user.profile.sub) throw new Error('OIDC_SESSION_EXPIRED');
    if (!path.startsWith('/api/v1/session/') || path.includes('\\')) throw new Error('OIDC_API_PATH_INVALID');
    const target = new URL(path, this.ownApi.origin);
    if (target.origin !== this.ownApi.origin) throw new Error('OIDC_CROSS_ORIGIN_BLOCKED');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${user.access_token}`);
    const http = await fetch(target.href, { ...init, headers, credentials: 'omit', cache: 'no-store', redirect: 'error' });
    if (!http.ok) {
      // A revoked or suspended identity must not retain a previously selected workspace.
      if (http.status === 401 || http.status === 403) this.invalidateBusinessContext();
      throw new Error(`OIDC_BUSINESS_HTTP_${http.status}`);
    }
    const data: unknown = await http.json();
    if (!data || typeof data !== 'object') throw new Error('OIDC_BOOTSTRAP_INVALID');
    const result = data as Partial<OidcBusinessBootstrap>;
    if (typeof result.subject !== 'string' || result.subject.toLowerCase() !== user.profile.sub.toLowerCase() ||
        typeof result.state !== 'string' || (requireWorkspaceList && !Array.isArray(result.workspaces)) ||
        typeof result.permissionsResolved !== 'boolean' ||
        typeof result.businessSessionEstablished !== 'boolean') {
      throw new Error('OIDC_BOOTSTRAP_CONTRACT_MISMATCH');
    }
    return result as OidcBusinessBootstrap;
  }

  private localReturn(value: unknown): string {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') ||
        /^\/auth\/(?:callback|oidc-test)/i.test(value) || value.includes('\r') || value.includes('\n')) return '/';
    return value;
  }
}
