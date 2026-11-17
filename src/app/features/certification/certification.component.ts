import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
  signal,
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import { AccessPolicyService } from "../../core/access/access-policy.service";
import { CertificationApiService } from "../../core/certification/certification-api.service";
import { CertificationApiStoreService } from "../../core/api-data/certification-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type {
  CertificationCandidate,
  CertificationUnitStatus,
} from "../../core/models/certification.models";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";

@Component({
  selector: "app-certification",
  imports: [RouterLink, FormsModule, TranslatePipe, ProgressBarComponent],
  templateUrl: "./certification.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificationComponent {
  private readonly api = inject(CertificationApiService);
  private readonly access = inject(AccessPolicyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly canManage = computed(() => this.access.can("certification.manage"));
  readonly createBusy = signal(false);
  readonly createError = signal("");
  sessionTitle = "";
  startsAt = "";
  endsAt = "";
  venue = "";
  readonly sessionService = inject(SessionService);
  readonly store = inject(CertificationApiStoreService);
  readonly workspace = inject(WorkspaceContextService);

  readonly role = computed(() => this.sessionService.role());
  readonly scheme = this.store.scheme;
  readonly juryAssignments = this.store.sessionJuryAssignments;
  readonly sessions = this.store.jurySessions;
  readonly juryLoading = this.store.sessionJuryLoading;
  readonly juryError = this.store.sessionJuryError;
  readonly program = this.workspace.program;
  readonly readyCount = computed(
    () => this.store.candidates().filter((item) => item.ready).length,
  );
  readonly completionRate = computed(() => {
    const candidates = this.store.candidates();
    return Math.round(
      (this.readyCount() / Math.max(candidates.length, 1)) * 100,
    );
  });
  // Route query parameters are reactive. Reading snapshot only once allowed a
  // previous sessionId to overwrite a later selection after unrelated updates.
  private readonly routeParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly requestedSessionId = computed(() =>
    this.routeParams().get("sessionId") ?? "",
  );

  readonly activeSessionId = this.store.selectedJurySessionId;
  readonly consistentSession = computed(() => {
    const selected = this.activeSessionId();
    const model = this.store.examSession();
    return selected !== "" && selected === model.id && this.store.hasSession(selected);
  });

  constructor() {
    // Track only URL and raw available IDs, not the mapped session list (which
    // changes when the jury or candidate response arrives).
    effect(() => {
      const desired = this.requestedSessionId();
      const ids = this.store.availableSessionIds();
      if (desired && ids.includes(desired)) {
        // Don't track the selected value as a dependency: a pending router
        // navigation must not cause this effect to restore the prior URL.
        untracked(() => void this.store.selectSession(desired));
      }
    });
  }
  readonly currentCandidate = computed(() => {
    const candidates = this.store.candidates();
    const selfEnrollmentId = this.store.selfEnrollmentId();
    // A student's dossier must never fall back to an unrelated candidate.
    // The API enforces self-access, but the view also requires a proven match.
    if (this.role() === "stagiaire") {
      if (!selfEnrollmentId) return null;
      return (
        candidates.find((item) =>
          this.store.rawCandidate(item.id)?.enrollmentId === selfEnrollmentId,
        ) ?? null
      );
    }
    return candidates[0] ?? null;
  });

  async createExamSession(): Promise<void> {
    if (!this.canManage() || this.createBusy()) return;
    const cohortId = this.workspace.cohort()?.apiId;
    const schemeId = this.scheme().id;
    const title = this.sessionTitle.trim();
    const start = Date.parse(this.startsAt);
    const end = Date.parse(this.endsAt);
    if (!cohortId || !schemeId || !title || !Number.isFinite(start) ||
        !Number.isFinite(end) || end <= start) {
      this.createError.set("validation");
      return;
    }
    this.createBusy.set(true);
    this.createError.set("");
    try {
      const session = await firstValueFrom(this.api.createSession({
        cohortId, schemeId, title,
        startsAtUtc: new Date(start).toISOString(),
        endsAtUtc: new Date(end).toISOString(),
        venue: this.venue.trim() || null,
      }));
      if (this.workspace.cohort()?.apiId !== cohortId) return;
      if (!session?.id || session.cohortId !== cohortId) throw new Error("INVALID_SESSION_RESPONSE");
      await this.store.reload(false);
      await this.store.selectSession(session.id);
      await this.router.navigate(['/certification/sessions', session.id]);
    } catch (error: unknown) {
      this.createError.set(String((error as {error?: {code?:string}})?.error?.code || "request"));
    } finally {
      this.createBusy.set(false);
    }
  }

  async chooseExamSession(sessionId: string): Promise<void> {
    if (!sessionId || !this.store.hasSession(sessionId)) return;
    // The URL is the selection intent; its reactive observer hydrates the
    // store for this ID. Never wait for candidate loading before navigation.
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sessionId },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  get examSession() {
    return this.store.examSession();
  }
  // A synthetic empty session model must never be displayed as persisted data.
  readonly hasExamSession = computed(() => this.consistentSession());


  get candidates() {
    return this.store.candidates();
  }

  isManagement(): boolean {
    return this.role() === "direction" || this.role() === "secretariat";
  }

  isTrainer(): boolean {
    return this.role() === "formateur";
  }

  isStudent(): boolean {
    return this.role() === "stagiaire";
  }

  initials(item: { firstName: string; lastName: string }): string {
    return `${item.firstName?.[0] ?? ""}${item.lastName?.[0] ?? ""}`.toUpperCase();
  }

  readinessClasses(ready: boolean): string {
    return ready
      ? "bg-[#d8f8df] text-[#18a547]"
      : "bg-[#fff0c9] text-[#8b5e00]";
  }

  unitStatus(
    candidate: CertificationCandidate,
    unitId: string,
  ): CertificationUnitStatus {
    return (
      candidate.unitStatuses?.find((item) => item.unitId === unitId)?.status ??
      "pending"
    );
  }

  unitClasses(status: CertificationUnitStatus): string {
    return status === "validated"
      ? "bg-[#d8f8df] text-[#18a547]"
      : status === "pending"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f22b2b]";
  }
}
