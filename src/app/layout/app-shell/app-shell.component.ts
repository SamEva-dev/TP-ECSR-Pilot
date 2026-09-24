import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
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
import { AccessPolicyService } from "../../core/access/access-policy.service";
import { AttentionService } from "../../core/attention/attention.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { APP_NAV_ITEMS } from "../../core/navigation/app-navigation.config";
import { GlobalSearchService } from "../../core/search/global-search.service";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ProgramLogoComponent } from "../../shared/branding/program-logo.component";
import { ContextSwitcherComponent } from "../../shared/workspace/context-switcher.component";

const MOBILE_PRIORITY: Record<string, string[]> = {
  direction: ["/accueil", "/organisation", "/planning", "/stagiaires"],
  formateur: ["/accueil", "/planning", "/stagiaires", "/seances"],
  stagiaire: ["/accueil", "/planning", "/distanciel", "/certification"],
  secretariat: ["/accueil", "/planning", "/stagiaires", "/documents"],
  jury: ["/jury"],
};

@Component({
  selector: "app-shell",
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    ContextSwitcherComponent,
    ProgramLogoComponent,
  ],
  templateUrl: "./app-shell.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly router = inject(Router);
  readonly sessionService = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  readonly access = inject(AccessPolicyService);
  readonly attention = inject(AttentionService);
  private readonly globalSearch = inject(GlobalSearchService);

  readonly mobileOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly searchOpen = signal(false);
  readonly searchQuery = signal("");

  readonly homePath = computed(() => this.access.defaultPath());

  readonly navItems = computed(() => {
    const modules = this.workspace.program()?.enabledModules ?? [];
    return APP_NAV_ITEMS.filter(
      (item) =>
        this.access.can(item.permission) &&
        (!item.module || modules.includes(item.module)),
    );
  });

  readonly mobileNavItems = computed(() => {
    const items = this.navItems();
    const preferred = MOBILE_PRIORITY[this.sessionService.role()] ?? [];
    const primary = preferred
      .map((path) => items.find((item) => item.path === path))
      .filter((item): item is (typeof items)[number] => !!item);
    const remaining = items.filter(
      (item) => !primary.some((candidate) => candidate.path === item.path),
    );
    return [...primary, ...remaining].slice(0, 4);
  });

  readonly hasMoreMobileNav = computed(
    () => this.navItems().length > this.mobileNavItems().length,
  );

  readonly searchResults = computed(() =>
    this.globalSearch.search(this.searchQuery()),
  );

  roleLabelKey(): string {
    return `common.roles.${this.sessionService.role()}`;
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.searchOpen.set(true);
    this.notificationsOpen.set(false);
  }

  openSearch(): void {
    this.searchOpen.set(true);
    this.notificationsOpen.set(false);
  }

  openFirstSearchResult(): void {
    const first = this.searchResults()[0];
    if (first) this.openSearchResult(first.path);
  }

  openSearchResult(path: string): void {
    this.searchOpen.set(false);
    this.searchQuery.set("");
    void this.router.navigateByUrl(path);
  }

  toggleNotifications(): void {
    this.notificationsOpen.update((value) => !value);
    this.searchOpen.set(false);
  }

  openAttention(id: string, path: string): void {
    this.attention.markRead(id);
    this.notificationsOpen.set(false);
    void this.router.navigateByUrl(path);
  }

  attentionToneClass(level: "info" | "warning" | "danger"): string {
    if (level === "danger") return "bg-[#fdeaea] text-[#c33d3d]";
    if (level === "warning") return "bg-[#fff2df] text-[#b66d08]";
    return "bg-[#eaf3fc] text-[#245c97]";
  }

  toggleMobile(): void {
    this.mobileOpen.update((value) => !value);
    this.searchOpen.set(false);
    this.notificationsOpen.set(false);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  @HostListener("document:keydown.escape")
  closeOverlays(): void {
    this.mobileOpen.set(false);
    this.searchOpen.set(false);
    this.notificationsOpen.set(false);
  }

  logout(): void {
    this.sessionService.disconnect();
    void this.router.navigateByUrl("/connexion");
  }
}
