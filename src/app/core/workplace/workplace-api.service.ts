import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { CohortLearnerDto, CreateWorkplacePeriodPayload, WorkplacePeriodDto } from './workplace.models';
import { environment } from "../../environments/environment";
@Injectable({providedIn:'root'})
export class WorkplaceApiService {
  private readonly http=inject(HttpClient); private readonly base=`${environment.apiBaseUrl}/api/v1`;
  getPeriods(cohortId:string){return firstValueFrom(this.http.get<WorkplacePeriodDto[]>(`${this.base}/workplace/periods`,{params:new HttpParams().set('cohortId',cohortId)}));}
  getLearners(cohortId:string){return firstValueFrom(this.http.get<CohortLearnerDto[]>(`${this.base}/cohorts/${cohortId}/learners`));}
  createPeriod(payload:CreateWorkplacePeriodPayload){return firstValueFrom(this.http.post<WorkplacePeriodDto>(`${this.base}/workplace/periods`,payload));}
}
