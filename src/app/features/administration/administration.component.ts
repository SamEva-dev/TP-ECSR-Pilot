import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from "@angular/core";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ApplicationNotificationService } from "../../core/notifications/application-notification.service";
import { ReportingApiService } from "../../core/reporting/reporting-api.service";
import type { AuditEntry } from "../../core/reporting/reporting.models";
import { OrganizationAdministrationApiService, type OrganizationAdministrationDto, type UpdateOrganizationAdministrationRequest } from "../../core/administration/organization-administration-api.service";
import type { OrganizationAdminProfile, OrganizationBrandingSettings, OrganizationModuleSetting, OrganizationPreference, OrganizationAuditEntry } from "../../core/models/organization-administration.models";

const EMPTY_PROFILE: OrganizationAdminProfile = { legalName:"", shortName:"", code:"", siret:"", trainingDeclarationNumber:"", address:"", postalCode:"", city:"", country:"", email:"", phone:"", website:"", managerName:"" };
const EMPTY_BRANDING: OrganizationBrandingSettings = { primaryColor:"", secondaryColor:"", loginTagline:"", logoLabel:"", whiteLabel:false, allowSiteOverrides:false };
const MODULE_META: Omit<OrganizationModuleSetting, "enabled">[] = [
  { id:"planning", icon:"ph-calendar-dots", labelKey:"organizationAdmin.modules.items.planning.title", descriptionKey:"organizationAdmin.modules.items.planning.description" },
  { id:"attendance", icon:"ph-clipboard-text", labelKey:"organizationAdmin.modules.items.attendance.title", descriptionKey:"organizationAdmin.modules.items.attendance.description" },
  { id:"sessions", icon:"ph-list-bullets", labelKey:"organizationAdmin.modules.items.sessions.title", descriptionKey:"organizationAdmin.modules.items.sessions.description" },
  { id:"driving", icon:"ph-car", labelKey:"organizationAdmin.modules.items.driving.title", descriptionKey:"organizationAdmin.modules.items.driving.description" },
  { id:"plateau", icon:"ph-traffic-cone", labelKey:"organizationAdmin.modules.items.plateau.title", descriptionKey:"organizationAdmin.modules.items.plateau.description" },
  { id:"sheets", icon:"ph-presentation-chart", labelKey:"organizationAdmin.modules.items.sheets.title", descriptionKey:"organizationAdmin.modules.items.sheets.description" },
  { id:"skills", icon:"ph-target", labelKey:"organizationAdmin.modules.items.skills.title", descriptionKey:"organizationAdmin.modules.items.skills.description" },
  { id:"internships", icon:"ph-briefcase", labelKey:"organizationAdmin.modules.items.internships.title", descriptionKey:"organizationAdmin.modules.items.internships.description" },
  { id:"documents", icon:"ph-folder-open", labelKey:"organizationAdmin.modules.items.documents.title", descriptionKey:"organizationAdmin.modules.items.documents.description" },
  { id:"certification", icon:"ph-certificate", labelKey:"organizationAdmin.modules.items.certification.title", descriptionKey:"organizationAdmin.modules.items.certification.description" },
  { id:"statistics", icon:"ph-chart-line-up", labelKey:"organizationAdmin.modules.items.statistics.title", descriptionKey:"organizationAdmin.modules.items.statistics.description" },
];
const PREF_META: Omit<OrganizationPreference, "enabled">[] = [
  { id:"absenceAlerts", icon:"ph-warning", labelKey:"organizationAdmin.settings.items.absenceAlerts.title", descriptionKey:"organizationAdmin.settings.items.absenceAlerts.description" },
  { id:"certificationAlerts", icon:"ph-certificate", labelKey:"organizationAdmin.settings.items.certificationAlerts.title", descriptionKey:"organizationAdmin.settings.items.certificationAlerts.description" },
  { id:"weeklyDigest", icon:"ph-envelope-simple", labelKey:"organizationAdmin.settings.items.weeklyDigest.title", descriptionKey:"organizationAdmin.settings.items.weeklyDigest.description" },
  { id:"autoArchive", icon:"ph-archive", labelKey:"organizationAdmin.settings.items.autoArchive.title", descriptionKey:"organizationAdmin.settings.items.autoArchive.description" },
  { id:"strictAudit", icon:"ph-shield-check", labelKey:"organizationAdmin.settings.items.strictAudit.title", descriptionKey:"organizationAdmin.settings.items.strictAudit.description" },
];

