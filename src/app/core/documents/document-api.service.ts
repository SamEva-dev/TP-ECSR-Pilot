import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import type { DocumentDto } from "./document.models";

@Injectable({ providedIn: "root" })
export class DocumentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/documents`;

  list(cohortId?: string): Promise<DocumentDto[]> {
    let params = new HttpParams();
    if (cohortId) params = params.set("cohortId", cohortId);
    return firstValueFrom(this.http.get<DocumentDto[]>(this.base, { params }));
  }

  async download(document: DocumentDto): Promise<void> {
    const response = await firstValueFrom(
      this.http.get(`${this.base}/${encodeURIComponent(document.id)}/content`, {
        observe: "response",
        responseType: "blob",
      }),
    );

    const body = response.body;
    if (!body) throw new Error("DOCUMENT_CONTENT_EMPTY");
    const version = document.versions[0];
    const url = URL.createObjectURL(body);
    try {
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = version?.fileName ?? "";
      anchor.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async downloadById(id: string, fileName = ""): Promise<void> {
    const response = await firstValueFrom(
      this.http.get(`${this.base}/${encodeURIComponent(id)}/content`, {
        observe: "response",
        responseType: "blob",
      }),
    );
    const body = response.body;
    if (!body) throw new Error("DOCUMENT_CONTENT_EMPTY");
    const url = URL.createObjectURL(body);
    try {
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = fileName ?? "";
      anchor.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  upload(form: FormData): Promise<DocumentDto> {
    return firstValueFrom(this.http.post<DocumentDto>(this.base, form));
  }

  replace(id: string, form: FormData): Promise<DocumentDto> {
    return firstValueFrom(
      this.http.post<DocumentDto>(`${this.base}/${encodeURIComponent(id)}/versions`, form),
    );
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`));
  }
}
