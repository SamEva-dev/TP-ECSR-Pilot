import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { DeaStructureDocument, DeaStructureResponse } from './dea-structure.models';

/** Auth/tenant headers are supplied by the application's existing HTTP interceptors. */
@Injectable({ providedIn: 'root' })
export class DeaStructureApiService {
  private readonly http = inject(HttpClient);

  private url(versionId: string): string {
    return `${environment.apiBaseUrl}/api/v1/referential-versions/${encodeURIComponent(versionId)}/dea-structure`;
  }

  get(versionId: string): Promise<DeaStructureResponse> {
    return firstValueFrom(this.http.get<DeaStructureResponse>(this.url(versionId)));
  }

  save(versionId: string, document: DeaStructureDocument): Promise<DeaStructureResponse> {
    // The backend expects the document itself, not { content: document }.
    return firstValueFrom(this.http.put<DeaStructureResponse>(this.url(versionId), document));
  }
}
