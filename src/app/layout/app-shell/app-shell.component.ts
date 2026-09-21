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
import { PROMOTIONS } from "../../core/mock-data/dashboard.mock";
import type { UserRole } from "../../core/models/app.models";
interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
  roles: UserRole[];
}
const ALL: UserRole[] = ["direction", "formateur", "stagiaire", "secretariat"];
const NAV: NavItem[] = [
  { path: "/accueil", labelKey: "nav.home", icon: "ph-house", roles: ALL },
  {
    path: "/planning",
    labelKey: "nav.planning",
    icon: "ph-calendar-dots",
    roles: ALL,
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
    roles: ALL,
  },
  {
    path: "/conduite",
    labelKey: "nav.driving",
    icon: "ph-car",
    roles: ["direction", "formateur", "stagiaire"],
  },
  {
    path: "/fiches",
    labelKey: "nav.sheets",
    icon: "ph-presentation-chart",
    roles: ALL,
  },
  {
    path: "/competences",
    labelKey: "nav.skills",
    icon: "ph-target",
    roles: ALL,
  },
  {
    path: "/presences",
    labelKey: "nav.attendance",
    icon: "ph-clipboard-text",
    roles: ["direction", "formateur", "secretariat"],
  },
  {
    path: "/stages",
    labelKey: "nav.internships",
    icon: "ph-files",
    roles: ALL,
  },
  {
    path: "/documents",
    labelKey: "nav.documents",
    icon: "ph-folder-open",
    roles: ALL,
  },
  {
    path: "/certification",
    labelKey: "nav.certification",
    icon: "ph-certificate",
    roles: ALL,
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
    roles: ["direction", "formateur", "stagiaire", "secretariat"],
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: "./app-shell.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly router = inject(Router);
  readonly sessionService = inject(SessionService);
  readonly mobileOpen = signal(false);
  readonly promotions = PROMOTIONS;
  readonly navItems = computed(() =>
    NAV.filter((i) => i.roles.includes(this.sessionService.role())),
  );
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
  promotionChanged(e: Event) {
    this.sessionService.setPromotion((e.target as HTMLSelectElement).value);
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
