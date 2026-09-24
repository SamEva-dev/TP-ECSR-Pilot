import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
export interface WorkspaceOrganizationApi { id:string; key:string; code:string; name:string; shortName:string; city:string; active:boolean; primaryColor:string; secondaryColor:string; }
export interface WorkspaceSiteApi { id:string; key:string; organizationId:string; organizationKey:string; code:string; name:string; city:string; active:boolean; }
export interface WorkspaceProgramApi { id:string; key:string; code:string; name:string; familyCode:string; category:string; icon:string; descriptionKey:string; durationHours:number; status:string; enabledModules:string[]; siteKeys:string[]; referenceVersion?:string|null; }
export interface WorkspaceOfferingApi { id:string; key:string; siteId:string; siteKey:string; programId:string; programKey:string; active:boolean; }
export interface WorkspaceCohortApi { id:string; key:string; organizationId:string; siteId:string; programOfferingId:string; referentialVersionId:string; code:string; name:string; startDate:string; endDate:string; capacity:number; learnerCount:number; status:string; }
export interface WorkspaceBootstrapApi { organizations:WorkspaceOrganizationApi[]; sites:WorkspaceSiteApi[]; programs:WorkspaceProgramApi[]; offerings:WorkspaceOfferingApi[]; cohorts:WorkspaceCohortApi[]; defaultSelection?:{ organizationId:string; siteId?:string|null; programId?:string|null; cohortId?:string|null }|null; }
@Injectable({providedIn:"root"}) export class WorkspaceApiService { private readonly http=inject(HttpClient); load():Promise<WorkspaceBootstrapApi>{ return firstValueFrom(this.http.get<WorkspaceBootstrapApi>(`${environment.apiBaseUrl}/api/v1/me/workspace`)); } }
