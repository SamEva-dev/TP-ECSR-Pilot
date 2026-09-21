import { Injectable, signal } from "@angular/core";
import { PROGRAM_CATALOG, type ProgramCatalogItem, type ProgramFormValue } from "./programs.mock";

@Injectable({ providedIn: "root" })
export class ProgramMockStoreService {
  private readonly programsSignal = signal<ProgramCatalogItem[]>(structuredClone(PROGRAM_CATALOG));
  readonly programs = this.programsSignal.asReadonly();

  create(value: ProgramFormValue): ProgramCatalogItem {
    const id = `program-demo-${Date.now()}`;
    const item: ProgramCatalogItem = {
      id,
      ...value,
      icon: this.iconFor(value.category),
      siteIds: [],
      students: 0,
      trainers: 0,
      activeCohorts: 0,
      successRate: null,
    };
    this.programsSignal.update((items) => [...items, item]);
    return item;
  }

  update(id: string, value: ProgramFormValue): void {
    this.programsSignal.update((items) => items.map((item) => item.id === id ? { ...item, ...value, icon: this.iconFor(value.category) } : item));
  }

  toggleSite(programId: string, siteId: string): void {
    this.programsSignal.update((items) => items.map((item) => {
      if (item.id !== programId) return item;
      const enabled = item.siteIds.includes(siteId);
      return { ...item, siteIds: enabled ? item.siteIds.filter((id) => id !== siteId) : [...item.siteIds, siteId] };
    }));
  }

  private iconFor(category: ProgramFormValue["category"]): string {
    if (category === "motorcycle") return "ph-motorcycle";
    if (category === "heavy-vehicle") return "ph-truck";
    if (category === "passenger-transport") return "ph-bus";
    return "ph-steering-wheel";
  }
}
