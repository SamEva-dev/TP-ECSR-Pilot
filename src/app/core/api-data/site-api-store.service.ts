import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import type { SiteFormValue, SiteProfile } from "../models/sites.models";
import { WorkspaceContextService } from "../workspace/workspace-context.service";
@Injectable({providedIn:"root"}) export class SiteApiStoreService {
 private readonly http=inject(HttpClient); private readonly workspace=inject(WorkspaceContextService); private readonly sitesSignal=signal<SiteProfile[]>([]); readonly sites=this.sitesSignal.asReadonly();
 constructor(){this.sync();}
 sync():void{this.sitesSignal.set(this.workspace.sites().map(x=>({id:x.id,apiId:x.apiId,organizationId:x.organizationId,code:x.code,name:x.name,city:x.city,status:x.active?"active":"inactive",address:"",postalCode:"",phone:"",email:"",manager:"",students:0,trainers:0,programs:0,activeCohorts:0,attendanceRate:0,successRate:0,rooms:0,vehicles:0,alerts:0} as any)));}
 create(organizationId:string,value:SiteFormValue):SiteProfile{const org=this.workspace.organizations().find(x=>x.id===organizationId);if(org?.apiId)void firstValueFrom(this.http.post(`${environment.apiBaseUrl}/api/v1/organizations/${org.apiId}/sites`,{code:value.code,name:value.name,city:value.city,externalKey:`site-${value.code.toLowerCase()}`})).then(()=>this.workspace.reload());return {id:"pending",organizationId,...value,students:0,trainers:0,programs:0,activeCohorts:0,attendanceRate:0,successRate:0,rooms:0,vehicles:0,alerts:0} as SiteProfile;}
 update(id:string,value:SiteFormValue):void{const site=this.workspace.sites().find(x=>x.id===id);const org=this.workspace.organizations().find(x=>x.id===site?.organizationId);if(site?.apiId&&org?.apiId)void firstValueFrom(this.http.put(`${environment.apiBaseUrl}/api/v1/organizations/${org.apiId}/sites/${site.apiId}`,{name:value.name,city:value.city,status:value.status})).then(()=>this.workspace.reload());}
 byId(id:string):SiteProfile|undefined{this.sync();return this.sitesSignal().find(x=>x.id===id);}
}
