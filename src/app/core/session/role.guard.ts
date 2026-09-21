import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import type { UserRole } from "../models/app.models";
import { SessionService } from "./session.service";

export const roleGuard: CanActivateFn = (route) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const roles = (route.data?.["roles"] ?? []) as UserRole[];
  const currentRole = session.role();

  if (!roles.length || roles.includes(currentRole)) return true;

  return router.createUrlTree([currentRole === "jury" ? "/jury" : "/accueil"]);
};
