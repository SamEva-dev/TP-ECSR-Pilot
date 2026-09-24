import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { PLANNING_DAYS } from "../../core/api-data/runtime-data.store";
import type { PlanningEvent, PlanningType } from "../../core/models/planning.models";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";
import { SessionService } from "../../core/session/session.service";
import { TEAM_WORK_MODE_WEEK } from "../../core/api-data/runtime-data.store";
import type { WorkMode } from "../../core/models/remote-work.models";
import { TrainingDeliveryApiService, type TrainingSessionApi } from "../../core/training-delivery/training-delivery-api.service";

@Component({
  selector: "app-planning",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./planning.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningComponent {
  readonly contextData = inject(ContextualTrainingDataService);
  readonly trainingApi = inject(TrainingDeliveryApiService);
  readonly remoteEvents = signal<PlanningEvent[] | null>(null);
  readonly session = inject(SessionService);
  readonly teamWorkModes = computed(() =>
    TEAM_WORK_MODE_WEEK.filter((item) => item.siteId === this.contextData.site()?.id),
  );
  readonly canSeeWorkModes = computed(() => ["direction", "formateur", "secretariat"].includes(this.session.role()));
  readonly days = PLANNING_DAYS;
  readonly promotionId = signal("all");
  readonly type = signal<"all" | PlanningType>("all");
  readonly view = signal<"day" | "week" | "month">("week");
  readonly promotions = computed(() => {
    const cohort = this.contextData.cohort();
    return cohort ? [{ id: cohort.id, name: cohort.name }] : [];
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
    const source = this.remoteEvents() ?? this.contextData.planningEvents();
    return source.filter((event) => {
      const promotionMatch = promotionId === "all" || event.promotionId === promotionId;
      const typeMatch = type === "all" || event.type === type;
      return promotionMatch && typeMatch;
    });
  });

  readonly classroomProgrammed = computed(() =>
    this.filteredEvents().filter(
      (event) => event.type !== "driving" && event.type !== "internship" && event.type !== "event",
    ),
  );

  readonly drivingProgrammed = computed(() => {
    const remote = this.remoteEvents();
    return remote ? remote.filter((event) => event.type === "driving") : this.contextData.drivingProgrammed();
  });


  constructor() {
    effect(() => {
      const cohort = this.contextData.cohort();
      if (cohort?.apiId) void this.loadRemotePlanning(cohort.apiId);
      else this.remoteEvents.set(null);
    });
  }

  private async loadRemotePlanning(cohortApiId: string) {
    try {
      const sessions = await this.trainingApi.list(cohortApiId);
      const mapped = sessions.map((item) => this.toPlanningEvent(item)).filter((item): item is PlanningEvent => item !== null);
      this.remoteEvents.set(mapped);
    } catch {
      this.remoteEvents.set(null);
    }
  }

  private toPlanningEvent(item: TrainingSessionApi): PlanningEvent | null {
    const localDate = new Date(item.startsAtUtc);
    const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: item.timeZoneId }).format(localDate).toLowerCase();
    if (!["monday", "tuesday", "wednesday", "thursday", "friday"].includes(dayName)) return null;
    const formatDate = new Intl.DateTimeFormat("fr-FR", { timeZone: item.timeZoneId, day: "2-digit", month: "2-digit", year: "numeric" });
    const formatTime = new Intl.DateTimeFormat("fr-FR", { timeZone: item.timeZoneId, hour: "2-digit", minute: "2-digit", hour12: false });
    const start = new Date(item.startsAtUtc);
    const end = new Date(item.endsAtUtc);
    return {
      id: item.id,
      day: dayName as PlanningEvent["day"],
      promotionId: this.contextData.cohort()?.id ?? item.cohortId,
      type: item.type,
      titleKey: item.title,
      time: `${formatTime.format(start)} – ${formatTime.format(end)}`,
      meta: [item.trainerDisplayName, item.location].filter(Boolean).join(" · "),
      date: formatDate.format(start),
    };
  }

  updatePromotion(event: Event) {
    this.promotionId.set((event.target as HTMLSelectElement).value);
  }

  updateType(event: Event) {
    this.type.set((event.target as HTMLSelectElement).value as "all" | PlanningType);
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

  workModeClass(mode: WorkMode): string {
    if (mode === "remote") return "bg-[#e6f2ff] text-[#2a64a2]";
    if (mode === "field") return "bg-[#fff0d6] text-[#b56700]";
    if (mode === "travel") return "bg-[#efe9ff] text-[#6f4ec7]";
    if (mode === "leave") return "bg-[#d8f8df] text-[#168c40]";
    if (mode === "absence") return "bg-[#ffe1df] text-[#d93434]";
    return "bg-[#f0f3f7] text-[#4f5d70]";
  }

  badgeClasses(type: PlanningType) {
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
