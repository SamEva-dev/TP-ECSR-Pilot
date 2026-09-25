import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { StudentProfileApiService } from "../../core/students/student-profile-api.service";
import {
  PARIS_ZONE,
  parisInstant,
} from "../../core/training-delivery/paris-time";
import {
  TrainingDeliveryApiService,
  type TrainingSessionApi,
  type TrainingSessionType,
  type TrainingSessionModality,
  type CreateTrainingSessionApiRequest,
} from "../../core/training-delivery/training-delivery-api.service";

@Component({
  selector: "app-sessions",
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: "./sessions.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsComponent {
  readonly session = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  private readonly profiles = inject(StudentProfileApiService);
  private readonly api = inject(TrainingDeliveryApiService);
  private readonly router = inject(Router);
  readonly sessions = signal<TrainingSessionApi[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly saveError = signal(false);
  readonly actionErrorId = signal("");
  readonly saving = signal(false);
  readonly changingId = signal("");
  readonly canManage = computed(() =>
    ["direction", "formateur", "secretariat"].includes(this.session.role()),
  );
  readonly types: TrainingSessionType[] = [
    "classroom",
    "presentation",
    "evaluation",
    "sensitization",
    "catchup",
    "event",
    "distance",
    "driving",
    "internship",
  ];
  readonly modalities: TrainingSessionModality[] = [
    "onsite",
    "remote-live",
    "remote-async",
    "practical",
  ];
  readonly selectedType = signal<TrainingSessionType>("classroom");
  readonly selectedModality = signal<TrainingSessionModality>("onsite");
  date = "";
  start = "";
  end = "";
  trainer = "";
  theme = "";
  objectives = "";
  supports = "";
  comments = "";
  private generation = 0;

  constructor() {
    effect((onCleanup) => {
      const user = this.session.session();
      const cohort = this.workspace.cohort();
      const loaded = this.workspace.remoteWorkspaceLoaded();
      const generation = ++this.generation;
      this.sessions.set([]);
      this.loading.set(false);
      this.loadError.set(false);
      this.saveError.set(false);
      this.actionErrorId.set("");
      this.changingId.set("");
      if (user && loaded) {
        this.loading.set(true);
        if (user.role === "stagiaire") void this.loadSelf(generation);
        else if (cohort?.apiId) void this.load(cohort.apiId, generation);
        else this.loading.set(false);
      }
      onCleanup(() => {
        this.generation++;
      });
    });
  }
  private async loadSelf(generation: number): Promise<void> {
    try {
      const profile = await firstValueFrom(this.profiles.self());
      if (generation === this.generation)
        await this.load(profile.cohortId, generation);
    } catch {
      if (generation === this.generation) {
        this.loadError.set(true);
        this.loading.set(false);
      }
    }
  }
  private async load(cohortId: string, generation: number): Promise<void> {
    try {
      const sessions = await this.api.list(cohortId);
      if (generation === this.generation)
        this.sessions.set(
          sessions.sort((a, b) => b.startsAtUtc.localeCompare(a.startsAtUtc)),
        );
    } catch {
      if (generation === this.generation) this.loadError.set(true);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  dateLabel(item: TrainingSessionApi): string {
    const date = new Date(item.startsAtUtc);
    if (Number.isNaN(date.getTime())) return "—";
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: item.timeZoneId,
        dateStyle: "medium",
      }).format(date);
    } catch {
      return "—";
    }
  }
  timeLabel(item: TrainingSessionApi): string {
    try {
      const format = new Intl.DateTimeFormat(undefined, {
        timeZone: item.timeZoneId,
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${format.format(new Date(item.startsAtUtc))} – ${format.format(new Date(item.endsAtUtc))}`;
    } catch {
      return "—";
    }
  }
  attendancePercent(item: TrainingSessionApi): number {
    return item.expectedLearners > 0
      ? Math.min(
          100,
          Math.round((item.presentLearners / item.expectedLearners) * 100),
        )
      : 0;
  }
  canManageSession(item: TrainingSessionApi): boolean {
    return (
      this.canManage() &&
      (this.session.role() !== "formateur" ||
        !item.trainerAuthGateUserId ||
        item.trainerAuthGateUserId === this.session.session()?.userId)
    );
  }
  async createSession(openAttendance = false): Promise<void> {
    if (!this.canManage() || this.saving()) return;
    const cohortId = this.workspace.cohort()?.apiId;
    const startsAtUtc = parisInstant(this.date, this.start);
    const endsAtUtc = parisInstant(this.date, this.end);
    if (
      !cohortId ||
      !startsAtUtc ||
      !endsAtUtc ||
      endsAtUtc <= startsAtUtc ||
      !this.theme.trim()
    ) {
      this.saveError.set(true);
      return;
    }
    const generation = this.generation;
    const current = this.session.session();
    const isTrainer = this.session.role() === "formateur";
    const trainerDisplayName = isTrainer
      ? [current?.firstName, current?.lastName].filter(Boolean).join(" ") ||
        current?.email ||
        null
      : this.trainer.trim() || null;
    const payload: CreateTrainingSessionApiRequest = {
      cohortId,
      type: this.selectedType(),
      modality: this.selectedModality(),
      title: this.theme.trim(),
      startsAtUtc,
      endsAtUtc,
      timeZoneId: PARIS_ZONE,
      trainerAuthGateUserId: isTrainer ? (current?.userId ?? null) : null,
      trainerDisplayName,
      objective: this.objectives.trim() || null,
      supports: this.supports.trim() || null,
      comments: this.comments.trim() || null,
      audienceMode: "whole-cohort",
      participantEnrollmentIds: [],
    };
    this.saving.set(true);
    this.saveError.set(false);
    try {
      const created = await this.api.create(payload);
      if (generation !== this.generation) return;
      this.sessions.update((items) => [created, ...items]);
      this.theme = "";
      this.objectives = "";
      this.supports = "";
      this.comments = "";
      this.date = "";
      this.start = "";
      this.end = "";
      if (openAttendance)
        await this.router.navigate(["/presences"], {
          queryParams: { sessionId: created.id },
        });
    } catch {
      if (generation === this.generation) this.saveError.set(true);
    } finally {
      this.saving.set(false);
    }
  }
  async setStatus(
    item: TrainingSessionApi,
    action: "cancel" | "complete",
  ): Promise<void> {
    if (
      !this.canManageSession(item) ||
      this.changingId() ||
      item.status === "cancelled" ||
      item.status === "completed"
    )
      return;
    const generation = this.generation;
    this.changingId.set(item.id);
    this.actionErrorId.set("");
    try {
      const updated =
        action === "cancel"
          ? await this.api.cancel(item.id)
          : await this.api.complete(item.id);
      if (generation === this.generation)
        this.sessions.update((rows) =>
          rows.map((x) => (x.id === item.id ? updated : x)),
        );
    } catch {
      if (generation === this.generation) this.actionErrorId.set(item.id);
    } finally {
      if (this.changingId() === item.id) this.changingId.set("");
    }
  }
}