@Component({ selector:"app-administration", imports:[RouterLink, TranslatePipe], templateUrl:"./administration.component.html", changeDetection:ChangeDetectionStrategy.OnPush })
export class AdministrationComponent {
  readonly workspace = inject(WorkspaceContextService);
  private readonly api = inject(OrganizationAdministrationApiService);
  private readonly reporting = inject(ReportingApiService);
  private readonly notifications = inject(ApplicationNotificationService);

  readonly profile = signal<OrganizationAdminProfile>({ ...EMPTY_PROFILE });
  readonly branding = signal<OrganizationBrandingSettings>({ ...EMPTY_BRANDING });
  readonly modules = signal<OrganizationModuleSetting[]>(MODULE_META.map(x => ({...x, enabled:false})));
  readonly preferences = signal<OrganizationPreference[]>(PREF_META.map(x => ({...x, enabled:false})));
  private readonly auditSignal = signal<OrganizationAuditEntry[]>([]);
  get audit(): OrganizationAuditEntry[] { return this.auditSignal(); }
  readonly saved = signal(false);
  readonly brandingSaved = signal(false);
  readonly activeSettingsTab = signal<"general"|"notifications"|"security">("general");
  readonly remoteWorkPolicy = signal({ enabled:false, approvalRequired:false, maxDaysPerWeek:0, halfDayAllowed:false, endOfDayReport:false });
  readonly remoteWorkSaved = signal(false);
  readonly generalSettings = signal({ language:"", timezone:"", dateFormat:"", academicYear:"" });
  readonly academicYearOptions = (() => {
    const now = new Date();
    const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return [`${startYear}–${startYear + 1}`, `${startYear + 1}–${startYear + 2}`] as const;
  })();
  readonly metrics = signal({ users:0, trainers:0, students:0, activeCohorts:0 });
  private lastDto: OrganizationAdministrationDto | null = null;
  private loadSequence = 0;

  readonly sites = computed(() => this.workspace.sites() ?? []);
  readonly programs = computed(() => {
    const byId = new Map<string, any>();
    for (const site of this.sites()) for (const program of this.workspace.sitePrograms(site.id)) byId.set(program.id, program);
    return [...byId.values()];
  });
  readonly cohorts = computed(() => {
    const byId = new Map<string, any>();
    for (const site of this.sites()) for (const cohort of this.workspace.siteCohorts(site.id)) byId.set(cohort.id, cohort);
    return [...byId.values()];
  });
  readonly activeCohorts = computed(() => this.metrics().activeCohorts ?? 0);

  readonly managementCards = [
    { path:"/etablissements", icon:"ph-map-pin-area", titleKey:"organizationAdmin.cards.sites.title", descriptionKey:"organizationAdmin.cards.sites.description", tone:"blue" },
    { path:"/formations", icon:"ph-books", titleKey:"organizationAdmin.cards.programs.title", descriptionKey:"organizationAdmin.cards.programs.description", tone:"orange" },
    { path:"/referentiels", icon:"ph-stack", titleKey:"organizationAdmin.cards.referentials.title", descriptionKey:"organizationAdmin.cards.referentials.description", tone:"green" },
    { path:"/acces", icon:"ph-shield-check", titleKey:"organizationAdmin.cards.access.title", descriptionKey:"organizationAdmin.cards.access.description", tone:"purple" },
    { path:"/teletravail", icon:"ph-house-line", titleKey:"organizationAdmin.cards.remoteWork.title", descriptionKey:"organizationAdmin.cards.remoteWork.description", tone:"blue" },
  ] as const;

  constructor() {
    effect(() => {
      const id = this.workspace.organization()?.apiId ?? "";
      if (!id) { this.reset(); return; }
      untracked(() => void this.load(id));
    });
  }

