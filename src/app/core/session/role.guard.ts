import { inject } from "@angular/core";
import { environment } from "../../environments/environment";
import { OidcApplicationSessionService } from "../oidc/oidc-application-session.service";
import { CanActivateFn, Router } from "@angular/router";
import { AccessPolicyService } from "../access/access-policy.service";
import type { AppPermission } from "../access/access.models";
import type { UserRole } from "../models/app.models";
import type { MembershipRole } from "../models/workspace.models";
import { SessionService } from "./session.service";

export const roleGuard: CanActivateFn = (route) => {
  const oidc = inject(OidcApplicationSessionService);
  if (environment.authMode === 'oidc') {
    if (!oidc.ready()) return false;
    const permission = route.data?.['permission'] as string | undefined;
    const membershipRoles = (route.data?.['membershipRoles'] ?? []) as string[];
    const roles = (route.data?.['roles'] ?? []) as string[];
    // The API returns canonical permission codes. Existing route permissions may
    // have product-specific aliases; AccessPolicyService checks only resolved
    // grants in OIDC mode (never role templates or implicit platform grants).
    const access = inject(AccessPolicyService);
    const userRole = inject(SessionService).role();
    if (permission && !access.can(permission as AppPermission)) return false;
    if (membershipRoles.length && !membershipRoles.some(role =>
      oidc.hasRole(role) || (role === 'jury' && userRole === 'jury'))) return false;
    if (roles.length && !roles.includes(userRole)) return false;
    return true;
  }

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

/** Route-level separation: internal directors use the supervision workspace. */
export const tutorWorkspaceGuard: CanActivateFn = () => {
  const access = inject(AccessPolicyService);
  const router = inject(Router);
  if (access.canOpenTutorWorkspace()) return true;
  // Do not expose tutor-only API calls to administrative profiles.
  if (access.can("internships.view")) return router.createUrlTree(["/stages"]);
  return router.createUrlTree([access.defaultPath()]);
};
