import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OidcBrowserClient } from './oidc-browser.client';
import { OidcIdentitySessionService } from './oidc-identity-session.service';
import { environment } from '../../environments/environment';

/** Identity-only T07 test. Does not open a business session or grant roles. */
@Component({
  standalone: true,
  selector: 'itech-oidc-smoke-test',
  imports: [CommonModule],
  template: `
    <main class="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <section class="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8 space-y-5 shadow-xl">
        <div class="text-xs uppercase tracking-widest text-sky-300">T07 / OIDC · Session d'identité</div>
        <h1 class="text-2xl font-bold">AuthGate → Angular → API</h1>
        <p class="text-sm text-slate-300">PKCE et validation serveur d'une identité. Aucun rôle, organisation ou accès métier n'est accordé.</p>
        <p class="rounded-lg bg-slate-800 p-3 text-sm" role="status">{{status()}}</p>
        <button *ngIf="!callback" type="button" (click)="start()" class="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">Tester le flux OIDC</button>
        <button *ngIf="session.authenticated()" type="button" (click)="disconnect()" class="rounded-lg border border-slate-500 px-5 py-3 font-semibold hover:bg-slate-800">Fermer la session d'identité</button>
        
        <div *ngIf="session.authenticated()" class="space-y-3 rounded-lg border border-slate-600 p-4">
          <label class="block text-sm" for="organizationId">Organisation à vérifier (GUID)</label>
          <input id="organizationId" #orgInput type="text" autocomplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" class="w-full rounded-lg bg-slate-800 border border-slate-600 p-2 text-sm" />
          <button type="button" [disabled]="busy()" (click)="probeWorkspace(orgInput.value)" class="rounded-lg border border-sky-400 px-4 py-2 disabled:opacity-50">Vérifier mon rattachement métier</button>
          <p role="status" class="text-sm text-slate-300">{{businessStatus()}}</p>
        </div>
        <p class="text-xs text-slate-400">Access token en mémoire uniquement ; perdu au rechargement. Le login historique reste inchangé.</p>
      </section>
    </main>`
})
export class OidcSmokeComponent {
  private readonly client = inject(OidcBrowserClient);
  readonly session = inject(OidcIdentitySessionService);
  readonly callback = typeof location !== 'undefined' && location.pathname === '/auth/callback';
  readonly busy = signal(false);
  readonly businessStatus = signal('À vérifier après identification OIDC.');
  readonly status = signal(this.callback ? 'Validation de l’identité en cours…' : 'Prêt pour le test.');
  private static activeCallback: Promise<void> | null = null;
  constructor() {
    this.client.configure(environment.oidc);
    if (this.callback) {
      OidcSmokeComponent.activeCallback ??= this.complete();
    }
  }
  async start(): Promise<void> {
    try { await this.client.login('/'); }
    catch (e) { this.status.set('Connexion OIDC : ' + this.message(e)); }
  }
  disconnect(): void { this.session.clear(); this.businessStatus.set('Session fermée.'); this.status.set('Session d’identité fermée.'); }
  private async complete(): Promise<void> {
    try {
      await this.session.completeCallback(environment.apiBaseUrl);
      this.status.set('E2E identité OK : session OIDC en mémoire, subject confirmé par l’API (masqué).');
    } catch (e) {
      this.status.set('Échec du parcours : ' + this.message(e));
    }
  }

  async probeWorkspace(id: string): Promise<void> {
    const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!guid.test(id.trim())) { this.businessStatus.set('GUID_ORGANIZATION_INVALID'); return; }
    this.busy.set(true);
    try {
      const response = await this.session.fetchFromOwnApi(`/api/v1/oidc/workspaces/${encodeURIComponent(id.trim())}/bootstrap`);
      if (!response.ok) { this.businessStatus.set(`Accès métier refusé : HTTP ${response.status}`); return; }
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object') throw new Error('OIDC_BOOTSTRAP_INVALID');
      const result = payload as Record<string, unknown>;
      if (result['authenticated'] !== true || result['memberActive'] !== true ||
          result['businessSessionEstablished'] !== false || result['subject'] !== this.session.identity()?.subject ||
          String(result['organizationId']).toLowerCase() !== id.trim().toLowerCase()) {
        throw new Error('OIDC_BOOTSTRAP_INCONSISTENT');
      }
      this.businessStatus.set('Rattachement métier confirmé par l’API. Aucune session métier ni permission globale accordée.');
    } catch (error) { this.businessStatus.set('Échec bootstrap : ' + this.message(error)); }
    finally { this.busy.set(false); }
  }
  private message(e: unknown): string { return e instanceof Error ? e.message : 'OIDC_UNKNOWN_ERROR'; }
}
