import { inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { OidcApplicationSessionService } from "../oidc/oidc-application-session.service";
import { CanActivateFn, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { AuthRefreshService } from "./auth-refresh.service";
import { AuthTokenStore } from "./auth-token.store";
import { SessionService } from "./session.service";
import { safeReturnUrl } from "../auth-contract/auth-return-url";

export const authGuard: CanActivateFn = async (_route, state) => {
  const oidc = inject(OidcApplicationSessionService);
  const oidcRouter = inject(Router);
  if (environment.authMode === 'oidc') {
    const accepted = await oidc.ensureReady();
    return accepted ? true : oidcRouter.createUrlTree(['/connexion'], {
      queryParams: { returnUrl: safeReturnUrl(state.url, '/accueil') },
    });
  }
  const session = inject(SessionService);
  const tokens = inject(AuthTokenStore);
  const router = inject(Router);

  if (session.hasValidToken()) return true;

  if (tokens.getRefreshToken()) {
    try {
      await firstValueFrom(inject(AuthRefreshService).refreshAccessToken());
      if (session.hasValidToken()) return true;
    } catch {
      // The refresh service already clears invalid credentials.
    }
  }

  session.disconnect();
  tokens.clear();
  return router.createUrlTree(["/connexion"], { queryParams: { returnUrl: safeReturnUrl(state.url, "/accueil") } });
};
