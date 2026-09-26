import { Injectable, signal } from "@angular/core";
import {
  TRAINING_REFERENTIALS,
  type ReferentialVersionFormValue,
  type TrainingReferential,
} from "./referentials.mock";

@Injectable({ providedIn: "root" })
export class ReferentialMockStoreService {
  private readonly itemsSignal = signal<TrainingReferential[]>(structuredClone(TRAINING_REFERENTIALS));
  readonly items = this.itemsSignal.asReadonly();

  createVersion(value: ReferentialVersionFormValue): TrainingReferential | null {
    const source = this.itemsSignal().find((item) => item.id === value.sourceReferentialId)
      ?? this.itemsSignal().find((item) => item.programId === value.programId);
    if (!source) return null;

    const item: TrainingReferential = {
      ...structuredClone(source),
      id: `ref-demo-${Date.now()}`,
      programId: value.programId,
      version: value.version,
      code: value.code,
      effectiveFrom: value.effectiveFrom,
      effectiveTo: null,
      status: value.status,
      notes: "referentials.demo.createdNotes",
    };
    this.itemsSignal.update((items) => [...items, item]);
    return item;
  }
}