  updateProfile(field:keyof OrganizationAdminProfile, value:string):void { this.profile.update(x => ({...x,[field]:value ?? ""})); }
  updateBranding(field:"primaryColor"|"secondaryColor"|"loginTagline"|"logoLabel", value:string):void { this.branding.update(x => ({...x,[field]:value ?? ""})); }
  toggleBranding(field:"whiteLabel"|"allowSiteOverrides"):void { this.branding.update(x => ({...x,[field]:!x[field]})); }
  async toggleModule(id:string):Promise<void> { this.modules.update(xs => xs.map(x => x.id===id?{...x,enabled:!x.enabled}:x)); await this.persist("organizationAdmin.api.saveError"); }
  async togglePreference(id:string):Promise<void> { this.preferences.update(xs => xs.map(x => x.id===id?{...x,enabled:!x.enabled}:x)); await this.persist("organizationAdmin.api.saveError"); }
  async saveOrganization():Promise<void> { if (await this.persist("organizationAdmin.api.saveError")) this.flash(this.saved); }
  async saveBranding():Promise<void> { if (await this.persist("organizationAdmin.api.saveError")) this.flash(this.brandingSaved); }
  toggleRemoteWorkPolicy(field:"enabled"|"approvalRequired"|"halfDayAllowed"|"endOfDayReport"):void { this.remoteWorkPolicy.update(x => ({...x,[field]:!x[field]})); }
  updateRemoteWorkMaxDays(event:Event):void { const value=Number((event.target as HTMLSelectElement)?.value ?? 0); this.remoteWorkPolicy.update(x => ({...x,maxDaysPerWeek:Number.isFinite(value)?value:0})); }
  async saveRemoteWorkPolicy():Promise<void> { if (await this.persist("organizationAdmin.api.remoteWorkSaveError")) this.flash(this.remoteWorkSaved); }
  async updateGeneralSetting(field:"language"|"timezone"|"dateFormat"|"academicYear", event:Event):Promise<void> {
    const value=(event.target as HTMLSelectElement)?.value ?? ""; this.generalSettings.update(x=>({...x,[field]:value})); await this.persist("organizationAdmin.api.saveError");
  }

  exportAudit():void {
    const rows=this.auditSignal();
    const esc=(v:string)=>`"${(v??"").replaceAll('"','""')}"`;
    const csv=["Action;Acteur;Détail;Date", ...rows.map(x=>[x.actionKey,x.actor,x.detailKey,x.date].map(esc).join(";"))].join("\r\n");
    const blob=new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="audit-organisation.csv"; a.click(); URL.revokeObjectURL(url);
  }

  cardIconClass(tone:string):string { if(tone==="orange")return "bg-[#fff0d6] text-[#d47b00]"; if(tone==="green")return "bg-[#e2f7e8] text-[#159447]"; if(tone==="purple")return "bg-[#efe9ff] text-[#6f4ec7]"; return "bg-[#e6f2ff] text-[#2a64a2]"; }
  auditDotClass(tone:string):string { if(tone==="green")return "bg-[#22a84b]"; if(tone==="amber")return "bg-[#f59e0b]"; return "bg-[#2a64a2]"; }

  private async load(organizationId:string):Promise<void> {
    const seq=++this.loadSequence;
    try {
      const [dto,dashboard,audit]=await Promise.all([
        firstValueFrom(this.api.get(organizationId)),
        firstValueFrom(this.reporting.organizationDashboard(organizationId)).catch(()=>{
          this.notifications.error("organizationAdmin.api.reportingError","/administration");
          return null;
        }),
        firstValueFrom(this.reporting.audit({organizationId,page:1,pageSize:20})).catch(()=>{
          this.notifications.error("organizationAdmin.api.auditError","/administration");
          return {items:[],page:1,pageSize:20,total:0};
        }),
      ]);
      if(seq!==this.loadSequence)return;
      this.apply(dto);
      this.metrics.set({users:0,trainers:0,students:dashboard?.learners ?? 0,activeCohorts:dashboard?.activeCohorts ?? 0});
      this.auditSignal.set((audit?.items ?? []).map(x=>this.mapAudit(x)));
    } catch {
      if(seq!==this.loadSequence)return; this.reset(); this.notifications.error("organizationAdmin.api.loadError","/administration");
    }
  }

  private apply(dto:OrganizationAdministrationDto):void {
    this.lastDto=dto;
    this.profile.set({legalName:dto?.legalName??"",shortName:dto?.shortName??"",code:dto?.code??"",siret:dto?.siret??"",trainingDeclarationNumber:dto?.trainingDeclarationNumber??"",address:dto?.address??"",postalCode:dto?.postalCode??"",city:dto?.city??"",country:dto?.country??"",email:dto?.email??"",phone:dto?.phone??"",website:dto?.website??"",managerName:dto?.managerName??""});
    this.branding.set({primaryColor:dto?.primaryColor??"",secondaryColor:dto?.secondaryColor??"",loginTagline:dto?.loginTagline??"",logoLabel:dto?.logoLabel??"",whiteLabel:!!dto?.whiteLabel,allowSiteOverrides:!!dto?.allowSiteOverrides});
    const enabled=new Set(dto?.enabledModules??[]); this.modules.set(MODULE_META.map(x=>({...x,enabled:enabled.has(x.id)})));
    this.preferences.set(PREF_META.map(x=>({...x,enabled:!!(dto as any)?.[x.id]})));
    this.generalSettings.set({language:dto?.language??"",timezone:dto?.timezone??"",dateFormat:dto?.dateFormat??"",academicYear:dto?.academicYear??""});
    this.remoteWorkPolicy.set({enabled:!!dto?.remoteWorkEnabled,approvalRequired:!!dto?.remoteWorkApprovalRequired,maxDaysPerWeek:Number(dto?.remoteWorkMaxDaysPerWeek??0),halfDayAllowed:!!dto?.remoteWorkHalfDayAllowed,endOfDayReport:!!dto?.remoteWorkEndOfDayReport});
  }

