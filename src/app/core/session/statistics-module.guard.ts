import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { StatisticsModuleAvailabilityService } from "../access/statistics-module-availability.service";

/** Always reads the backend on navigation, not a cached administration setting. */
export const statisticsModuleGuard: CanActivateFn = async () => {
  const availability = inject(StatisticsModuleAvailabilityService);
  const router = inject(Router);
  const allowed = await availability.check();
  return allowed ? true : router.createUrlTree(["/accueil"]);
};
