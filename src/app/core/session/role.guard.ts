import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AccessPolicyService } from "../access/access-policy.service";
import type { AppPermission } from "../access/access.models";
import type { UserRole } from "../models/app.models";
import type { MembershipRole } from "../models/workspace.models";
import { SessionService } from "./session.service";

export const roleGuard: CanActivateFn = (route) => {
  const session = inject(SessionService);
  const access = inject(AccessPolicyService);
  const router = inject(Router);
  const permission = route.data?.["permission"] as AppPermission | undefined;

  const membershipRoles = (route.data?.["membershipRoles"] ??
    []) as MembershipRole[];
  if (permission) {
    return access.can(permission) && access.hasAnyRole(...membershipRoles)
      ? true
      : router.createUrlTree([access.defaultPath()]);
  }

  if (membershipRoles.length && !access.hasAnyRole(...membershipRoles))
    return router.createUrlTree([access.defaultPath()]);

  const roles = (route.data?.["roles"] ?? []) as UserRole[];
  const currentRole = session.role();
  if (!roles.length || roles.includes(currentRole)) return true;

  return router.createUrlTree([access.defaultPath()]);
};
