import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import type { UserRole } from "../../core/models/app.models";
import type { ProgramModule } from "../../core/models/workspace.models";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ContextSwitcherComponent } from "../../shared/workspace/context-switcher.component";
interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
  roles: UserRole[];
  module?: ProgramModule;
}
const TRAINING_USERS: UserRole[] = ["direction", "formateur", "stagiaire", "secretariat"];
const NAV: NavItem[] = [
  { path: "/accueil", labelKey: "nav.home", icon: "ph-house", roles: TRAINING_USERS },
  {
    path: "/organisation",
    labelKey: "nav.organizationDashboard",
    icon: "ph-buildings",
    roles: ["direction"],
  },
  {
    path: "/etablissements",
    labelKey: "nav.sites",
    icon: "ph-map-pin-area",
    roles: ["direction"],
  },
  {
    path: "/formations",
    labelKey: "nav.programs",
    icon: "ph-books",
    roles: ["direction"],
  },
  {
    path: "/referentiels",
    labelKey: "nav.referentials",
    icon: "ph-stack",
    roles: ["direction"],
  },
  {
    path: "/planning",
    labelKey: "nav.planning",
    icon: "ph-calendar-dots",
    roles: TRAINING_USERS, module: "planning",
  },
  {
    path: "/teletravail",
    labelKey: "nav.remoteWork",
    icon: "ph-house-line",
    roles: ["direction", "formateur", "secretariat"],
  },
  {
    path: "/distanciel",
    labelKey: "nav.distanceLearning",
    icon: "ph-video-camera",
    roles: TRAINING_USERS,
    module: "distanceLearning",
  },
  {
    path: "/stagiaires",
    labelKey: "nav.students",
    icon: "ph-users-three",
    roles: ["direction", "formateur", "secretariat"],
  },
  {
    path: "/promotions",
    labelKey: "nav.promotions",
    icon: "ph-graduation-cap",
    roles: ["direction", "secretariat"],
  },
  {
    path: "/seances",
    labelKey: "nav.sessions",
    icon: "ph-list-bullets",
    roles: TRAINING_USERS, module: "sessions",
  },
  {
    path: "/conduite",
    labelKey: "nav.driving",
    icon: "ph-car",
    roles: ["direction", "formateur", "stagiaire"], module: "driving",
  },
  {
    path: "/fiches",
    labelKey: "nav.sheets",
    icon: "ph-presentation-chart",
    roles: TRAINING_USERS, module: "sheets",
  },
  {
    path: "/competences",
    labelKey: "nav.skills",
    icon: "ph-target",
    roles: TRAINING_USERS, module: "skills",
  },
  {
    path: "/presences",
    labelKey: "nav.attendance",
    icon: "ph-clipboard-text",
    roles: ["direction", "formateur", "secretariat"], module: "attendance",
  },
  {
    path: "/stages",
    labelKey: "nav.internships",
    icon: "ph-files",
    roles: TRAINING_USERS, module: "internships",
  },
  {
    path: "/documents",
    labelKey: "nav.documents",
    icon: "ph-folder-open",
    roles: TRAINING_USERS, module: "documents",
  },
  {
    path: "/certification",
    labelKey: "nav.certification",
    icon: "ph-certificate",
    roles: TRAINING_USERS, module: "certification",
  },
  {
    path: "/jury",
    labelKey: "nav.jurySpace",
    icon: "ph-gavel",
    roles: ["jury"],
  },
  {
    path: "/resultats",
    labelKey: "nav.results",
    icon: "ph-check-square-offset",
    roles: ["direction", "secretariat"],
  },
  {
    path: "/reussites",
    labelKey: "nav.success",
    icon: "ph-trophy",
    roles: ["direction", "secretariat"],
  },
  {
    path: "/rapports",
    labelKey: "nav.reports",
    icon: "ph-chart-bar",
    roles: ["direction", "secretariat"],
  },
  {
    path: "/statistiques",
    labelKey: "nav.statistics",
    icon: "ph-chart-line-up",
    roles: ["direction"],
  },
  {
    path: "/acces",
    labelKey: "nav.access",
    icon: "ph-shield-check",
    roles: ["direction"],
  },
  {
    path: "/administration",
    labelKey: "nav.admin",
    icon: "ph-gear",
    roles: ["direction"],
  },
];
@Component({
  selector: "app-shell",
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, ContextSwitcherComponent],
  templateUrl: "./app-shell.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly router = inject(Router);
  readonly sessionService = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  readonly mobileOpen = signal(false);
  readonly homePath = computed(() =>
    this.sessionService.role() === "jury" ? "/jury" : "/accueil",
  );
  readonly navItems = computed(() => {
    const modules = this.workspace.program()?.enabledModules ?? [];
    return NAV.filter((i) =>
      i.roles.includes(this.sessionService.role()) && (!i.module || modules.includes(i.module)),
    );
  });
  readonly mobileNavItems = computed(() =>
    this.sessionService.role() === "jury"
      ? this.navItems()
      : this.navItems()
          .filter((i) =>
            [
              "/accueil",
              "/planning",
              "/stagiaires",
              "/conduite",
              "/fiches",
            ].includes(i.path),
          )
          .slice(0, 5),
  );
  roleLabelKey() {
    return `common.roles.${this.sessionService.role()}`;
  }
  toggleMobile() {
    this.mobileOpen.update((v) => !v);
  }
  closeMobile() {
    this.mobileOpen.set(false);
  }
  logout() {
    this.sessionService.disconnect();
    void this.router.navigateByUrl("/connexion");
  }
}
