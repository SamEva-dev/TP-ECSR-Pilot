import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { safeReturnUrl } from "../../core/auth-contract/auth-return-url";
import { firstValueFrom } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { AuthGateMembership, AuthGateService } from "../../core/session/auth-gate.service";
import { authorizedPedagoraContexts } from "./authorized-contexts";
import { SessionService } from "../../core/session/session.service";

/** UI is deliberately application-owned; AuthGate only exposes opaque context IDs. */
@Component({
  selector: "app-context-selector",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6 lg:py-20">
      <section class="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <header class="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-800 px-6 py-8 text-white sm:px-10">
          <p class="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-blue-100">PedagoraPilot</p>
          <h1 class="text-3xl font-bold tracking-tight">Choisir mon espace</h1>
          <p class="mt-2 text-sm text-blue-100">Vos rôles et permissions sont indépendants dans chaque organisation.</p>
        </header>
        <div class="space-y-4 p-5 sm:p-8">
          @if (loading()) { <p aria-live="polite" class="text-sm text-slate-600">Chargement de vos espaces…</p> }
          @if (error()) { <p role="alert" class="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">{{ error() }}</p> }
          @for (space of contexts(); track space.organizationId) {
            <button type="button" [disabled]="loading()" (click)="open(space)"
              class="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition duration-200 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-60">
              <span aria-hidden="true" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-800">{{ displayRole(space).charAt(0) }}</span>
              <span class="min-w-0 flex-1">
                <span class="block font-semibold text-slate-900">{{ displayOrganization(space) }}</span>
                <span class="mt-1 block text-sm text-slate-600">{{ displayRole(space) }}</span>
              </span>
              <span aria-hidden="true" class="text-xl font-semibold text-blue-700 transition group-hover:translate-x-1">→</span>
            </button>
          }
          @if (!loading() && !contexts().length && !error()) {
            <p class="rounded-xl bg-slate-100 p-5 text-sm text-slate-700">Aucun espace actif n'est associé à ce compte.</p>
          }
          <p class="text-xs text-slate-500">Les espaces proposés correspondent à vos appartenances PedagoraPilot actives.</p>
        </div>
      </section>
    </main>
  `,
})
export class ContextSelectorComponent {
  private readonly auth = inject(AuthGateService);
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  readonly organizationNames = signal<Record<string, string>>({});
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly contexts = signal<AuthGateMembership[]>([]);

  displayOrganization(space: AuthGateMembership): string {
    // AuthGate deliberately has no business organization names.
    // Never expose the raw UUID as a fake display name.
    return this.organizationNames()[space.organizationId] ?? "Organisation non renseignée";
  }

  displayRole(space: AuthGateMembership): string {
    const role = (space.initialRole ?? '').split('.').pop()?.toLowerCase();
    const roles: Record<string, string> = {
      organizationadministrator: 'Administrateur d’organisation',
      organizationdirection: 'Direction',
      pedagogicalmanager: 'Responsable pédagogique',
      trainer: 'Formateur',
      student: 'Stagiaire',
      jury: 'Jury',
      secretariat: 'Secrétariat',
      sitedirection: 'Responsable de site',
    };
    return roles[role ?? ''] ?? 'Membre';
  }


  constructor() { void this.load(); }

  /** Only a tenant approved by BOTH AuthGate and PedagoraPilot is selectable. */
  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set("");
    this.contexts.set([]);
    this.organizationNames.set({});
    try {
      const [response, labels] = await Promise.all([
        firstValueFrom(this.auth.listContexts()),
        // Product-owned, authenticated projection: active local memberships
        // and organizations explicitly owned by this identity (Register flow).
        // If the request fails, fail CLOSED; cached labels are never authority.
        firstValueFrom(this.http.get<{
          organizations: { organizationId: string; name: string }[];
        }>(`${environment.apiBaseUrl}/api/v1/me/organization-labels`)),
      ]);

      const { contexts, names } = authorizedPedagoraContexts(
        response.memberships ?? [], labels.organizations ?? []);
      this.organizationNames.set(names);
      this.contexts.set(contexts);
    } catch {
      // Never present an unverified AuthGate organization when PedagoraPilot
      // is unreachable or reports no active local access.
      this.contexts.set([]);
      this.organizationNames.set({});
      this.error.set("Impossible de vérifier vos espaces actifs. Réessayez ultérieurement.");
    } finally {
      this.loading.set(false);
    }
  }

  async open(space: AuthGateMembership): Promise<void> {
    if (this.loading() || !this.contexts().some(x =>
      x.organizationId.toLowerCase() === space.organizationId.toLowerCase())) return;
    this.error.set("");
    this.loading.set(true);
    let contextSelected = false;
    try {
      const tokens = await firstValueFrom(this.auth.selectContext(space.organizationId));
      contextSelected = true;
      this.session.connectAuthenticatedToken(tokens.accessToken);
      const current = this.session.session();
      if (!this.session.hasValidToken() || current?.organizationId !== space.organizationId) {
        this.error.set("AuthGate n’a pas délivré une session valide pour l’organisation sélectionnée.");
        return;
      }
      // Membership may have been suspended between listing and selecting.
      // Verify the local business authorization again AFTER context selection.
      // AuthGate alone cannot reinstate a revoked PedagoraPilot membership.
      const verified = await firstValueFrom(this.http.get<{
        organizations: { organizationId: string; name: string }[];
      }>(`${environment.apiBaseUrl}/api/v1/me/organization-labels`));
      const authorized = (verified.organizations ?? []).find(org =>
        org.organizationId?.toLowerCase() === space.organizationId.toLowerCase());
      if (!authorized) {
        // A context token was issued; do not retain a token for a revoked tenant.
        this.auth.logout();
        this.session.disconnect();
        this.error.set("Cet espace n’est plus autorisé. Reconnectez-vous.");
        return;
      }
      if (authorized.name?.trim()) {
        this.organizationNames.update(names => ({ ...names, [space.organizationId]: authorized.name.trim() }));
      }
      if (this.session.hasValidToken()) {
        const returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get("returnUrl"), "/accueil",
          ["/connexion", "/register", "/change-password", "/choisir-espace"]);
        await this.router.navigateByUrl(returnUrl, { replaceUrl: true });
      }
      else this.error.set("La session du nouvel espace est invalide.");
    } catch {
      // A context token may have been stored before a local authorization
      // lookup failed. Never retain it when its active membership is unverified.
      if (contextSelected) {
        this.auth.logout();
        this.session.disconnect();
      }
      this.error.set("Accès refusé ou espace indisponible. Reconnectez-vous si nécessaire.");
    } finally {
      this.loading.set(false);
    }
  }
}
