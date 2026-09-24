import { Injectable, inject } from "@angular/core";
import { AccessPolicyService } from "../access/access-policy.service";
import type { AppPermission } from "../access/access.models";
import { TranslateService } from "../i18n/translate.service";
import { DEFAULT_SHEET_CATALOG } from "../api-data/runtime-data.store";
import { STUDENT_DIRECTORY } from "../api-data/runtime-data.store";
import { APP_NAV_ITEMS } from "../navigation/app-navigation.config";
import { SessionService } from "../session/session.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

export interface GlobalSearchResult {
  id: string;
  label: string;
  metaKey: string;
  icon: string;
  path: string;
  permission: AppPermission;
}

@Injectable({ providedIn: "root" })
export class GlobalSearchService {
  private readonly access = inject(AccessPolicyService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly sessionService = inject(SessionService);
  private readonly i18n = inject(TranslateService);

  search(query: string, limit = 8): GlobalSearchResult[] {
    const normalizedQuery = this.normalize(query);
    const program = this.workspace.program();
    const modules = program?.enabledModules ?? [];
    const cohort = this.workspace.cohort();

    const navigation: GlobalSearchResult[] = APP_NAV_ITEMS.filter(
      (item) =>
        this.access.can(item.permission) &&
        (!item.module || modules.includes(item.module)),
    ).map((item) => ({
      id: `nav:${item.path}`,
      label: this.i18n.instant(item.labelKey),
      metaKey: "globalSearch.types.navigation",
      icon: item.icon,
      path: item.path,
      permission: item.permission,
    }));

    const ownStudentId = this.sessionService.session()?.studentId;
    const students: GlobalSearchResult[] = this.access.can("studentDetail.view")
      ? STUDENT_DIRECTORY.filter(
          (student) =>
            student.promotionId === cohort?.id &&
            (this.sessionService.role() !== "stagiaire" || student.id === ownStudentId),
        ).map((student) => ({
            id: `student:${student.id}`,
            label: `${student.firstName} ${student.lastName}`,
            metaKey: "globalSearch.types.student",
            icon: "ph-user",
            path: `/stagiaires/${student.id}`,
            permission: "studentDetail.view" as const,
          }))
      : [];

    const cohorts: GlobalSearchResult[] = this.access.can("promotions.view")
      ? this.workspace.cohorts().map((item) => ({
          id: `cohort:${item.id}`,
          label: item.name,
          metaKey: "globalSearch.types.cohort",
          icon: "ph-graduation-cap",
          path: "/promotions",
          permission: "promotions.view" as const,
        }))
      : [];

    const sites: GlobalSearchResult[] = this.access.can("sites.view")
      ? this.workspace.sites().map((item) => ({
          id: `site:${item.id}`,
          label: item.name,
          metaKey: "globalSearch.types.site",
          icon: "ph-map-pin-area",
          path: `/etablissements/${item.id}`,
          permission: "sites.view" as const,
        }))
      : [];

    const programs: GlobalSearchResult[] = this.access.can("programs.view")
      ? this.workspace.programs().map((item) => ({
          id: `program:${item.id}`,
          label: item.name,
          metaKey: "globalSearch.types.program",
          icon: item.icon || "ph-books",
          path: `/formations/${item.id}`,
          permission: "programs.view" as const,
        }))
      : [];

    const sheets: GlobalSearchResult[] =
      modules.includes("sheets") && this.access.can("sheets.view")
        ? DEFAULT_SHEET_CATALOG.filter((sheet) => sheet.active).map((sheet) => ({
            id: `sheet:${sheet.id}`,
            label: `${sheet.number}. ${sheet.titleKey ? this.i18n.instant(sheet.titleKey) : sheet.customTitle ?? ""}`,
            metaKey: "globalSearch.types.sheet",
            icon: "ph-presentation-chart",
            path: "/fiches",
            permission: "sheets.view" as const,
          }))
        : [];

    if (!normalizedQuery) return navigation.slice(0, limit);

    const results = [...students, ...cohorts, ...sites, ...programs, ...sheets, ...navigation];
    const unique = results.filter(
      (item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index,
    );

    return unique
      .filter((item) =>
        this.normalize(`${item.label} ${this.i18n.instant(item.metaKey)}`).includes(
          normalizedQuery,
        ),
      )
      .slice(0, limit);
  }

  private normalize(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }
}
