import { Injectable, inject, signal } from "@angular/core";
import {
  ProgramCatalogApiService,
  type ProgramApiDto,
} from "../catalog/program-catalog-api.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";
import type {
  ProgramCatalogItem,
  ProgramFormValue,
} from "../models/programs.models";
@Injectable({ providedIn: "root" })
export class ProgramApiStoreService {
  private readonly api = inject(ProgramCatalogApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly programsSignal = signal<ProgramCatalogItem[]>([]);
  readonly programs = this.programsSignal.asReadonly();
  readonly remoteLoaded = signal(false);
  constructor() {
    void this.reload();
  }
  async reload(): Promise<void> {
    const rows = await this.api.list();
    this.programsSignal.set(rows.map((x) => this.map(x)));
    this.remoteLoaded.set(true);
  }
  create(value: ProgramFormValue): void {
    void this.api
      .create({
        familyCode: this.familyFor(value.category),
        code: value.code,
        name: value.name,
        descriptionKey: value.description,
        icon: this.iconFor(value.category),
        durationHours: value.durationHours,
        status: value.status,
        enabledModules: value.enabledModules,
        externalKey: `program-${value.code.toLowerCase()}`,
      })
      .then(() => this.reload());
  }
  update(id: string, value: ProgramFormValue): void {
    const current = this.programsSignal().find((x) => x.id === id);
    if (!current?.apiId) return;
    void this.api
      .update(current.apiId, {
        familyCode: this.familyFor(value.category),
        name: value.name,
        descriptionKey: value.description,
        icon: this.iconFor(value.category),
        durationHours: value.durationHours,
        status: value.status,
        enabledModules: value.enabledModules,
      })
      .then(() => this.reload());
  }
  toggleSite(programId: string, siteId: string): void {
    const p = this.programsSignal().find((x) => x.id === programId);
    const siteApiId = this.workspace
      .sites()
      .find((x) => x.id === siteId)?.apiId;
    if (!p?.apiId || !siteApiId) return;
    const enabled = p.siteIds.includes(siteId);
    void this.api
      .setOffering(p.apiId, siteApiId, !enabled)
      .then(() => this.reload());
  }
  private map(x: ProgramApiDto): ProgramCatalogItem {
    return {
      id: x.key,
      apiId: x.id,
      code: x.code,
      name: x.name,
      category: x.category as any,
      icon: x.icon,
      description: x.descriptionKey,
      referenceVersion: x.referenceVersion ?? "—",
      durationHours: x.durationHours,
      enabledModules: x.enabledModules as any,
      siteIds: x.siteKeys,
      status: x.status,
      students: 0,
      trainers: 0,
      activeCohorts: 0,
      successRate: null,
    };
  }
  private familyFor(category: string): string {
    if (category === "motorcycle") return "MOTORCYCLE";
    if (category === "heavy-vehicle") return "HEAVY_VEHICLE";
    if (category === "passenger-transport") return "PASSENGER_TRANSPORT";
    if (category === "ambulance") return "EMERGENCY_MEDICAL";
    if (category === "first-aid") return "FIRST_AID";
    return "ROAD_EDUCATION";
  }
  private iconFor(category: string): string {
    if (category === "motorcycle") return "ph-motorcycle";
    if (category === "heavy-vehicle") return "ph-truck";
    if (category === "passenger-transport") return "ph-bus";
    if (category === "ambulance") return "ph-ambulance";
    if (category === "first-aid") return "ph-first-aid-kit";
    return "ph-steering-wheel";
  }
}
