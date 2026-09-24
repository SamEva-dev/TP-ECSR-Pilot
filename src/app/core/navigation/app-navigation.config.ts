import type { AppPermission } from "../access/access.models";
import type { ProgramModule } from "../models/workspace.models";

export interface AppNavItem {
  path: string;
  labelKey: string;
  icon: string;
  permission: AppPermission;
  module?: ProgramModule;
}

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { path: "/accueil", labelKey: "nav.home", icon: "ph-house", permission: "home.view" },
  { path: "/organisation", labelKey: "nav.organizationDashboard", icon: "ph-buildings", permission: "organization.dashboard" },
  { path: "/etablissements", labelKey: "nav.sites", icon: "ph-map-pin-area", permission: "sites.view" },
  { path: "/formations", labelKey: "nav.programs", icon: "ph-books", permission: "programs.view" },
  { path: "/referentiels", labelKey: "nav.referentials", icon: "ph-stack", permission: "referentials.view" },
  { path: "/planning", labelKey: "nav.planning", icon: "ph-calendar-dots", permission: "planning.view", module: "planning" },
  { path: "/teletravail", labelKey: "nav.remoteWork", icon: "ph-house-line", permission: "remoteWork.view" },
  { path: "/distanciel", labelKey: "nav.distanceLearning", icon: "ph-video-camera", permission: "distanceLearning.view", module: "distanceLearning" },
  { path: "/stagiaires", labelKey: "nav.students", icon: "ph-users-three", permission: "students.view" },
  { path: "/promotions", labelKey: "nav.promotions", icon: "ph-graduation-cap", permission: "promotions.view" },
  { path: "/seances", labelKey: "nav.sessions", icon: "ph-list-bullets", permission: "sessions.view", module: "sessions" },
  { path: "/conduite", labelKey: "nav.driving", icon: "ph-car", permission: "driving.view", module: "driving" },
  { path: "/fiches", labelKey: "nav.sheets", icon: "ph-presentation-chart", permission: "sheets.view", module: "sheets" },
  { path: "/competences", labelKey: "nav.skills", icon: "ph-target", permission: "skills.view", module: "skills" },
  { path: "/presences", labelKey: "nav.attendance", icon: "ph-clipboard-text", permission: "attendance.view", module: "attendance" },
  { path: "/stages", labelKey: "nav.internships", icon: "ph-files", permission: "internships.view", module: "internships" },
  { path: "/documents", labelKey: "nav.documents", icon: "ph-folder-open", permission: "documents.view", module: "documents" },
  { path: "/certification", labelKey: "nav.certification", icon: "ph-certificate", permission: "certification.view", module: "certification" },
  { path: "/jury", labelKey: "nav.jurySpace", icon: "ph-gavel", permission: "jury.view" },
  { path: "/resultats", labelKey: "nav.results", icon: "ph-check-square-offset", permission: "results.view" },
  { path: "/reussites", labelKey: "nav.success", icon: "ph-trophy", permission: "success.view" },
  { path: "/rapports", labelKey: "nav.reports", icon: "ph-chart-bar", permission: "reports.view" },
  { path: "/statistiques", labelKey: "nav.statistics", icon: "ph-chart-line-up", permission: "statistics.view" },
  { path: "/acces", labelKey: "nav.access", icon: "ph-shield-check", permission: "access.manage" },
  { path: "/administration", labelKey: "nav.admin", icon: "ph-gear", permission: "administration.manage" },
];
