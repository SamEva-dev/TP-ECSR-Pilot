import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { ReferentialApiStoreService } from "../../../core/api-data/referential-api-store.service";
import { SkillsApiStoreService } from "../../../core/api-data/skills-api-store.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { LearningApiService } from "../../../core/learning/learning-api.service";
import type { CompetencyDefinitionDto } from "../../../core/learning/learning.models";
import { ApplicationNotificationService } from "../../../core/notifications/application-notification.service";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";

type Draft = { id?: string; parentId: string; code: string; title: string; kind: string; sortOrder: number; active: boolean };

@Component({
  selector: "app-competencies-configuration",
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: "./competencies-configuration.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetenciesConfigurationComponent {
  readonly workspace = inject(WorkspaceContextService);
  private readonly referentials = inject(ReferentialApiStoreService);
  private readonly api = inject(LearningApiService);
  private readonly skills = inject(SkillsApiStoreService);
  private readonly notifications = inject(ApplicationNotificationService);
  readonly items = signal<CompetencyDefinitionDto[]>([]);
  readonly loading = signal(false);
  readonly editorOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly pendingDelete = signal<CompetencyDefinitionDto | null>(null);
  readonly query = signal("");
  draft: Draft = this.emptyDraft();
  private loadSequence = 0;

  readonly referentialVersionId = computed(() => {
    const level = this.workspace.activeLevel();
    if (level === "cohort") return String(this.workspace.cohort()?.referentialVersionId ?? "");
    if (level !== "program") return "";
    const program = this.workspace.program();
    if (!program) return "";
    const current = this.referentials.items()
      .filter((x) => x.programId === program.id || x.programId === program.apiId)
      .sort((a,b) => Number(b.status === "active") - Number(a.status === "active") || (b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? ""))[0];
    return String(current?.apiId ?? "");
  });
  readonly contextReady = computed(() => !!this.referentialVersionId());
  readonly roots = computed(() => this.items().filter(x => !x.parentId).sort((a,b) => a.sortOrder-b.sortOrder || a.code.localeCompare(b.code)));
  readonly activeCount = computed(() => this.items().filter(x => x.active).length);
  readonly filteredRoots = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.roots();
    return this.roots().filter(root => root.code.toLowerCase().includes(q) || root.title.toLowerCase().includes(q) || this.children(root.id).some(c => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)));
  });

  constructor() { effect(() => void this.reload(this.referentialVersionId())); }
  children(parentId: string) { return this.items().filter(x => x.parentId === parentId).sort((a,b) => a.sortOrder-b.sortOrder || a.code.localeCompare(b.code)); }
  updateQuery(e: Event) { this.query.set((e.target as HTMLInputElement).value ?? ""); }
  openCreate(parentId = "") { const next = this.items().length ? Math.max(...this.items().map(x => x.sortOrder ?? 0)) + 1 : 10; this.draft = { ...this.emptyDraft(), parentId, sortOrder: next }; this.editorOpen.set(true); }
  openEdit(item: CompetencyDefinitionDto) { this.draft = { id:item.id, parentId:item.parentId ?? "", code:item.code ?? "", title:item.title ?? "", kind:item.kind || "learning", sortOrder:item.sortOrder ?? 0, active:item.active !== false }; this.editorOpen.set(true); }
  closeEditor() { this.editorOpen.set(false); }
  async save() {
    const v=this.referentialVersionId(), d=this.draft;
    if (!v || !d.code.trim() || !d.title.trim()) return;
    const body={ parentId:d.parentId || null, code:d.code.trim(), title:d.title.trim(), kind:d.kind || "learning", sortOrder:Number(d.sortOrder)||0, active:!!d.active };
    try { if(d.id) await firstValueFrom(this.api.updateCompetency(v,d.id,body)); else await firstValueFrom(this.api.createCompetency(v,body)); await this.reload(v); this.skills.refreshContext(); this.editorOpen.set(false); }
    catch { this.notifications.error("competencyConfig.api.saveError","/administration/competences"); }
  }
  async toggle(item: CompetencyDefinitionDto) { const v=this.referentialVersionId(); if(!v)return; try { await firstValueFrom(this.api.updateCompetency(v,item.id,{parentId:item.parentId ?? null,code:item.code,title:item.title,kind:item.kind,sortOrder:item.sortOrder,active:!item.active})); await this.reload(v); this.skills.refreshContext(); } catch { this.notifications.error("competencyConfig.api.saveError","/administration/competences"); } }
  requestDelete(item: CompetencyDefinitionDto){ this.pendingDelete.set(item); this.deleteOpen.set(true); }
  cancelDelete(){ this.pendingDelete.set(null); this.deleteOpen.set(false); }
  async confirmDelete(){ const item=this.pendingDelete(),v=this.referentialVersionId(); if(!item||!v)return; try { await firstValueFrom(this.api.deleteCompetency(v,item.id)); await this.reload(v); this.skills.refreshContext(); this.cancelDelete(); } catch { this.notifications.error("competencyConfig.api.deleteError","/administration/competences"); } }
  private async reload(v:string){ const seq=++this.loadSequence; if(!v){this.items.set([]);return;} this.loading.set(true); try{ const rows=await firstValueFrom(this.api.getCompetencyCatalog(v)); if(seq===this.loadSequence)this.items.set(Array.isArray(rows)?rows:[]);}catch{if(seq===this.loadSequence){this.items.set([]);this.notifications.error("competencyConfig.api.loadError","/administration/competences");}}finally{if(seq===this.loadSequence)this.loading.set(false);} }
  private emptyDraft():Draft{return {parentId:"",code:"",title:"",kind:"learning",sortOrder:0,active:true};}
}
