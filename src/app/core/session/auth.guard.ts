import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { SessionService } from "./session.service";
import { AuthTokenStore } from "./auth-token.store";
export const authGuard: CanActivateFn = () => {
  const s = inject(SessionService);
  const r = inject(Router);
  if (s.hasValidToken()) return true;
  s.disconnect();
  inject(AuthTokenStore).clear();
  return r.createUrlTree(["/connexion"]);
};