  private request():UpdateOrganizationAdministrationRequest {
    const p=this.profile(), b=this.branding(), g=this.generalSettings(), r=this.remoteWorkPolicy(); const pref=Object.fromEntries(this.preferences().map(x=>[x.id,x.enabled])) as any;
    return {legalName:p.legalName??"",shortName:p.shortName??"",siret:p.siret??"",trainingDeclarationNumber:p.trainingDeclarationNumber??"",address:p.address??"",postalCode:p.postalCode??"",city:p.city??"",country:p.country??"",email:p.email??"",phone:p.phone??"",website:p.website??"",managerName:p.managerName??"",primaryColor:b.primaryColor??"",secondaryColor:b.secondaryColor??"",loginTagline:b.loginTagline??"",logoLabel:b.logoLabel??"",whiteLabel:!!b.whiteLabel,allowSiteOverrides:!!b.allowSiteOverrides,enabledModules:this.modules().filter(x=>x.enabled).map(x=>x.id),absenceAlerts:!!pref.absenceAlerts,certificationAlerts:!!pref.certificationAlerts,weeklyDigest:!!pref.weeklyDigest,autoArchive:!!pref.autoArchive,strictAudit:!!pref.strictAudit,language:g.language??"",timezone:g.timezone??"",dateFormat:g.dateFormat??"",academicYear:g.academicYear??"",remoteWorkEnabled:!!r.enabled,remoteWorkApprovalRequired:!!r.approvalRequired,remoteWorkMaxDaysPerWeek:Number(r.maxDaysPerWeek??0),remoteWorkHalfDayAllowed:!!r.halfDayAllowed,remoteWorkEndOfDayReport:!!r.endOfDayReport};
  }

  private async persist(errorKey:string):Promise<boolean> {
    const id=this.workspace.organization()?.apiId??""; if(!id)return false;
    try { const dto=await firstValueFrom(this.api.update(id,this.request())); this.apply(dto); await this.workspace.reload(); return true; }
    catch { this.notifications.error(errorKey,"/administration"); if(this.lastDto)this.apply(this.lastDto); return false; }
  }
  private flash(target:{set(v:boolean):void}):void { target.set(true); window.setTimeout(()=>target.set(false),1800); }
  private mapAudit(x:AuditEntry):OrganizationAuditEntry {
    const actor=x?.userDisplayName?.trim()||""; const initials=actor.split(/\s+/).filter(Boolean).slice(0,2).map(v=>v[0]??"").join("").toUpperCase();
    const action=(x?.action??"").trim(); const detail=[x?.entityType??"",x?.route??""].filter(Boolean).join(" · ");
    const timezone=this.generalSettings().timezone||"Europe/Paris";
    const date=x?.occurredAtUtc?new Intl.DateTimeFormat("fr-FR",{dateStyle:"short",timeStyle:"short",timeZone:timezone}).format(new Date(x.occurredAtUtc)):"";
    const lower=action.toLowerCase(); const tone:OrganizationAuditEntry["tone"]=lower.includes("create")||lower.includes("post")?"green":lower.includes("delete")||lower.includes("revoke")?"amber":"blue";
    return {id:x?.id??"",actor,initials,actionKey:action,detailKey:detail,date,tone};
  }
  private reset():void { this.lastDto=null; this.profile.set({...EMPTY_PROFILE}); this.branding.set({...EMPTY_BRANDING}); this.modules.set(MODULE_META.map(x=>({...x,enabled:false}))); this.preferences.set(PREF_META.map(x=>({...x,enabled:false}))); this.generalSettings.set({language:"",timezone:"",dateFormat:"",academicYear:""}); this.remoteWorkPolicy.set({enabled:false,approvalRequired:false,maxDaysPerWeek:0,halfDayAllowed:false,endOfDayReport:false}); this.metrics.set({users:0,trainers:0,students:0,activeCohorts:0}); this.auditSignal.set([]); }
}
