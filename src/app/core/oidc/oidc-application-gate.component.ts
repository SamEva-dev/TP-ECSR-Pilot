import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OidcApplicationSessionService, type OidcBusinessBootstrap } from './oidc-application-session.service';

/** Point d'entrée du vrai login OIDC (pas la page de test).
 * Refuse d'ouvrir le dashboard si la session métier n'est pas établie.
 */
@Component({
  standalone: true,
  selector: 'itech-oidc-application-gate',
  imports: [CommonModule, FormsModule],
  template: `
    <main class="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
      <section class="max-w-lg w-full p-7 rounded-xl border border-slate-700 bg-slate-900 space-y-4">
        <h1 class="text-xl font-semibold">Connexion sécurisée AuthGate</h1>
        <p role="status" class="text-sm text-slate-300">{{ status() }}</p>
        <ul *ngIf="result()?.workspaces?.length" class="space-y-2">
          <li *ngFor="let workspace of result()!.workspaces">
            <button type="button" [disabled]="busy() || workspace.active === false"
                    (click)="choose(workspace.id)"
                    class="w-full rounded-lg border border-slate-500 p-3 text-left disabled:opacity-50">
              {{ workspace.label }}
            </button>
          </li>
        </ul>
        <form *ngIf="showInvitation()" (ngSubmit)="acceptInvitation()" class="space-y-3 rounded-lg border border-slate-700 p-4">
          <p class="text-sm text-slate-200">Vous disposez d’une invitation PedagoraPilot ?</p>
          <label for="oidcInvitation" class="block text-sm">Jeton d'invitation</label>
          <input id="oidcInvitation" name="invitationToken" type="text" autocomplete="off"
                 maxlength="4096" [disabled]="busy()" [(ngModel)]="invitationToken"
                 class="w-full rounded-md bg-slate-800 border border-slate-600 p-3 text-white" />
          <button type="submit" [disabled]="busy() || !invitationToken.trim()"
                  class="rounded-lg bg-teal-500 px-4 py-2 text-slate-950 font-medium disabled:opacity-50">
            Accepter l'invitation
          </button>
        </form>
        <button *ngIf="!busy() && retryable()" type="button" (click)="retry()"
                class="rounded-lg border border-teal-400 text-teal-200 px-4 py-2 font-medium">
          Réessayer de charger mes accès
        </button>
        <button *ngIf="!busy()" type="button" (click)="login()" class="rounded-lg bg-sky-500 text-slate-950 px-4 py-2 font-medium">
          Retour à la connexion
        </button>
      </section>
    </main>
  `,
})
export class OidcApplicationGateComponent implements OnInit {
  private readonly session = inject(OidcApplicationSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly status = signal('Initialisation de la session…');
  readonly busy = signal(false);
  readonly result = signal<OidcBusinessBootstrap | null>(null);
  readonly showInvitation = signal(false);
  readonly retryable = signal(false);
  invitationToken = '';
  private requestedReturn = '/accueil';

  ngOnInit(): void { void this.start(); }

  private async start(): Promise<void> {
    this.busy.set(true);
    try {
      if (location.pathname === '/auth/callback') {
        const completed = await this.session.complete();
        this.requestedReturn = completed.returnUrl;
        this.apply(completed.response);
      } else {
        this.requestedReturn = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/accueil';
        const restored = await this.session.restore();
        if (restored) this.apply(restored);
        else { this.status.set('Session absente. Utilisez le formulaire de connexion pour vérifier votre adresse.'); await this.router.navigateByUrl('/connexion', { replaceUrl: true }); }
      }
    } catch (error) {
      this.status.set(error instanceof Error ? error.message : 'OIDC_AUTH_ERROR');
      this.retryable.set(await this.session.canResumeCallback().catch(() => false));
    } finally { this.busy.set(false); }
  }

  async retry(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.retryable.set(false);
    this.status.set('Nouvelle vérification des accès métier…');
    try {
      // A completed no_access response is not a transport failure: reload
      // business membership after an administrator granted access. No code replay.
      if (this.result()?.state === 'no_access') {
        const refreshed = await this.session.restore();
        if (!refreshed) throw new Error('OIDC_SESSION_EXPIRED');
        this.apply(refreshed);
      } else {
        // complete() reuses a stored OIDC user once code/state were consumed;
        // it never submits the authorization code a second time.
        const completed = await this.session.complete();
        this.requestedReturn = completed.returnUrl;
        this.apply(completed.response);
      }
    } catch (error) {
      this.status.set(error instanceof Error ? error.message : 'OIDC_AUTH_ERROR');
      this.retryable.set(await this.session.canResumeCallback().catch(() => false));
    } finally { this.busy.set(false); }
  }

  async choose(workspaceId: string): Promise<void> {
    this.busy.set(true);
    try { this.apply(await this.session.selectWorkspace(workspaceId)); }
    catch (e) { this.status.set(e instanceof Error ? e.message : 'OIDC_CONTEXT_ERROR'); }
    finally { this.busy.set(false); }
  }

  async acceptInvitation(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const result = await this.session.acceptInvitation(this.invitationToken);
      this.invitationToken = '';
      this.apply(result);
    } catch (error) {
      this.status.set(error instanceof Error ? error.message : 'PEDAGORA_INVITATION_FAILED');
    } finally { this.busy.set(false); }
  }

  login(): void { void this.router.navigateByUrl('/connexion', { replaceUrl: true }); }

  private apply(result: OidcBusinessBootstrap): void {
    this.result.set(result);
    // A missing membership is not authorization. Invite only; no implicit role.
    this.showInvitation.set(result.state === 'no_access' || result.state === 'onboarding_required');
    if (result.state === 'no_access') {
      this.status.set('Votre identité AuthGate est reconnue, mais aucun accès PedagoraPilot actif ne vous est attribué. Contactez votre administrateur ou acceptez une invitation valide, puis rechargez vos accès.');
      this.retryable.set(true);
      return;
    }
    this.retryable.set(false);
    if (result.state === 'select_workspace' && result.workspaces.length) {
      this.status.set('Choisis un espace autorisé dans la liste renvoyée par ton API.');
      return;
    }
    if (result.businessSessionEstablished !== true || result.permissionsResolved !== true) {
      // Les API de S08-S10 indiquent explicitement false : aucun accès au dashboard.
      this.status.set(`Identité reconnue. Contexte métier : ${result.state}. Autorisations encore non finalisées côté API.`);
      return;
    }
    // The guard will independently enforce the API-resolved business session.
    const requested = this.requestedReturn;
    const safe = requested.startsWith('/') && !requested.startsWith('//') &&
      !requested.includes('\\') && !/[\r\n]/.test(requested) &&
      !/^\/auth\/(?:callback|oidc-test)/i.test(requested);
    void this.router.navigateByUrl(safe && requested !== '/' ? requested : '/accueil')
      .catch(() => this.status.set('OIDC_NAVIGATION_FAILED'));
  }
}
