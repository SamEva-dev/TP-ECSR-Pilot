import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom, forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { environment } from "../../environments/environment";
import type { WorkspaceBootstrapApi } from "../workspace/workspace-api.service";
import {
  ACCESS_ACCOUNTS, ATTENDANCE_STUDENTS, CENTER_COMPETENCIES, CENTER_PROMOTIONS, CENTER_RANKING, CENTER_STATUSES,
  CERTIFICATION_CANDIDATES, CONTEXTUAL_PROMOTIONS, DEFAULT_SHEET_CATALOG, DISTANCE_ASYNC_MODULES, DISTANCE_LIVE_SESSIONS,
  DRIVING_COMPETENCIES, DRIVING_CRITERIA, DRIVING_HISTORY, DRIVING_OBSERVATIONS, DRIVING_PROGRAMMED, DRIVING_SUB_SKILLS,
  DRIVING_TRAINERS, EXAM_SESSIONS, INTERNSHIP_PERIODS, ORGANIZATIONS, ORGANIZATION_ACTIVITY, ORGANIZATION_ALERTS,
  ORGANIZATION_AUDIT, ORGANIZATION_KPIS, PEDAGOGICAL_TEAM, PLANNING_EVENTS, PROGRAM_CATALOG, PROGRAM_OFFERINGS,
  PROGRAM_PERFORMANCES, PROGRAMMED_SESSIONS, PROMOTION_METRICS, REMOTE_WORK_ACTIVITIES, REMOTE_WORK_REQUESTS,
  SECRETARIAT_PRIORITIES, SESSION_TRAINERS, SITE_ALERTS, SITE_PERFORMANCES, SITE_PROGRAM_METRICS, SKILL_DEFINITIONS,
  SKILL_LINKED_SESSIONS, STUDENT_COMPETENCIES, STUDENT_DIRECTORY, SUCCESS_ANALYTICS_RECORDS, TEAM_WORK_MODE_WEEK,
  TRAINER_AGENDA, TRAINER_COMPETENCIES, TRAINER_STUDENTS, TRAINING_PROGRAMS, TRAINING_REFERENTIALS, TRAINING_SITES,
  WORKSPACE_COHORTS, replaceRuntimeArray
} from "./runtime-data.store";

