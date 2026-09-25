import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ReportingApiService } from "../../core/reporting/reporting-api.service";
import type { CohortDashboard } from "../../core/reporting/reporting.models";
import {
  StudentProfileApiService,
  type LearnerProfileApi,
  type TopicProgressApi,
  type CompetencyProgressApi,
} from "../../core/students/student-profile-api.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";

interface TrainerSession {
  id: string;
  title: string;
  startsAtUtc: string;
  endsAtUtc: string;
  trainerAuthGateUserId: string | null;
  location: string | null;
  status: string;
}

@Component({
  selector: "app-home",
  imports: [RouterLink, TranslatePipe, ProgressBarComponent],
  templateUrl: "./home.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly sessionService = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  private readonly reporting = inject(ReportingApiService);
  private readonly http = inject(HttpClient);
  private readonly profileApi = inject(StudentProfileApiService);

  readonly dashboard = signal<CohortDashboard | null>(null);
  readonly dashboardLoading = signal(false);
  readonly dashboardError = signal(false);
  readonly trainerSessions = signal<TrainerSession[]>([]);
  readonly trainerLoading = signal(false);
  readonly trainerError = signal(false);
  readonly selfProfile = signal<LearnerProfileApi | null>(null);
  readonly selfTopics = signal<TopicProgressApi[] | null>(null);
  readonly selfCompetencies = signal<CompetencyProgressApi[] | null>(null);
  readonly selfLoading = signal(false);
  readonly selfError = signal("studentDetail.real.notFound");
  readonly selfPresentedTopics = computed(
    () =>
      this.selfTopics()?.filter((x) =>
        ["presented", "validated"].includes(x.status.toLowerCase()),
      ).length ?? 0,
  );
  readonly selfAssessedCompetencies = computed(
    () =>
      this.selfCompetencies()?.filter(
        (x) => x.level.toLowerCase() !== "not_assessed",
      ).length ?? 0,
  );
  readonly completionPercent = computed(() => {
    const d = this.dashboard();
    return d && d.plannedMinutes > 0
      ? Math.min(100, Math.round((d.deliveredMinutes * 100) / d.plannedMinutes))
      : 0;
  });
  readonly isDirection = computed(() =>
    ["direction", "secretariat"].includes(this.sessionService.role()),
  );
  readonly isTrainer = computed(
    () => this.sessionService.role() === "formateur",
  );
  private generation = 0;

  constructor() {
    effect((onCleanup) => {
      const session = this.sessionService.session();
      const cohort = this.workspace.cohort();
      const workspaceLoaded = this.workspace.remoteWorkspaceLoaded();
      const generation = ++this.generation;
      this.dashboard.set(null);
      this.dashboardError.set(false);
      this.dashboardLoading.set(false);
      this.trainerSessions.set([]);
      this.trainerError.set(false);
      this.trainerLoading.set(false);
      this.selfProfile.set(null);
      this.selfTopics.set(null);
      this.selfCompetencies.set(null);
      this.selfLoading.set(false);
      if (!session) return;
      if (session.role === "stagiaire") {
        this.selfLoading.set(true);
        void this.loadSelf(generation);
      } else if (workspaceLoaded && cohort?.apiId) {
        if (session.role === "formateur") {
          this.trainerLoading.set(true);
          void this.loadTrainerSessions(
            cohort.apiId,
            session.userId ?? "",
            generation,
          );
        } else if (
          session.role === "direction" ||
          session.role === "secretariat"
        ) {
          this.dashboardLoading.set(true);
          void this.loadDashboard(cohort.apiId, generation);
        }
      }
      onCleanup(() => {
        this.generation++;
      });
    });
  }

  private async loadDashboard(
    cohortId: string,
    generation: number,
  ): Promise<void> {
    try {
      const dashboard = await firstValueFrom(
        this.reporting.cohortDashboard(cohortId),
      );
      if (generation === this.generation) this.dashboard.set(dashboard);
    } catch {
      if (generation === this.generation) this.dashboardError.set(true);
    } finally {
      if (generation === this.generation) this.dashboardLoading.set(false);
    }
  }

  private async loadTrainerSessions(
    cohortId: string,
    userId: string,
    generation: number,
  ): Promise<void> {
    try {
      const today = new Date();
      const from = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const to = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1,
      );
      const params = new HttpParams()
        .set("cohortId", cohortId)
        .set("fromUtc", from.toISOString())
        .set("toUtc", to.toISOString());
      const sessions = await firstValueFrom(
        this.http.get<TrainerSession[]>(
          `${environment.apiBaseUrl}/api/v1/training-sessions`,
          { params },
        ),
      );
      if (generation === this.generation) {
        this.trainerSessions.set(
          sessions.filter(
            (x) =>
              x.trainerAuthGateUserId === userId &&
              x.status.toLowerCase() !== "cancelled" &&
              new Date(x.startsAtUtc) >= from &&
              new Date(x.startsAtUtc) < to,
          ),
        );
      }
    } catch {
      if (generation === this.generation) this.trainerError.set(true);
    } finally {
      if (generation === this.generation) this.trainerLoading.set(false);
    }
  }

  private async loadSelf(generation: number): Promise<void> {
    try {
      const profile = await firstValueFrom(this.profileApi.self());
      if (generation !== this.generation) return;
      this.selfProfile.set(profile);
      const [topics, competencies] = await Promise.allSettled([
        firstValueFrom(this.profileApi.topics(profile.enrollmentId)),
        firstValueFrom(this.profileApi.competencies(profile.enrollmentId)),
      ]);
      if (generation !== this.generation) return;
      if (topics.status === "fulfilled") this.selfTopics.set(topics.value);
      if (competencies.status === "fulfilled")
        this.selfCompetencies.set(competencies.value);
    } catch (error) {
      if (generation !== this.generation) return;
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? error.status
          : 0;
      this.selfError.set(
        status === 404
          ? "studentDetail.real.notFound"
          : status === 403
            ? "studentDetail.real.forbidden"
            : "studentDetail.real.failed",
      );
    } finally {
      if (generation === this.generation) this.selfLoading.set(false);
    }
  }

  hours(minutes: number): string {
    return (minutes / 60).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
  }
  time(value: string): string {
    return new Date(value).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
