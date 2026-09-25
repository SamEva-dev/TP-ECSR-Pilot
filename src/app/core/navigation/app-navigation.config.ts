import type { AppPermission } from "../access/access.models";
import type { ProgramModule } from "../models/workspace.models";
import type { UserRole } from "../models/app.models";

export interface AppNavItem {
  path: string;
  labelKey: string;
  icon: string;
  permission: AppPermission;
  module?: ProgramModule;
  audiences: readonly UserRole[];
}

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  {
    path: "/accueil",
    labelKey: "nav.home",
    icon: "ph-house",
    permission: "home.view",
    audiences: ["direction", "formateur", "stagiaire", "secretariat"],
  },
  {
    path: "/organisation",
    labelKey: "nav.organizationDashboard",
    icon: "ph-buildings",
    permission: "organization.dashboard",
    audiences: ["direction"],
  },
  {
    path: "/etablissements",
    labelKey: "nav.sites",
    icon: "ph-map-pin-area",
    permission: "sites.view",
    audiences: ["direction"],
  },
  {
    path: "/formations",
    labelKey: "nav.programs",
    icon: "ph-books",
    permission: "programs.view",
    audiences: ["direction"],
  },
  {
    path: "/referentiels",
    labelKey: "nav.referentials",
    icon: "ph-stack",
    permission: "referentials.view",
    audiences: ["direction"],
  },
  {
    path: "/planning",
    labelKey: "nav.planning",
    icon: "ph-calendar-dots",
    permission: "planning.view",
    module: "planning",
    audiences: ["direction", "formateur", "stagiaire", "secretariat"],
  },
  {
    path: "/teletravail",
    labelKey: "nav.remoteWork",
    icon: "ph-house-line",
    permission: "remoteWork.view",
    audiences: ["direction", "formateur", "secretariat"],
  },
  {
    path: "/distanciel",
    labelKey: "nav.distanceLearning",
    icon: "ph-video-camera",
    permission: "distanceLearning.view",
    module: "distanceLearning",
    audiences: ["direction", "formateur", "stagiaire", "secretariat"],
  },
  {
    path: "/stagiaires",
    labelKey: "nav.students",
    icon: "ph-users-three",
    permission: "students.view",
    audiences: ["direction", "formateur", "secretariat"],
  },
  {
    path: "/promotions",
    labelKey: "nav.promotions",
    icon: "ph-graduation-cap",
    permission: "promotions.view",
    audiences: ["direction", "secretariat"],
  },
  {
    path: "/seances",
    labelKey: "nav.sessions",
    icon: "ph-list-bullets",
    permission: "sessions.view",
    module: "sessions",
    audiences: ["direction", "formateur", "stagiaire", "secretariat"],
  },
  {
    path: "/conduite",
    labelKey: "nav.driving",
    icon: "ph-car",
    permission: "driving.view",
    module: "driving",
    audiences: ["direction", "formateur", "stagiaire"],
  },
  {
    path: "/fiches",
    labelKey: "nav.sheets",
    icon: "ph-presentation-chart",
    permission: "sheets.view",
    module: "sheets",
    audiences: ["direction", "formateur", "stagiaire"],
  },
  {
    path: "/competences",
    labelKey: "nav.skills",
    icon: "ph-target",
    permission: "skills.view",
    module: "skills",
    audiences: ["direction", "formateur", "stagiaire"],
  },
  {
    path: "/presences",
    labelKey: "nav.attendance",
    icon: "ph-clipboard-text",
    permission: "attendance.view",
    module: "attendance",
    audiences: ["direction", "formateur", "stagiaire", "secretariat"],
  },
  {
    path: "/stages",
    labelKey: "nav.internships",
    icon: "ph-files",
    permission: "internships.view",
    module: "internships",
    audiences: ["direction", "formateur", "stagiaire", "secretariat"],
  },
  {
    path: "/documents",
    labelKey: "nav.documents",
    icon: "ph-folder-open",
    permission: "documents.view",
    module: "documents",
    audiences: ["direction", "formateur", "stagiaire", "secretariat"],
  },
  {
    path: "/certification",
    labelKey: "nav.certification",
    icon: "ph-certificate",
    permission: "certification.view",
    module: "certification",
    audiences: ["direction", "formateur", "stagiaire", "secretariat"],
  },
  {
    path: "/jury",
    labelKey: "nav.jurySpace",
    icon: "ph-gavel",
    permission: "jury.view",
    audiences: ["jury"],
  },
  {
    path: "/resultats",
    labelKey: "nav.results",
    icon: "ph-check-square-offset",
    permission: "results.view",
    audiences: ["direction", "secretariat"],
  },
  {
    path: "/reussites",
    labelKey: "nav.success",
    icon: "ph-trophy",
    permission: "success.view",
    audiences: ["direction", "secretariat"],
  },
  {
    path: "/rapports",
    labelKey: "nav.reports",
    icon: "ph-chart-bar",
    permission: "reports.view",
    audiences: ["direction", "secretariat"],
  },
  {
    path: "/statistiques",
    labelKey: "nav.statistics",
    icon: "ph-chart-line-up",
    permission: "statistics.view",
    audiences: ["direction"],
  },
  {
    path: "/acces",
    labelKey: "nav.access",
    icon: "ph-shield-check",
    permission: "access.manage",
    audiences: ["direction"],
  },
  {
    path: "/administration",
    labelKey: "nav.admin",
    icon: "ph-gear",
    permission: "administration.manage",
    audiences: ["direction"],
  },
];

export function navItemVisibleForRole(
  item: AppNavItem,
  role: UserRole,
): boolean {
  return item.audiences.includes(role);
}

export function profileNavigation(role: UserRole): readonly AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => navItemVisibleForRole(item, role));
}
