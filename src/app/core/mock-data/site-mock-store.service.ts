import { Injectable, signal } from "@angular/core";
import { SITE_PROFILES, type SiteFormValue, type SiteProfile } from "./sites.mock";

const STORAGE_KEY = "tp-ecsr-pilot.mock-sites.v1";

@Injectable({ providedIn: "root" })
export class SiteMockStoreService {
  private readonly sitesSignal = signal<SiteProfile[]>(this.restore());
  readonly sites = this.sitesSignal.asReadonly();

  create(organizationId: string, value: SiteFormValue): SiteProfile {
    const created: SiteProfile = {
      id: `site-demo-${Date.now()}`,
      organizationId,
      ...value,
      students: 0,
      trainers: 0,
      programs: 0,
      activeCohorts: 0,
      attendanceRate: 0,
      successRate: 0,
      rooms: 0,
      vehicles: 0,
      alerts: 0,
    };
    this.sitesSignal.update((items) => [...items, created]);
    this.persist();
    return created;
  }

  update(id: string, value: SiteFormValue): void {
    this.sitesSignal.update((items) =>
      items.map((item) => (item.id === id ? { ...item, ...value } : item)),
    );
    this.persist();
  }

  byId(id: string): SiteProfile | undefined {
    return this.sitesSignal().find((item) => item.id === id);
  }

  private restore(): SiteProfile[] {
    if (typeof localStorage === "undefined") return [...SITE_PROFILES];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SITE_PROFILES];
    try {
      const parsed = JSON.parse(raw) as SiteProfile[];
      return parsed.length ? parsed : [...SITE_PROFILES];
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return [...SITE_PROFILES];
    }
  }

  private persist(): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sitesSignal()));
  }
}
