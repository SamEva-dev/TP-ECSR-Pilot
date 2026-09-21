import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { PROMOTIONS } from "../../core/mock-data/dashboard.mock";
import {
  DRIVING_PROGRAMMED,
  PLANNING_DAYS,
  PLANNING_EVENTS,
  type PlanningEvent,
  type PlanningType,
} from "../../core/mock-data/planning.mock";

@Component({
  selector: "app-planning",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./planning.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningComponent {
  readonly promotions = PROMOTIONS;
  readonly days = PLANNING_DAYS;
  readonly promotionId = signal("all");
  readonly type = signal<"all" | PlanningType>("all");
  readonly view = signal<"day" | "week" | "month">("week");

  readonly typeLegend: PlanningType[] = [
    "classroom",
    "driving",
    "evaluation",
    "internship",
    "presentation",
    "catchup",
  ];

  readonly filteredEvents = computed(() => {
    const promotionId = this.promotionId();
    const type = this.type();
    return PLANNING_EVENTS.filter((event) => {
      const promotionMatch =
        promotionId === "all" || event.promotionId === promotionId;
      const typeMatch = type === "all" || event.type === type;
      return promotionMatch && typeMatch;
    });
  });

  readonly classroomProgrammed = computed(() =>
    this.filteredEvents().filter(
      (event) =>
        event.type !== "driving" &&
        event.type !== "internship" &&
        event.type !== "event",
    ),
  );

  readonly drivingProgrammed = computed(() => {
    const promotionId = this.promotionId();
    return DRIVING_PROGRAMMED.filter(
      (event) => promotionId === "all" || event.promotionId === promotionId,
    );
  });

  updatePromotion(event: Event) {
    this.promotionId.set((event.target as HTMLSelectElement).value);
  }

  updateType(event: Event) {
    this.type.set(
      (event.target as HTMLSelectElement).value as "all" | PlanningType,
    );
  }

  setView(view: "day" | "week" | "month") {
    this.view.set(view);
  }

  eventsForDay(day: PlanningEvent["day"]) {
    return this.filteredEvents().filter((event) => event.day === day);
  }

  typeKey(type: PlanningType) {
    return `planning.types.${type}`;
  }

  badgeClasses(type: PlanningType) {
    switch (type) {
      case "classroom":
        return "bg-[#2b66a4] text-white";
      case "driving":
        return "bg-[#e6f2ff] text-[#205a98]";
      case "evaluation":
        return "bg-[#fff0c9] text-[#7a5300]";
      case "internship":
      case "sensitization":
        return "bg-[#d8f8df] text-[#18a547]";
      case "presentation":
        return "bg-[#f0f2f5] text-[#6b7280]";
      case "catchup":
        return "bg-[#ffe1df] text-[#f04438]";
      case "event":
        return "bg-[#e5f2ff] text-[#2b66a4]";
    }
  }
}
