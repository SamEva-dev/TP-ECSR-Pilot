import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { SessionService } from "./session.service";
export const authGuard: CanActivateFn = () => {
  const s = inject(SessionService);
  const r = inject(Router);
  return s.isConnected() ? true : r.createUrlTree(["/connexion"]);
};
