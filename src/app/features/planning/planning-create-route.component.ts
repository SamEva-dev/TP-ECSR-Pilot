import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { TrainingSessionApiStoreService } from "../../core/api-data/training-session-api-store.service";
import { AddPlanningDrawerComponent, type AddPlanningPayload } from "./add-planning-drawer/add-planning-drawer.component";

@Component({
  selector: "app-planning-create-route",
  imports: [AddPlanningDrawerComponent],
  template: `<app-add-planning-drawer [open]="true" (closed)="close()" (eventCreated)="create($event)" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningCreateRouteComponent {
  private readonly router = inject(Router);
  private readonly sessions = inject(TrainingSessionApiStoreService);

  close(): void {
    void this.router.navigateByUrl("/planning");
  }

  async create(payload: AddPlanningPayload): Promise<void> {
    const created = await this.sessions.create({
      cohortId: payload.promotionId ?? "",
      date: payload.date ?? "",
      startTime: payload.startTime ?? "",
      endTime: payload.endTime ?? "",
      type: payload.type,
      modality: payload.type === "driving" ? "practical" : payload.type === "distance" ? "remote-live" : "onsite",
      title: payload.title ?? "",
      trainerDisplayName: payload.responsible ?? "",
      location: payload.location ?? "",
      objective: payload.competence ?? "",
      supports: "",
      comments: "",
    }, "/planning");
    if (!created) return;
    void this.router.navigateByUrl("/planning");
  }
}
