import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslateService } from "../../core/i18n/translate.service";
import { SessionService } from "../../core/session/session.service";
import { StudentProfileApiService } from "../../core/students/student-profile-api.service";
import {
  PARIS_ZONE,
  parisInstant,
} from "../../core/training-delivery/paris-time";
import {
  TrainingDeliveryApiService,
  type CreateTrainingSessionApiRequest,
  type TrainingSessionApi,
  type TrainingSessionType,
} from "../../core/training-delivery/training-delivery-api.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import {
  AddPlanningDrawerComponent,
  type AddPlanningPayload,
} from "./add-planning-drawer/add-planning-drawer.component";

type CalendarView = "day" | "week" | "month";
function shiftDate(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function startOfWeek(key: string): string {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return shiftDate(key, -(day + 6) % 7);
}
function parisToday(): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: PARIS_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return `${parts["year"]}-${parts["month"]}-${parts["day"]}`;
}
function sessionDay(session: TrainingSessionApi): string {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: session.timeZoneId,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date(session.startsAtUtc))
        .map((part) => [part.type, part.value]),
    );
    return `${parts["year"]}-${parts["month"]}-${parts["day"]}`;
  } catch {
    return "";
  }
}

@Component({
  selector: "app-planning",
  imports: [RouterLink, TranslatePipe, AddPlanningDrawerComponent],
  templateUrl: "./planning.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningComponent {
  readonly workspace = inject(WorkspaceContextService);
  readonly session = inject(SessionService);
  readonly translate = inject(TranslateService);
  private readonly profiles = inject(StudentProfileApiService);
  private readonly api = inject(TrainingDeliveryApiService);
  private readonly drawer = viewChild(AddPlanningDrawerComponent);
  readonly items = signal<TrainingSessionApi[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly saveError = signal(false);
  readonly saving = signal(false);
  readonly drawerOpen = signal(false);
  readonly view = signal<CalendarView>("week");
  readonly selectedDate = signal(parisToday());
  readonly type = signal<"all" | TrainingSessionType>("all");
  readonly canManage = computed(
    () =>
      !!this.session.session() &&
      ["direction", "formateur", "secretariat"].includes(this.session.role()),
  );
  readonly types: TrainingSessionType[] = [
    "classroom",
    "distance",
    "driving",
    "evaluation",
    "internship",
    "presentation",
    "catchup",
    "sensitization",
    "event",
  ];
  readonly views: CalendarView[] = ["day", "week", "month"];
  readonly days = computed(() => {
    const selected = this.selectedDate();
    if (this.view() === "day") return [selected];
    if (this.view() === "week")
      return Array.from({ length: 7 }, (_, i) =>
        shiftDate(startOfWeek(selected), i),
      );
    const first = `${selected.slice(0, 7)}-01`;
    const start = startOfWeek(first);
    const nextMonth = new Date(`${first}T12:00:00Z`);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const totalDays = Math.round(
      (nextMonth.getTime() - new Date(`${start}T12:00:00Z`).getTime()) /
        86400000,
    );
    const rows = Math.ceil(totalDays / 7) * 7;
    return Array.from({ length: rows }, (_, i) => shiftDate(start, i));
  });
  readonly periodLabel = computed(() => {
    const days = this.days();
    const fmt = new Intl.DateTimeFormat(this.translate.locale(), {
      timeZone: "UTC",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return days.length === 1
      ? fmt.format(new Date(`${days[0]}T12:00:00Z`))
      : `${fmt.format(new Date(`${days[0]}T12:00:00Z`))} – ${fmt.format(new Date(`${days[days.length - 1]}T12:00:00Z`))}`;
  });
  readonly filtered = computed(() =>
    this.items().filter(
      (item) => this.type() === "all" || item.type === this.type(),
    ),
  );
  readonly grouped = computed(() => {
    const groups = new Map<string, TrainingSessionApi[]>();
    for (const item of this.filtered()) {
      const key = sessionDay(item);
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }
    return groups;
  });
  readonly scheduledClassroom = computed(() =>
    this.filtered().filter(
      (item) =>
        item.status !== "cancelled" &&
        item.type !== "driving" &&
        item.type !== "internship",
    ),
  );
  readonly scheduledDriving = computed(() =>
    this.filtered().filter(
      (item) => item.status !== "cancelled" && item.type === "driving",
    ),
  );
  private generation = 0;

  constructor() {
    effect((onCleanup) => {
      const user = this.session.session();
      const loaded = this.workspace.remoteWorkspaceLoaded();
      const cohort = this.workspace.cohort();
      const days = this.days();
      const generation = ++this.generation;
      this.items.set([]);
      this.loadError.set(false);
      this.loading.set(false);
      this.drawerOpen.set(false);
      this.saveError.set(false);
      this.saving.set(false);
      if (user && loaded) {
        this.loading.set(true);
        if (user.role === "stagiaire") void this.loadStudent(days, generation);
        else if (cohort?.apiId) void this.load(cohort.apiId, days, generation);
        else this.loading.set(false);
      }
      onCleanup(() => {
        this.generation++;
      });
    });
  }
  private async loadStudent(days: string[], generation: number): Promise<void> {
    try {
      const profile = await firstValueFrom(this.profiles.self());
      if (generation === this.generation)
        await this.load(profile.cohortId, days, generation);
    } catch {
      if (generation === this.generation) {
        this.loadError.set(true);
        this.loading.set(false);
      }
    }
  }
  private async load(
    cohortId: string,
    days: string[],
    generation: number,
  ): Promise<void> {
    // UTC bounds cover all Paris wall-clock instants, including DST transition days.
    const from = new Date(
      Date.parse(`${days[0]}T00:00:00Z`) - 3 * 3600000,
    ).toISOString();
    const to = new Date(
      Date.parse(`${shiftDate(days[days.length - 1], 1)}T00:00:00Z`) +
        3 * 3600000,
    ).toISOString();
    try {
      const rows = await this.api.list(cohortId, from, to);
      if (generation === this.generation)
        this.items.set(
          rows
            .filter(
              (row) =>
                row.cohortId === cohortId && days.includes(sessionDay(row)),
            )
            .sort((a, b) => a.startsAtUtc.localeCompare(b.startsAtUtc)),
        );
    } catch {
      if (generation === this.generation) this.loadError.set(true);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  eventsForDay(key: string): TrainingSessionApi[] {
    return this.grouped().get(key) ?? [];
  }
  dayFor(item: TrainingSessionApi): string {
    return sessionDay(item);
  }
  today(): string {
    return parisToday();
  }
  dateLabel(key: string): string {
    return new Intl.DateTimeFormat(this.translate.locale(), {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(`${key}T12:00:00Z`));
  }
  timeLabel(item: TrainingSessionApi): string {
    try {
      const fmt = new Intl.DateTimeFormat(this.translate.locale(), {
        timeZone: item.timeZoneId,
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${fmt.format(new Date(item.startsAtUtc))} – ${fmt.format(new Date(item.endsAtUtc))}`;
    } catch {
      return "—";
    }
  }
  setView(view: CalendarView): void {
    this.view.set(view);
  }
  navigate(direction: number): void {
    const key = this.selectedDate();
    if (this.view() === "month") {
      const date = new Date(`${key.slice(0, 7)}-01T12:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() + direction);
      this.selectedDate.set(date.toISOString().slice(0, 10));
    } else
      this.selectedDate.set(
        shiftDate(key, direction * (this.view() === "week" ? 7 : 1)),
      );
  }
  updateType(event: Event): void {
    this.type.set(
      (event.target as HTMLSelectElement).value as "all" | TrainingSessionType,
    );
  }
  typeKey(type: TrainingSessionType): string {
    return `planning.types.${type}`;
  }
  badgeClasses(type: TrainingSessionType): string {
    if (type === "driving" || type === "event")
      return "bg-[#e6f2ff] text-[#205a98]";
    if (type === "evaluation") return "bg-[#fff0c9] text-[#7a5300]";
    if (type === "catchup") return "bg-[#ffe1df] text-[#a13229]";
    return "bg-[#e5f2ee] text-[#216b4b]";
  }
  async create(payload: AddPlanningPayload): Promise<void> {
    if (!this.canManage() || this.saving()) return;
    const cohortId = this.workspace.cohort()?.apiId;
    const startsAtUtc = parisInstant(payload.date, payload.startTime);
    const endsAtUtc = parisInstant(payload.date, payload.endTime);
    if (
      !cohortId ||
      !startsAtUtc ||
      !endsAtUtc ||
      endsAtUtc <= startsAtUtc ||
      !payload.title.trim()
    ) {
      this.saveError.set(true);
      return;
    }
    const generation = this.generation;
    const user = this.session.session();
    const isTrainer = user?.role === "formateur";
    const trainerDisplayName = isTrainer
      ? [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        user?.email ||
        null
      : payload.responsible.trim() || null;
    const request: CreateTrainingSessionApiRequest = {
      cohortId,
      type: payload.type,
      modality: payload.modality,
      title: payload.title.trim(),
      startsAtUtc,
      endsAtUtc,
      timeZoneId: PARIS_ZONE,
      trainerAuthGateUserId: isTrainer ? (user?.userId ?? null) : null,
      trainerDisplayName,
      location: payload.location.trim() || null,
      objective: payload.objective.trim() || null,
      audienceMode: "whole-cohort",
      participantEnrollmentIds: [],
    };
    this.saving.set(true);
    this.saveError.set(false);
    try {
      const created = await this.api.create(request);
      if (generation !== this.generation) return;
      if (this.days().includes(sessionDay(created)))
        this.items.update((items) =>
          [...items, created].sort((a, b) =>
            a.startsAtUtc.localeCompare(b.startsAtUtc),
          ),
        );
      else this.selectedDate.set(payload.date);
      this.drawer()?.reset();
      this.drawerOpen.set(false);
    } catch {
      if (generation === this.generation) this.saveError.set(true);
    } finally {
      if (generation === this.generation) this.saving.set(false);
    }
  }
}
