import { Injectable, signal } from "@angular/core";

export type ApplicationNotificationLevel = "info" | "warning" | "danger";

export interface ApplicationNotificationItem {
  id: string;
  titleKey: string;
  detailKey: string;
  level: ApplicationNotificationLevel;
  icon: string;
  path: string;
}

@Injectable({ providedIn: "root" })
export class ApplicationNotificationService {
  private readonly itemsSignal = signal<ApplicationNotificationItem[]>([]);
  private readonly lastIdSignal = signal("");
  private sequence = 0;

  readonly items = this.itemsSignal.asReadonly();
  readonly lastId = this.lastIdSignal.asReadonly();

  error(detailKey: string, path: string): void {
    const id = `api-error-${++this.sequence}`;
    const item: ApplicationNotificationItem = {
      id,
      titleKey: "attention.title",
      detailKey,
      level: "danger",
      icon: "ph-warning-circle",
      path,
    };

    this.itemsSignal.update((items) => [item, ...items].slice(0, 12));
    this.lastIdSignal.set(id);
  }
}
