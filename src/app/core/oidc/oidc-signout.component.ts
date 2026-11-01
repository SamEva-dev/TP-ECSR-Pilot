import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OidcApplicationSessionService } from './oidc-application-session.service';

/** Two explicit choices: local application session or central SSO cookie. */
@Component({
  standalone: true,
  selector: 'itech-oidc-signout',
  imports: [CommonModule],
  template: `
    <main class="min-h-screen flex items-center justify-center p-6">
      <section class="max-w-md w-full space-y-4">
        <h1 class="text-xl font-semibold">Déconnexion</h1>
        <p role="status">{{ status() }}</p>
        <div *ngIf="!callback && !busy()" class="flex flex-wrap gap-3">
          <button type="button" (click)="local()">Quitter cette application</button>
          <button type="button" (click)="global()">Déconnecter AuthGate (toutes les applications)</button>
        </div>
      </section>
    </main>
  `,
})
export class OidcSignoutComponent implements OnInit {
  private readonly session = inject(OidcApplicationSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly busy = signal(false);
  readonly status = signal('Choisis une déconnexion.');
  readonly callback = this.route.snapshot.data['callback'] === true;

  ngOnInit(): void {
    if (this.callback) void this.finish();
  }

  async local(): Promise<void> {
    this.busy.set(true);
    try {
      await this.session.clearLocal();
      await this.router.navigateByUrl('/connexion');
    } catch { this.status.set('OIDC_LOCAL_LOGOUT_FAILED'); }
    finally { this.busy.set(false); }
  }

  async global(): Promise<void> {
    this.busy.set(true);
    try {
      this.status.set('Confirmation de déconnexion sur AuthGate…');
      await this.session.signOutGlobally();
    } catch { this.status.set('OIDC_GLOBAL_LOGOUT_FAILED'); }
    finally { this.busy.set(false); }
  }

  private async finish(): Promise<void> {
    this.busy.set(true);
    try {
      await this.session.completeGlobalSignOut();
      await this.router.navigateByUrl('/connexion');
    } catch { this.status.set('OIDC_LOGOUT_CALLBACK_ERROR'); }
    finally { this.busy.set(false); }
  }
}
