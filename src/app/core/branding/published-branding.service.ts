import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import type { BrandConfiguration, BrandRevision } from "./branding-api.service";

/** Public branding is intentionally independent of the authenticated admin endpoints. */
@Injectable({ providedIn: "root" })
export class PublishedBrandingService {
  private readonly http = inject(HttpClient);
  private readonly current = signal<BrandConfiguration | null>(null);
  readonly configuration = this.current.asReadonly();
  readonly organizationId = signal("");
  private requestNumber = 0;
  private static readonly guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async load(organizationId: string | null | undefined): Promise<void> {
    const id = PublishedBrandingService.guidPattern.test(organizationId ?? "") ? organizationId! : "";
    const request = ++this.requestNumber;
    this.organizationId.set(id);
    this.current.set(null); // Never retain another organization's theme while switching.
    if (!id) return;
    try {
      const revision = await firstValueFrom(this.http.get<BrandRevision>(
        `${environment.apiBaseUrl}/api/v1/public/branding/${encodeURIComponent(id)}`,
      ));
      if (request === this.requestNumber && revision?.organizationId?.toLowerCase() === id.toLowerCase()) {
        this.current.set(this.normalize(revision.configuration));
      }
    } catch {
      // No published identity or transient error: retain the native Pedagora theme.
      if (request === this.requestNumber) this.current.set(null);
    }
  }

  assetUrl(assetId: string | null | undefined): string | null {
    const org = this.organizationId();
    if (!org || !assetId || !PublishedBrandingService.guidPattern.test(assetId)) return null;
    return `${environment.apiBaseUrl}/api/v1/organizations/${encodeURIComponent(org)}/branding/assets/${encodeURIComponent(assetId)}/content`;
  }

  private normalize(input: BrandConfiguration | undefined): BrandConfiguration | null {
    if (!input || typeof input !== "object") return null;
    const validColor = (value: unknown, fallback: string) =>
      typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
    const cleanId = (value: unknown) => typeof value === "string" && PublishedBrandingService.guidPattern.test(value) ? value : null;
    return {
      name: typeof input.name === "string" ? input.name.slice(0, 120) : "",
      tagline: typeof input.tagline === "string" ? input.tagline.slice(0, 240) : "",
      primaryColor: validColor(input.primaryColor, "#17477f"),
      secondaryColor: validColor(input.secondaryColor, "#f8a11a"),
      logoAssetId: cleanId(input.logoAssetId),
      backgroundAssetId: cleanId(input.backgroundAssetId),
      overlayOpacity: Math.max(0, Math.min(100, Number(input.overlayOpacity) || 0)),
      formPosition: input.formPosition === "left" ? "left" : "right",
      textPosition: input.textPosition === "back" ? "back" : "front",
      backgroundPosition: typeof input.backgroundPosition === "string" && /^(center|top|bottom|left|right)( (center|top|bottom|left|right))?$/.test(input.backgroundPosition) ? input.backgroundPosition : "center",
      layers: Array.isArray(input.layers) ? input.layers.filter(l => l && (l.type === "text" || (l.type === "image" && cleanId(l.assetId))) &&
        typeof l.id === "string" && /^[0-9a-f-]{36}$/i.test(l.id) &&
        [l.x,l.y,l.width,l.height,l.zIndex,l.opacity,l.fontSize].every(v => typeof v === "number" && Number.isFinite(v)) &&
        l.x >= 0 && l.y >= 0 && l.width > 0 && l.height > 0 && l.x + l.width <= 100 && l.y + l.height <= 100
      ).slice(0,60).map(l => ({...l, text: typeof l.text === "string" ? l.text.slice(0,300) : "",color:validColor(l.color,"#ffffff"),assetId:cleanId(l.assetId)})) : [],
    };
  }
}
