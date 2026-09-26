import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { TEAM_WORK_MODE_WEEK } from "../../core/api-data/runtime-data.store";
import { TrainingSessionApiStoreService } from "../../core/api-data/training-session-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type { PlanningEvent, PlanningType } from "../../core/models/planning.models";
import type { WorkMode } from "../../core/models/remote-work.models";
import { SessionService } from "../../core/session/session.service";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";

const PLANNING_DAYS: Array<{ id: PlanningEvent["day"]; labelKey: string }> = [
  { id: "monday", labelKey: "planning.days.monday" },
  { id: "tuesday", labelKey: "planning.days.tuesday" },
  { id: "wednesday", labelKey: "planning.days.wednesday" },
  { id: "thursday", labelKey: "planning.days.thursday" },
  { id: "friday", labelKey: "planning.days.friday" },
];

@Component({
  selector: "app-planning",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./planning.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningComponent {
  readonly contextData = inject(ContextualTrainingDataService);
  readonly sessions = inject(TrainingSessionApiStoreService);
  readonly session = inject(SessionService);
  readonly teamWorkModes = computed(() =>
    TEAM_WORK_MODE_WEEK.filter((item) => (item.siteId ?? "") === (this.contextData.site()?.id ?? "")),
  );
  readonly canSeeWorkModes = computed(() => ["direction", "formateur", "secretariat"].includes(this.session.role()));
  readonly days = PLANNING_DAYS;
  readonly promotionId = signal("all");
  readonly type = signal<"all" | PlanningType>("all");
  readonly view = signal<"day" | "week" | "month">("week");
  readonly promotions = computed(() => {
    const cohort = this.contextData.cohort();
    return cohort ? [{ id: cohort.id ?? "", name: cohort.name ?? "" }] : [];
  });

  readonly typeLegend: PlanningType[] = [
    "classroom",
    "distance",
    "driving",
    "evaluation",
    "internship",
    "presentation",
    "catchup",
  ];

  readonly filteredEvents = computed(() => {
    const promotionId = this.promotionId();
    const type = this.type();
    return this.sessions.planningEvents().filter((event) => {
      const promotionMatch = promotionId === "all" || (event.promotionId ?? "") === promotionId;
      const typeMatch = type === "all" || event.type === type;
      return promotionMatch && typeMatch;
    });
  });

  readonly classroomProgrammed = computed(() =>
    this.filteredEvents().filter(
      (event) => event.type !== "driving" && event.type !== "internship" && event.type !== "event",
    ),
  );

  readonly drivingProgrammed = computed(() => this.sessions.drivingProgrammed());

  updatePromotion(event: Event): void {
    this.promotionId.set((event.target as HTMLSelectElement).value ?? "all");
  }

  updateType(event: Event): void {
    this.type.set(((event.target as HTMLSelectElement).value || "all") as "all" | PlanningType);
  }

  setView(view: "day" | "week" | "month"): void {
    this.view.set(view);
  }

  eventsForDay(day: PlanningEvent["day"]): PlanningEvent[] {
    return this.filteredEvents().filter((event) => event.day === day);
  }

  typeKey(type: PlanningType): string {
    return `planning.types.${type}`;
  }

  workModeClass(mode: WorkMode): string {
    if (mode === "remote") return "bg-[#e6f2ff] text-[#2a64a2]";
    if (mode === "field") return "bg-[#fff0d6] text-[#b56700]";
    if (mode === "travel") return "bg-[#efe9ff] text-[#6f4ec7]";
    if (mode === "leave") return "bg-[#d8f8df] text-[#168c40]";
    if (mode === "absence") return "bg-[#ffe1df] text-[#d93434]";
    return "bg-[#f0f3f7] text-[#4f5d70]";
  }

  badgeClasses(type: PlanningType): string {
    switch (type) {
      case "classroom": return "bg-[#2b66a4] text-white";
      case "distance": return "bg-[#efe9ff] text-[#6f4ec7]";
      case "driving": return "bg-[#e6f2ff] text-[#205a98]";
      case "evaluation": return "bg-[#fff0c9] text-[#7a5300]";
      case "internship":
      case "sensitization": return "bg-[#d8f8df] text-[#18a547]";
      case "presentation": return "bg-[#f0f2f5] text-[#6b7280]";
      case "catchup": return "bg-[#ffe1df] text-[#f04438]";
      case "event": return "bg-[#e5f2ff] text-[#2b66a4]";
    }
  }
}
