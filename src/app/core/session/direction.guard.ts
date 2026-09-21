import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { SessionService } from "./session.service";

export const directionGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  return session.role() === "direction"
    ? true
    : router.createUrlTree(["/accueil"]);
};
