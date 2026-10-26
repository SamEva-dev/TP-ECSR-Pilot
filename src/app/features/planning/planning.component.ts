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
import type {
  PlanningEvent,
  PlanningType,
} from "../../core/models/planning.models";
import type { WorkMode } from "../../core/models/remote-work.models";
import { SessionService } from "../../core/session/session.service";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";

const PLANNING_DAYS: Array<{ id: PlanningEvent["day"]; labelKey: string }> = [
  { id: "monday", labelKey: "planning.days.monday" },
  { id: "tuesday", labelKey: "planning.days.tuesday" },
  { id: "wednesday", labelKey: "planning.days.wednesday" },
  { id: "thursday", labelKey: "planning.days.thursday" },
  { id: "friday", labelKey: "planning.days.friday" },
  { id: "saturday", labelKey: "planning.days.saturday" },
  { id: "sunday", labelKey: "planning.days.sunday" },
];

@Component({
  selector: "app-planning",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./planning.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningComponent {
  readonly contextData = inject(ContextualTrainingDataService);
  private readonly workspace = inject(WorkspaceContextService);
  readonly sessions = inject(TrainingSessionApiStoreService);
  readonly session = inject(SessionService);
  readonly teamWorkModes = computed(() =>
    TEAM_WORK_MODE_WEEK.filter(
      (item) => (item.siteId ?? "") === (this.contextData.site()?.id ?? ""),
    ),
  );
  readonly canSeeWorkModes = computed(() =>
    ["direction", "formateur", "secretariat"].includes(this.session.role()),
  );
  readonly days = PLANNING_DAYS;
  readonly promotionId = signal("all");
  readonly type = signal<"all" | PlanningType>("all");
  readonly view = signal<"day" | "week" | "month">("week");
  readonly selectedDate = signal(this.localToday());
  readonly currentLabel = computed(() => {
    const date = this.parseIsoDate(this.selectedDate());
    if (this.view() === "day") return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
    if (this.view() === "month") return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
    const monday = this.weekStart(date);
    const thursday = new Date(monday);
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    const year = thursday.getUTCFullYear();
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const firstMonday = this.weekStart(jan4);
    const number = Math.round((monday.getTime() - firstMonday.getTime()) / 604800000) + 1;
    return `${number} / ${year}`;
  });
  readonly visibleDays = computed(() => {
    const date = this.parseIsoDate(this.selectedDate());
    if (this.view() === "day") return [{ id: this.dayKey(date), labelKey: "", display: this.dateLabel(date), iso: this.isoDate(date) }];
    const start = this.view() === "month" ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)) : this.weekStart(date);
    const count = this.view() === "month" ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate() : 7;
    return Array.from({ length: count }, (_, i) => {
      const item = new Date(start);
      item.setUTCDate(item.getUTCDate() + i);
      return { id: this.dayKey(item), labelKey: "", display: this.dateLabel(item), iso: this.isoDate(item) };
    });
  });
  readonly promotions = computed(() => {
    const level = this.workspace.activeLevel();
    const sites = level === "organization" ? this.workspace.sites() :
      this.workspace.site() ? [this.workspace.site()!] : [];
    const programId = level === "program" || level === "cohort" ? this.workspace.program()?.id : null;
    const cohortId = level === "cohort" ? this.workspace.cohort()?.id : null;
    const seen = new Set<string>();
    return sites.flatMap(site => this.workspace.siteCohorts(site.id))
      .filter(cohort => (!programId || cohort.programId === programId) && (!cohortId || cohort.id === cohortId))
      .filter(cohort => {
        if (!cohort.id || seen.has(cohort.id)) return false;
        seen.add(cohort.id);
        return true;
      })
      .map(cohort => ({ id: cohort.id ?? "", name: cohort.name ?? "" }));
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
    const eligible = new Set(this.promotions().map((cohort) => cohort.id));
    return this.sessions.planningEvents().filter((event) => {
      if (!eligible.has(event.promotionId ?? "")) return false;
      const promotionMatch =
        promotionId === "all" || !eligible.has(promotionId) || (event.promotionId ?? "") === promotionId;
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

  readonly drivingProgrammed = computed(() =>
    this.sessions.drivingProgrammed(),
  );

  updatePromotion(event: Event): void {
    this.promotionId.set((event.target as HTMLSelectElement).value ?? "all");
  }

  updateType(event: Event): void {
    this.type.set(
      ((event.target as HTMLSelectElement).value || "all") as
        "all" | PlanningType,
    );
  }

  setView(view: "day" | "week" | "month"): void { this.view.set(view); }

  movePeriod(direction: -1 | 1): void {
    const date = this.parseIsoDate(this.selectedDate());
    if (this.view() === "month") {
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() + direction);
    } else {
      date.setUTCDate(date.getUTCDate() + direction * (this.view() === "week" ? 7 : 1));
    }
    this.selectedDate.set(this.isoDate(date));
  }

  private localToday(): string {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${values["year"]}-${values["month"]}-${values["day"]}`;
  }
  private parseIsoDate(value: string): Date { return new Date(`${value}T12:00:00Z`); }
  private isoDate(date: Date): string { return date.toISOString().slice(0, 10); }
  private dateLabel(date: Date): string {
    return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(date);
  }
  private weekStart(value: Date): Date {
    const date = new Date(value);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    return date;
  }
  private dayKey(date: Date): PlanningEvent["day"] {
    return (["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const)[date.getUTCDay()];
  }

  eventsForDay(day: PlanningEvent["day"]): PlanningEvent[] {
    return this.filteredEvents().filter(event => event.day === day);
  }

  eventsForDate(iso: string): PlanningEvent[] {
    const [year, month, day] = iso.split("-");
    const displayDate = `${day}/${month}/${year}`;
    return this.filteredEvents().filter(event => event.date === displayDate);
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
      case "classroom":
        return "bg-[#2b66a4] text-white";
      case "distance":
        return "bg-[#efe9ff] text-[#6f4ec7]";
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
