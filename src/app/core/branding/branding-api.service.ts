import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../environments/environment";

export interface BrandLayer {
  id: string; type: "image" | "text"; assetId: string | null;
  text: string; x: number; y: number; width: number; height: number;
  zIndex: number; opacity: number; color: string; fontSize: number;
  groupId: string | null;
}
export interface BrandConfiguration {
  name: string; tagline: string; primaryColor: string; secondaryColor: string;
  logoAssetId: string | null; backgroundAssetId: string | null;
  overlayOpacity: number; formPosition: "left" | "right";
  textPosition: "front" | "back"; backgroundPosition: string; layers?: BrandLayer[];
}
export interface BrandRevision { id: string; organizationId: string; configuration: BrandConfiguration; createdAtUtc: string; }
export interface BrandState { organizationId: string; draftRevisionId: string | null; publishedRevisionId: string | null; draft: BrandRevision | null; published: BrandRevision | null; }
export interface BrandAsset { id: string; contentType: string; sizeBytes: number; }
@Injectable({providedIn: "root"})
export class BrandingApiService {
 private readonly http = inject(HttpClient);
 private base(id:string) { return `${environment.apiBaseUrl}/api/v1/organizations/${encodeURIComponent(id)}/branding`; }
 get(id:string) { return this.http.get<BrandState>(this.base(id)); }
 save(id:string, config:BrandConfiguration) { return this.http.put<BrandState>(`${this.base(id)}/draft`,{configuration:config}); }
 publish(id:string,revision:string) { return this.http.post<BrandState>(`${this.base(id)}/publish/${encodeURIComponent(revision)}`,{}); }
 resetToDefault(id:string) { return this.http.post<BrandState>(`${this.base(id)}/reset-to-default`,{}); }
 restore(id:string,revision:string) { return this.http.post<BrandState>(`${this.base(id)}/restore/${encodeURIComponent(revision)}`,{}); }
 upload(id:string,file:File) { const body=new FormData(); body.append('file',file,file.name); return this.http.post<BrandAsset>(`${this.base(id)}/assets`,body); }
 preview(id:string,assetId:string) { return this.http.get(`${this.base(id)}/assets/${encodeURIComponent(assetId)}/preview`,{responseType:'blob'}); }
}
