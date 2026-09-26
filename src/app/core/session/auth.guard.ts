import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { AuthRefreshService } from "./auth-refresh.service";
import { AuthTokenStore } from "./auth-token.store";
import { SessionService } from "./session.service";

export const authGuard: CanActivateFn = async () => {
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
  return router.createUrlTree(["/connexion"]);
};
