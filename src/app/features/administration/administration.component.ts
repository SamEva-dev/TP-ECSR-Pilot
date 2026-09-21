import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  PROGRAM_OFFERINGS,
  TRAINING_PROGRAMS,
  TRAINING_SITES,
  WORKSPACE_COHORTS,
} from "../../core/mock-data/workspace.mock";
import {
  ORGANIZATION_AUDIT,
  ORGANIZATION_MODULE_SETTINGS,
  ORGANIZATION_PREFERENCES,
  organizationBrandingFor,
  organizationMetricsFor,
  organizationProfileFor,
  type OrganizationAdminProfile,
  type OrganizationBrandingSettings,
} from "../../core/mock-data/organization-administration.mock";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { REMOTE_WORK_POLICY } from "../../core/mock-data/remote-work.mock";

@Component({
  selector: "app-administration",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./administration.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministrationComponent {
  readonly workspace = inject(WorkspaceContextService);

  readonly profile = signal<OrganizationAdminProfile>(organizationProfileFor("org-aftral"));
  readonly branding = signal<OrganizationBrandingSettings>(organizationBrandingFor("org-aftral"));
  readonly modules = signal(ORGANIZATION_MODULE_SETTINGS.map((item) => ({ ...item })));
  readonly preferences = signal(ORGANIZATION_PREFERENCES.map((item) => ({ ...item })));
  readonly audit = ORGANIZATION_AUDIT;
  readonly saved = signal(false);
  readonly brandingSaved = signal(false);
  readonly activeSettingsTab = signal<"general" | "notifications" | "security">("general");
  readonly remoteWorkPolicy = signal({ ...REMOTE_WORK_POLICY });
  readonly remoteWorkSaved = signal(false);

  readonly sites = computed(() => {
    const id = this.workspace.organization()?.id;
    return TRAINING_SITES.filter((site) => site.organizationId === id);
  });

  readonly programIds = computed(() => {
    const siteIds = this.sites().map((site) => site.id);
    return [
      ...new Set(
        PROGRAM_OFFERINGS.filter((offering) => siteIds.includes(offering.siteId) && offering.active).map(
          (offering) => offering.programId,
        ),
      ),
    ];
  });

  readonly programs = computed(() =>
    TRAINING_PROGRAMS.filter((program) => this.programIds().includes(program.id)),
  );

  readonly cohorts = computed(() => {
    const siteIds = this.sites().map((site) => site.id);
    const offeringIds = PROGRAM_OFFERINGS.filter((offering) => siteIds.includes(offering.siteId)).map(
      (offering) => offering.id,
    );
    return WORKSPACE_COHORTS.filter((cohort) => offeringIds.includes(cohort.offeringId));
  });

  readonly metrics = computed(() => organizationMetricsFor(this.workspace.organization()?.id));
  readonly activeCohorts = computed(() => this.cohorts().filter((cohort) => cohort.status === "active").length);

  readonly managementCards = [
    { path: "/etablissements", icon: "ph-map-pin-area", titleKey: "organizationAdmin.cards.sites.title", descriptionKey: "organizationAdmin.cards.sites.description", tone: "blue" },
    { path: "/formations", icon: "ph-books", titleKey: "organizationAdmin.cards.programs.title", descriptionKey: "organizationAdmin.cards.programs.description", tone: "orange" },
    { path: "/referentiels", icon: "ph-stack", titleKey: "organizationAdmin.cards.referentials.title", descriptionKey: "organizationAdmin.cards.referentials.description", tone: "green" },
    { path: "/acces", icon: "ph-shield-check", titleKey: "organizationAdmin.cards.access.title", descriptionKey: "organizationAdmin.cards.access.description", tone: "purple" },
    { path: "/teletravail", icon: "ph-house-line", titleKey: "organizationAdmin.cards.remoteWork.title", descriptionKey: "organizationAdmin.cards.remoteWork.description", tone: "blue" },
  ] as const;

  constructor() {
    effect(() => {
      const organizationId = this.workspace.organization()?.id;
      this.profile.set(organizationProfileFor(organizationId));
      this.branding.set(organizationBrandingFor(organizationId));
      this.modules.set(ORGANIZATION_MODULE_SETTINGS.map((item) => ({ ...item })));
      this.preferences.set(ORGANIZATION_PREFERENCES.map((item) => ({ ...item })));
    });
  }

  updateProfile(field: keyof OrganizationAdminProfile, value: string): void {
    this.profile.update((current) => ({ ...current, [field]: value }));
  }

  updateBranding(field: "primaryColor" | "secondaryColor" | "loginTagline" | "logoLabel", value: string): void {
    this.branding.update((current) => ({ ...current, [field]: value }));
  }

  toggleBranding(field: "whiteLabel" | "allowSiteOverrides"): void {
    this.branding.update((current) => ({ ...current, [field]: !current[field] }));
  }

  toggleModule(id: string): void {
    this.modules.update((items) =>
      items.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
    );
  }

  togglePreference(id: string): void {
    this.preferences.update((items) =>
      items.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
    );
  }

  saveOrganization(): void {
    this.saved.set(true);
    window.setTimeout(() => this.saved.set(false), 1800);
  }

  saveBranding(): void {
    this.brandingSaved.set(true);
    window.setTimeout(() => this.brandingSaved.set(false), 1800);
  }

  toggleRemoteWorkPolicy(field: "enabled" | "approvalRequired" | "halfDayAllowed" | "endOfDayReport"): void {
    this.remoteWorkPolicy.update((current) => ({ ...current, [field]: !current[field] }));
  }

  updateRemoteWorkMaxDays(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.remoteWorkPolicy.update((current) => ({ ...current, maxDaysPerWeek: value }));
  }

  saveRemoteWorkPolicy(): void {
    this.remoteWorkSaved.set(true);
    window.setTimeout(() => this.remoteWorkSaved.set(false), 1800);
  }

  cardIconClass(tone: string): string {
    if (tone === "orange") return "bg-[#fff0d6] text-[#d47b00]";
    if (tone === "green") return "bg-[#e2f7e8] text-[#159447]";
    if (tone === "purple") return "bg-[#efe9ff] text-[#6f4ec7]";
    return "bg-[#e6f2ff] text-[#2a64a2]";
  }

  auditDotClass(tone: string): string {
    if (tone === "green") return "bg-[#22a84b]";
    if (tone === "amber") return "bg-[#f59e0b]";
    return "bg-[#2a64a2]";
  }
}
