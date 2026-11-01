import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";

/**
 * Phase 1: browser authorization initiation only. No legacy token is replaced
 * until PedagoraPilot API can resolve subject-based organization memberships.
 */
@Injectable({ providedIn: "root" })
export class OidcPkceService {
  private readonly transactionKey = "pedagora.oidc.pending";

  async begin(returnUrl = "/accueil"): Promise<void> {
    const cfg = environment.oidc;
    const authority = new URL(cfg.authority);
    if (authority.protocol !== "https:" || authority.username || authority.password) {
      throw new Error("OIDC_AUTHORITY_INVALID");
    }
    const redirect = new URL(cfg.redirectUri);
    if (redirect.origin !== window.location.origin || redirect.pathname !== "/auth/callback") {
      throw new Error("OIDC_REDIRECT_URI_INVALID");
    }
    const verifier = this.randomBase64Url(32);
    const state = this.randomBase64Url(32);
    const nonce = this.randomBase64Url(32);
    const challenge = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    const challengeString = this.base64Url(new Uint8Array(challenge));
    const safeReturn = returnUrl.startsWith("/") && !returnUrl.startsWith("//") && !returnUrl.includes("\\")
      ? returnUrl : "/accueil";
    sessionStorage.setItem(this.transactionKey, JSON.stringify({verifier, state, nonce, returnUrl: safeReturn, createdAt: Date.now()}));
    const url = new URL("connect/authorize", authority);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("redirect_uri", redirect.href);
    url.searchParams.set("scope", cfg.scope);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", challengeString);
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    window.location.assign(url.toString());
  }

  consumeCallback(): { code: string; verifier: string; nonce: string; returnUrl: string } {
    const params = new URLSearchParams(window.location.search);
    const raw = sessionStorage.getItem(this.transactionKey);
    sessionStorage.removeItem(this.transactionKey);
    if (params.has("error")) throw new Error("OIDC_AUTHORIZATION_REJECTED");
    if (!raw) throw new Error("OIDC_TRANSACTION_MISSING");
    const tx = JSON.parse(raw) as {verifier: string; state: string; nonce: string; returnUrl: string; createdAt: number};
    if (!tx.state || Date.now() - tx.createdAt > 5 * 60_000 || tx.state !== params.get("state")) {
      throw new Error("OIDC_STATE_INVALID");
    }
    const code = params.get("code");
    if (!code) throw new Error("OIDC_CODE_MISSING");
    window.history.replaceState(window.history.state, "", window.location.pathname);
    return { code, verifier: tx.verifier, nonce: tx.nonce, returnUrl: tx.returnUrl };
  }

  private randomBase64Url(bytes: number): string {
    const data = new Uint8Array(bytes);
    crypto.getRandomValues(data);
    return this.base64Url(data);
  }

  private base64Url(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
}
