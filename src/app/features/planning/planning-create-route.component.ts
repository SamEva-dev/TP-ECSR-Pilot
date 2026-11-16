import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { AccessPolicyService } from "../../core/access/access-policy.service";
import { TrainingSessionApiStoreService } from "../../core/api-data/training-session-api-store.service";
import {
  AddPlanningDrawerComponent,
  type AddPlanningPayload,
} from "./add-planning-drawer/add-planning-drawer.component";

@Component({
  selector: "app-planning-create-route",
  imports: [AddPlanningDrawerComponent],
  template: `<app-add-planning-drawer
    [open]="true"
    (closed)="close()"
    (eventCreated)="create($event)"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningCreateRouteComponent {
  private readonly router = inject(Router);
  private readonly access = inject(AccessPolicyService);
  private readonly sessions = inject(TrainingSessionApiStoreService);

  close(): void {
    void this.router.navigateByUrl("/planning");
  }

  async create(payload: AddPlanningPayload): Promise<void> {
    if (!this.access.can("sessions.manage")) {
      void this.router.navigateByUrl("/planning");
      return;
    }
    const created = await this.sessions.create(
      {
        cohortId: payload.promotionId ?? "",
        date: payload.date ?? "",
        startTime: payload.startTime ?? "",
        endTime: payload.endTime ?? "",
        type: payload.type,
        modality:
          payload.type === "driving"
            ? "practical"
            : payload.type === "distance"
              ? "remote-live"
              : "onsite",
        title: payload.title ?? "",
        trainerAuthGateUserId: payload.trainerAuthGateUserId,
        trainerDisplayName: payload.responsible ?? "",
        location: payload.location ?? "",
        objective: payload.competence ?? "",
        supports: "",
        comments: "",
      },
      "/planning",
    );
    if (!created) return;
    void this.router.navigateByUrl("/planning");
  }
}
