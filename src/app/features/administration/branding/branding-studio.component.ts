import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { PublishedBrandingService } from "../../../core/branding/published-branding.service";
import { BrandingApiService, type BrandConfiguration, type BrandState, type BrandLayer } from "../../../core/branding/branding-api.service";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { ApplicationNotificationService } from "../../../core/notifications/application-notification.service";

const defaults = (): BrandConfiguration => ({name:"",tagline:"",primaryColor:"#175cd3",secondaryColor:"#0f172a",logoAssetId:null,backgroundAssetId:null,overlayOpacity:55,formPosition:"right",textPosition:"front",backgroundPosition:"center",layers:[]});
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const uid=()=>crypto.randomUUID();
type DragState={ pointerId:number; startX:number;startY:number; rect:DOMRect; positions:Map<string,{x:number;y:number}>; };
@Component({selector:"app-branding-studio",standalone:true,imports:[FormsModule,RouterLink,TranslatePipe],templateUrl:"./branding-studio.component.html",changeDetection:ChangeDetectionStrategy.OnPush})
export class BrandingStudioComponent implements OnDestroy {
 private readonly api=inject(BrandingApiService);
 private readonly publishedBranding=inject(PublishedBrandingService);
 readonly workspace=inject(WorkspaceContextService);
 private readonly notifications=inject(ApplicationNotificationService);
 readonly organizationId=computed(()=>this.workspace.organization()?.apiId ?? "");
 readonly config=signal<BrandConfiguration>(defaults());
 readonly layers=computed(()=>[...(this.config().layers??[])].sort((a,b)=>a.zIndex-b.zIndex));
 readonly selected=signal<string[]>([]);
 readonly chosen=computed(()=>this.layers().find(l=>this.selected()[0]===l.id)??null);
 readonly state=signal<BrandState|null>(null);
 readonly busy=signal(false); readonly error=signal(""); readonly info=signal("");
 readonly view=signal<"desktop"|"mobile">("desktop");
 readonly logoUrl=signal("");readonly backgroundUrl=signal("");
 readonly assetUrls=signal<Record<string,string>>({});
 private urls:string[]=[];private request=0;private drag:DragState|null=null;
 constructor(){effect(()=>{const id=this.organizationId();void this.load(id);});}
 ngOnDestroy(){this.request++;this.release();}
 private release(){for(const url of this.urls)URL.revokeObjectURL(url);this.urls=[];this.logoUrl.set("");this.backgroundUrl.set("");this.assetUrls.set({});}
 private report(key:string){this.error.set(key);this.notifications.error(key,"/administration/identite-visuelle");}
 private async load(id:string){const seq=++this.request;this.release();this.selected.set([]);this.state.set(null);this.config.set(defaults());this.error.set("");this.info.set("");if(!id)return;
  this.busy.set(true);try{const state=await firstValueFrom(this.api.get(id));if(seq!==this.request)return;this.state.set(state);const saved: Partial<BrandConfiguration> = state.draft?.configuration??state.published?.configuration??{};this.config.set({...defaults(),...saved,layers:Array.isArray(saved.layers)?saved.layers:[]});await this.loadImages(id,seq);}catch{if(seq===this.request)this.report("branding.errors.load");}finally{if(seq===this.request)this.busy.set(false);}}
 update<K extends keyof BrandConfiguration>(field:K,value:BrandConfiguration[K]){this.config.update(c=>({...c,[field]:value}));this.info.set("");}
 private setLayers(fn:(items:BrandLayer[])=>BrandLayer[]){this.config.update(c=>({...c,layers:fn(c.layers??[])}));this.info.set("");}
 patchLayer(id:string, patch:Partial<BrandLayer>){this.setLayers(items=>items.map(l=>l.id===id?{...l,...patch}:l));}
 async save(){const id=this.organizationId();if(!id){this.report("branding.errors.organization");return;}this.busy.set(true);this.error.set("");try{this.state.set(await firstValueFrom(this.api.save(id,this.config())));this.info.set("branding.messages.saved");}catch{this.report("branding.errors.save");}finally{this.busy.set(false);}}
 async publish(){
  const id=this.organizationId();
  if(!id){this.report("branding.errors.organization");return;}
  const config:BrandConfiguration={...this.config(),layers:(this.config().layers??[]).map(layer=>({...layer}))};
  this.busy.set(true);this.error.set("");this.info.set("");
  try{
    // Publishing the existing draft would silently discard unsaved canvas edits.
    const saved=await firstValueFrom(this.api.save(id,config));
    if(id!==this.organizationId())return;
    this.state.set(saved);
    if(!saved.draftRevisionId)throw new Error("Missing saved revision");
    const published=await firstValueFrom(this.api.publish(id,saved.draftRevisionId));
    if(id!==this.organizationId())return;
    this.state.set(published);
    await this.publishedBranding.load(id); // Refresh the live shell without a page reload.
    this.info.set("branding.messages.published");
  }catch{if(id===this.organizationId())this.report("branding.errors.publish");}
  finally{this.busy.set(false);}
 }
 async restore(){const id=this.organizationId(),revision=this.state()?.publishedRevisionId;if(!id||!revision)return;this.busy.set(true);this.error.set("");try{const state=await firstValueFrom(this.api.restore(id,revision));this.state.set(state);this.config.set({...defaults(),...(state.draft?.configuration??state.published?.configuration??{})});this.selected.set([]);await this.loadImages(id,this.request);this.info.set("branding.messages.restored");}catch{this.report("branding.errors.restore");}finally{this.busy.set(false);}}
 async resetToDefault(){
  const id=this.organizationId();
  if(!id||this.busy())return;
  if(!window.confirm("Restaurer le design PedagoraPilot initial pour cette organisation ? Cette action sera immédiatement visible par les utilisateurs. Les anciennes révisions seront conservées."))return;
  this.busy.set(true);this.error.set("");this.info.set("");
  try{
    const state=await firstValueFrom(this.api.resetToDefault(id));
    if(id!==this.organizationId())return;
    this.state.set(state);
    this.config.set(defaults());
    this.selected.set([]);
    this.release();
    await this.publishedBranding.load(id);
    this.info.set("branding.messages.resetToDefault");
  }catch{if(id===this.organizationId())this.report("branding.errors.resetToDefault");}
  finally{this.busy.set(false);}
 }
 async imageSelected(event:Event,field:"logoAssetId"|"backgroundAssetId"){const input=event.target as HTMLInputElement;const files=Array.from(input.files??[]);input.value="";if(!files.length)return;const id=this.organizationId();if(!id)return;
  if(files.some(f=>!["image/png","image/jpeg","image/webp"].includes(f.type)||f.size>8_388_608||!f.size)){this.report("branding.errors.file");return;}
  this.busy.set(true);this.error.set("");try{for(const file of files){const asset=await firstValueFrom(this.api.upload(id,file));if(field==="backgroundAssetId"&&files.length===1){this.update(field,asset.id);}else {if(field==="logoAssetId"&&!this.config().logoAssetId)this.update("logoAssetId",asset.id);this.addImage(asset.id,file.name);}}await this.loadImages(id,this.request);this.info.set("branding.messages.uploaded");}catch{this.report("branding.errors.upload");}finally{this.busy.set(false);}}
 addImage(assetId:string, name="Image"){const layer:BrandLayer={id:uid(),type:"image",assetId,text:name.slice(0,120),x:25,y:20,width:30,height:25,zIndex:this.nextZ(),opacity:100,color:"#ffffff",fontSize:24,groupId:null};this.setLayers(a=>[...a,layer]);this.selected.set([layer.id]);}
 addText(){const layer:BrandLayer={id:uid(),type:"text",assetId:null,text:"Votre texte",x:20,y:45,width:45,height:14,zIndex:this.nextZ(),opacity:100,color:"#ffffff",fontSize:26,groupId:null};this.setLayers(a=>[...a,layer]);this.selected.set([layer.id]);}
 private nextZ(){return Math.max(0,...this.layers().map(l=>l.zIndex))+1;}
 onLayerKeydown(event: Event, id: string){const key=event as KeyboardEvent;this.selectLayer(id,key.ctrlKey||key.metaKey||key.shiftKey);}
 selectLayer(id:string,multiple=false){const found=this.layers().find(l=>l.id===id);if(!found)return;const related=found.groupId?this.layers().filter(l=>l.groupId===found.groupId).map(l=>l.id):[id];this.selected.update(old=>multiple?(old.includes(id)?old.filter(x=>!related.includes(x)):[...new Set([...old,...related])]):related);}
 group(){if(this.selected().length<2)return;const groupId=uid();this.setLayers(a=>a.map(l=>this.selected().includes(l.id)?{...l,groupId}:l));}
 ungroup(){const ids=this.selected();this.setLayers(a=>a.map(l=>ids.includes(l.id)?{...l,groupId:null}:l));}
 remove(){const ids=this.selected();this.setLayers(a=>a.filter(l=>!ids.includes(l.id)));this.selected.set([]);}
 align(axis:"left"|"right"|"top"|"bottom"|"centerX"|"centerY") {const ids=this.selected();this.setLayers(a=>a.map(l=>{if(!ids.includes(l.id))return l;switch(axis){case"left":return {...l,x:0};case"right":return {...l,x:100-l.width};case"top":return {...l,y:0};case"bottom":return {...l,y:100-l.height};case"centerX":return {...l,x:(100-l.width)/2};case"centerY":return {...l,y:(100-l.height)/2};}}));}
 arrange(direction:"front"|"back"|"up"|"down"){const selected=this.selected();const sorted=[...this.layers()];const moving=sorted.filter(l=>selected.includes(l.id));if(!moving.length)return;let ordered:BrandLayer[];
  if(direction==="front")ordered=[...sorted.filter(l=>!selected.includes(l.id)),...moving];else if(direction==="back")ordered=[...moving,...sorted.filter(l=>!selected.includes(l.id))];else {ordered=[...sorted];const count=ordered.length;if(direction==="up"){for(let i=count-2;i>=0;i--)if(selected.includes(ordered[i].id)&&!selected.includes(ordered[i+1].id))[ordered[i],ordered[i+1]]=[ordered[i+1],ordered[i]];}else{for(let i=1;i<count;i++)if(selected.includes(ordered[i].id)&&!selected.includes(ordered[i-1].id))[ordered[i],ordered[i-1]]=[ordered[i-1],ordered[i]];}}
  this.setLayers(()=>ordered.map((l,i)=>({...l,zIndex:i+1})));}
 startDrag(event:PointerEvent,layer:BrandLayer,canvas:HTMLElement){if(event.button!==0)return;event.preventDefault();event.stopPropagation();this.selectLayer(layer.id,event.ctrlKey||event.metaKey||event.shiftKey);const ids=this.selected();const rect=canvas.getBoundingClientRect();this.drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,rect,positions:new Map(this.layers().filter(l=>ids.includes(l.id)).map(l=>[l.id,{x:l.x,y:l.y}]))};(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);}
 moveDrag(event:PointerEvent){const drag=this.drag;if(!drag||drag.pointerId!==event.pointerId)return;const dx=(event.clientX-drag.startX)/drag.rect.width*100,dy=(event.clientY-drag.startY)/drag.rect.height*100;this.setLayers(a=>a.map(l=>{const pos=drag.positions.get(l.id);return pos?{...l,x:Math.round(clamp(pos.x+dx,0,100-l.width)*10)/10,y:Math.round(clamp(pos.y+dy,0,100-l.height)*10)/10}:l;}));}
 stopDrag(event:PointerEvent){if(this.drag?.pointerId===event.pointerId)this.drag=null;}
 async loadImages(id:string,seq:number){this.release();const c=this.config();const assets=[...new Set([c.logoAssetId,c.backgroundAssetId,...(c.layers??[]).map(l=>l.assetId)].filter((v):v is string=>!!v))];for(const asset of assets){try{const blob=await firstValueFrom(this.api.preview(id,asset));if(seq!==this.request)return;const url=URL.createObjectURL(blob);this.urls.push(url);this.assetUrls.update(v=>({...v,[asset]:url}));}catch{if(seq===this.request)this.report("branding.errors.image");}}this.logoUrl.set(c.logoAssetId?this.assetUrls()[c.logoAssetId]??"":"");this.backgroundUrl.set(c.backgroundAssetId?this.assetUrls()[c.backgroundAssetId]??"":"");}
}