@Injectable({ providedIn: "root" })
export class RuntimeDataLoaderService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;
  private readonly auth = environment.authGateBaseUrl;

  async hydrateWorkspace(dto: WorkspaceBootstrapApi, selection?: { organizationId?: string; siteId?: string; programId?: string; cohortId?: string } | null): Promise<void> {
    replaceRuntimeArray(ORGANIZATIONS, dto.organizations.map(x => ({ ...x, id:x.key, apiId:x.id })));
    replaceRuntimeArray(TRAINING_SITES, dto.sites.map(x => ({ ...x, id:x.key, apiId:x.id, organizationId:x.organizationKey })));
    replaceRuntimeArray(TRAINING_PROGRAMS, dto.programs.map(x => ({ ...x, id:x.key, apiId:x.id, active:x.status === "active" })));
    replaceRuntimeArray(PROGRAM_OFFERINGS, dto.offerings.map(x => ({ ...x, id:x.key, apiId:x.id, siteId:x.siteKey, programId:x.programKey })));
    replaceRuntimeArray(WORKSPACE_COHORTS, dto.cohorts.map(x => ({ ...x, id:x.key, apiId:x.id, offeringId:dto.offerings.find(o=>o.id===x.programOfferingId)?.key ?? x.programOfferingId, shortName:x.code, start:x.startDate, end:x.endDate, studentCount:x.learnerCount })));
    replaceRuntimeArray(CONTEXTUAL_PROMOTIONS, WORKSPACE_COHORTS.map(c => ({ ...c, programId:dto.offerings.find(o=>o.key===c.offeringId)?.programKey, siteId:dto.offerings.find(o=>o.key===c.offeringId)?.siteKey })));

    const programId = selection?.programId ?? dto.defaultSelection?.programId ?? undefined;
    const cohortId = selection?.cohortId ?? dto.defaultSelection?.cohortId ?? undefined;
    const siteId = selection?.siteId ?? dto.defaultSelection?.siteId ?? undefined;
    const organizationId = selection?.organizationId ?? dto.defaultSelection?.organizationId ?? undefined;
    await this.hydrateContext({ organizationId, siteId, programId, cohortId }, dto);
  }

  async hydrateContext(selection: { organizationId?: string; siteId?: string; programId?: string; cohortId?: string }, dto?: WorkspaceBootstrapApi): Promise<void> {
    const cohort = (dto?.cohorts ?? []).find(x => x.id === selection.cohortId || x.key === selection.cohortId)
      ?? WORKSPACE_COHORTS.find(x => x.apiId === selection.cohortId || x.id === selection.cohortId);
    const cohortApiId = cohort?.apiId ?? cohort?.id;
    const referentialVersionId = cohort?.referentialVersionId;
    const organizationApiId = (dto?.organizations ?? []).find(x=>x.id===selection.organizationId||x.key===selection.organizationId)?.id
      ?? ORGANIZATIONS.find(x=>x.id===selection.organizationId)?.apiId;
    const siteApiId = (dto?.sites ?? []).find(x=>x.id===selection.siteId||x.key===selection.siteId)?.id
      ?? TRAINING_SITES.find(x=>x.id===selection.siteId)?.apiId;

    const requests: Record<string, any> = {
      referentials: this.http.get<any[]>(`${this.api}/api/v1/referentials`).pipe(catchError(() => of([]))),
      programs: this.http.get<any[]>(`${this.api}/api/v1/programs`).pipe(catchError(() => of([]))),
      audit: this.http.get<any>(`${this.api}/api/v1/reporting/audit`, { params:new HttpParams().set("pageSize","100") }).pipe(catchError(() => of({items:[]}))),
      users: this.http.get<any[]>(`${this.auth}/api/Users`).pipe(catchError(() => of([]))),
    };
    if (cohortApiId) {
      requests["learners"] = this.http.get<any[]>(`${this.api}/api/v1/cohorts/${cohortApiId}/learners`).pipe(catchError(() => of([])));
      requests["sessions"] = this.http.get<any[]>(`${this.api}/api/v1/training-sessions`, { params:new HttpParams().set("cohortId",cohortApiId) }).pipe(catchError(() => of([])));
      requests["workplace"] = this.http.get<any[]>(`${this.api}/api/v1/workplace/periods`, { params:new HttpParams().set("cohortId",cohortApiId) }).pipe(catchError(() => of([])));
      requests["certSessions"] = this.http.get<any[]>(`${this.api}/api/v1/certification/sessions`, { params:new HttpParams().set("cohortId",cohortApiId) }).pipe(catchError(() => of([])));
      requests["distanceLive"] = this.http.get<any[]>(`${this.api}/api/v1/distance-learning/live-sessions`, { params:new HttpParams().set("cohortId",cohortApiId) }).pipe(catchError(() => of([])));
      requests["distanceAsync"] = this.http.get<any[]>(`${this.api}/api/v1/distance-learning/async-modules`, { params:new HttpParams().set("cohortId",cohortApiId) }).pipe(catchError(() => of([])));
    }
    if (referentialVersionId) {
      requests["topics"] = this.http.get<any[]>(`${this.api}/api/v1/learning/referentials/${referentialVersionId}/topics`).pipe(catchError(() => of([])));
      requests["competencies"] = this.http.get<any[]>(`${this.api}/api/v1/learning/referentials/${referentialVersionId}/competencies`).pipe(catchError(() => of([])));
      requests["certSchemes"] = this.http.get<any[]>(`${this.api}/api/v1/certification/schemes`, { params:new HttpParams().set("referentialVersionId",referentialVersionId) }).pipe(catchError(() => of([])));
    }
    if (organizationApiId) requests["orgDashboard"] = this.http.get<any>(`${this.api}/api/v1/reporting/organizations/${organizationApiId}/dashboard`).pipe(catchError(() => of(null)));
    if (siteApiId) requests["siteDashboard"] = this.http.get<any>(`${this.api}/api/v1/reporting/sites/${siteApiId}/dashboard`).pipe(catchError(() => of(null)));
    if (cohortApiId) requests["cohortDashboard"] = this.http.get<any>(`${this.api}/api/v1/reporting/cohorts/${cohortApiId}/dashboard`).pipe(catchError(() => of(null)));
    if (siteApiId) requests["remoteWork"] = this.http.get<any[]>(`${this.api}/api/v1/workforce/remote-work`, { params:new HttpParams().set("siteId",siteApiId) }).pipe(catchError(() => of([])));

    const data:any = await firstValueFrom(forkJoin(requests));
    replaceRuntimeArray(TRAINING_REFERENTIALS, (data.referentials ?? []).map((x:any)=>({ ...x, id:x.key ?? x.id, programId:x.programKey ?? x.programId, version:x.version, totalHours:x.totalHours ?? 0, sheetCount:x.sheetCount ?? 0, stageRequirements:[] })));
    replaceRuntimeArray(PROGRAM_CATALOG, (data.programs ?? []).map((x:any)=>({ ...x, id:x.key ?? x.id, apiId:x.id, description:x.descriptionKey, siteIds:x.siteKeys ?? [], students:0, trainers:0, activeCohorts:0, successRate:null })));

    const learners=(data.learners ?? []).map((x:any)=>({
      id:x.learnerProfileId, apiId:x.learnerProfileId, enrollmentId:x.enrollmentId, firstName:x.firstName, lastName:x.lastName,
      email:x.email, phone:x.phone, promotionId:cohort?.key ?? cohort?.id ?? "", promotionName:cohort?.name ?? "", progress:0,
      completedHours:0, catchupHours:0, preparedSheets:0, presentedSheets:0, validatedSheets:0,
      status:x.enrollmentStatus === "active" ? "good" : "warning"
    }));
    replaceRuntimeArray(STUDENT_DIRECTORY, learners);
    replaceRuntimeArray(TRAINER_STUDENTS, learners);

    const sessions=(data.sessions ?? []).map((x:any)=>{
      const start=new Date(x.startsAtUtc); const end=new Date(x.endsAtUtc);
      return { id:x.id, apiId:x.id, promotionId:cohort?.key ?? cohort?.id ?? "", promotion:cohort?.name ?? "", type:this.sessionType(x.type), titleKey:"", title:x.title,
        date:start.toISOString().slice(0,10), start:start.toISOString(), end:end.toISOString(), time:`${this.hhmm(start)}–${this.hhmm(end)}`,
        trainer:x.trainerDisplayName ?? "", meta:x.location ?? "", location:x.location ?? "", expected:x.expectedLearners ?? 0, present:x.presentLearners ?? 0,
        objectiveKey:"", supportsKey:"", modality:x.modality, status:x.status };
    });
    replaceRuntimeArray(PROGRAMMED_SESSIONS, sessions);
    replaceRuntimeArray(PLANNING_EVENTS, sessions.map((x:any)=>({ ...x, title:x.title, meta:x.meta })));
    replaceRuntimeArray(DRIVING_PROGRAMMED, sessions.filter((x:any)=>x.type === "driving"));
    replaceRuntimeArray(SESSION_TRAINERS, [...new Set(sessions.map((x:any)=>x.trainer).filter(Boolean))].map((name:any,i)=>({id:`trainer-${i}`,name,label:name})));
    replaceRuntimeArray(PEDAGOGICAL_TEAM, SESSION_TRAINERS);

    const periods=(data.workplace ?? []).map((x:any)=>({ id:x.id, studentId:x.learnerExternalKey ?? x.enrollmentId, studentName:x.learnerDisplayName, company:x.company, city:x.city,
      tutor:x.tutorName, startDate:x.startDate, endDate:x.endDate, plannedHours:x.plannedHours, completedHours:x.completedHours, status:x.status,
      trainerVisible:x.trainerVisible, activities:x.activities ?? [], documents:x.documents ?? [], tutorObservationKey:x.tutorObservation ?? "" }));
    replaceRuntimeArray(INTERNSHIP_PERIODS, periods);

    replaceRuntimeArray(EXAM_SESSIONS, data.certSessions ?? []);
    let candidates:any[]=[];
    const firstExam=(data.certSessions ?? [])[0];
    if(firstExam?.id){ try{ candidates=await firstValueFrom(this.http.get<any[]>(`${this.api}/api/v1/certification/sessions/${firstExam.id}/candidates`)); }catch{} }
    replaceRuntimeArray(CERTIFICATION_CANDIDATES, candidates.map((x:any)=>({ ...x, studentId:x.enrollmentId, firstName:x.firstName ?? x.learnerDisplayName?.split(" ")[0] ?? "", lastName:x.lastName ?? x.learnerDisplayName?.split(" ").slice(1).join(" ") ?? "", ready:x.eligible, unitStatuses:x.unitStatuses ?? [], steps:x.assessments ?? [] })));
    (globalThis as any).__pedagoraCertificationSchemes = data.certSchemes ?? [];

    const topics=(data.topics ?? []).map((x:any)=>({ id:x.id, apiId:x.id, number:x.number, code:x.code, titleKey:"", customTitle:x.title, category:x.category, durationMinutes:x.durationMinutes, active:x.active, status:"not_started" }));
    replaceRuntimeArray(DEFAULT_SHEET_CATALOG, topics);
    const comps=(data.competencies ?? []).map((x:any)=>({ id:x.id, apiId:x.id, code:x.code, title:x.title, titleKey:"", parentId:x.parentId, kind:x.kind, active:x.active, progress:0 }));
    replaceRuntimeArray(SKILL_DEFINITIONS, comps);
    replaceRuntimeArray(DRIVING_COMPETENCIES, comps.filter((x:any)=>x.kind?.toLowerCase().includes("driv") || x.code?.toUpperCase().startsWith("C")));
    replaceRuntimeArray(DRIVING_SUB_SKILLS, comps.filter((x:any)=>x.parentId));
    replaceRuntimeArray(DRIVING_CRITERIA, []);
    replaceRuntimeArray(SKILL_LINKED_SESSIONS, sessions);

    replaceRuntimeArray(DISTANCE_LIVE_SESSIONS, data.distanceLive ?? []);
    replaceRuntimeArray(DISTANCE_ASYNC_MODULES, data.distanceAsync ?? []);
    replaceRuntimeArray(REMOTE_WORK_REQUESTS, data.remoteWork ?? []);
    replaceRuntimeArray(REMOTE_WORK_ACTIVITIES, (data.remoteWork ?? []).flatMap((x:any)=>x.activities ?? []));
    replaceRuntimeArray(TEAM_WORK_MODE_WEEK, []);

    const audit=data.audit?.items ?? [];
    replaceRuntimeArray(ORGANIZATION_AUDIT, audit);
    replaceRuntimeArray(ORGANIZATION_ACTIVITY, audit.slice(0,10));
    const orgDash=data.orgDashboard;
    replaceRuntimeArray(ORGANIZATION_KPIS, orgDash ? [orgDash] : []);
    replaceRuntimeArray(ORGANIZATION_ALERTS, orgDash?.openAlerts ? [{id:"open-alerts",count:orgDash.openAlerts}] : []);
    replaceRuntimeArray(PROMOTION_METRICS, data.cohortDashboard ? [data.cohortDashboard] : []);
    replaceRuntimeArray(SITE_PERFORMANCES, data.siteDashboard ? [data.siteDashboard] : []);
    replaceRuntimeArray(SITE_PROGRAM_METRICS, []);
    replaceRuntimeArray(SITE_ALERTS, []);
    replaceRuntimeArray(PROGRAM_PERFORMANCES, []);
    replaceRuntimeArray(CENTER_PROMOTIONS, data.cohortDashboard ? [data.cohortDashboard] : []);
    replaceRuntimeArray(CENTER_STATUSES, []); replaceRuntimeArray(CENTER_RANKING, []); replaceRuntimeArray(CENTER_COMPETENCIES, comps);
    replaceRuntimeArray(STUDENT_COMPETENCIES, comps); replaceRuntimeArray(TRAINER_COMPETENCIES, comps); replaceRuntimeArray(SECRETARIAT_PRIORITIES, []);
    replaceRuntimeArray(SUCCESS_ANALYTICS_RECORDS, this.successFromCertification(candidates, cohort, selection));

    replaceRuntimeArray(ACCESS_ACCOUNTS, (data.users ?? []).map((x:any)=>({ id:x.id, email:x.email, firstName:x.firstName ?? x.displayName?.split(" ")[0] ?? "", lastName:x.lastName ?? x.displayName?.split(" ").slice(1).join(" ") ?? "", roles:x.roles ?? [], assignments:[] })));
    replaceRuntimeArray(DRIVING_TRAINERS, SESSION_TRAINERS);
    replaceRuntimeArray(DRIVING_HISTORY, []); replaceRuntimeArray(DRIVING_OBSERVATIONS, []); replaceRuntimeArray(DRIVING_CRITERIA, []);
    replaceRuntimeArray(ATTENDANCE_STUDENTS, learners.map((x:any)=>({ id:x.enrollmentId, firstName:x.firstName,lastName:x.lastName,status:"pending",arrival:"",departure:"",duration:0,missedHours:0,catchupHours:0,absences:0,addToCatchup:false,comment:"" })));
  }

  private sessionType(value:string):string { const v=(value??"").toLowerCase(); return v === "classroom" ? "theory" : v; }
  private hhmm(d:Date):string { return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
  private successFromCertification(candidates:any[], cohort:any, selection:any):any[]{
    if(!cohort) return [];
    const graduated=candidates.filter(x=>String(x.decision??x.result).toLowerCase().includes("obtain")).length;
    const failed=candidates.filter(x=>String(x.decision??x.result).toLowerCase().includes("fail")||String(x.decision??x.result).toLowerCase().includes("not")).length;
    return [{ id:cohort.key ?? cohort.id, organizationId:selection.organizationId, siteId:selection.siteId, programId:selection.programId, cohortId:cohort.key ?? cohort.id,
      promotionName:cohort.name, presented:candidates.length, graduated, partial:0, failed, absent:0, rate:candidates.length?Math.round(graduated*100/candidates.length):0, candidates }];
  }
}
