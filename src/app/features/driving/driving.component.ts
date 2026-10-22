import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type WritableSignal,
} from "@angular/core";
import { DrivingApiStoreService } from "../../core/api-data/driving-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type { DrivingHistoryItem, DrivingLevel } from "../../core/models/driving.models";
import { SessionService } from "../../core/session/session.service";
import { AccessPolicyService } from "../../core/access/access-policy.service";
import { firstValueFrom } from 'rxjs';
import { SignatureApiService, type DailyObservationSignatureCandidate } from '../../core/signatures/signature-api.service';
import { ApplicationNotificationService } from '../../core/notifications/application-notification.service';

const EMPTY_HISTORY: DrivingHistoryItem = {
  id: "",
  studentId: "",
  studentName: "",
  date: "",
  competence: "",
  trainer: "",
  subjectKey: "",
  positiveKey: "",
  difficultyKey: "",
  nextGoalKey: "",
  evaluations: [],
};

@Component({
  selector: "app-driving",
  imports: [TranslatePipe],
  templateUrl: "./driving.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrivingComponent {
  readonly sessionService = inject(SessionService);
  readonly store = inject(DrivingApiStoreService);
  readonly accessPolicy = inject(AccessPolicyService);
  private readonly signatureApi = inject(SignatureApiService);
  private readonly notifications = inject(ApplicationNotificationService);
  readonly dailyCandidates = signal<DailyObservationSignatureCandidate[]>([]);
  readonly selectedForDailySend = signal<ReadonlySet<string>>(new Set());
  readonly dailyDate = signal(new Date().toISOString().slice(0, 10));
  readonly dailyBusy = signal(false);
  // Les observations quotidiennes nécessitent DEUX permissions côté API.
  readonly canLoadDailyObservations = computed(() => {
    const session = this.sessionService.session();
    if (!session || this.isStudent()) return false;
    if (session.authMode !== "authgate") {
      return this.accessPolicy.can("driving.view") && this.accessPolicy.can("signatures.view");
    }
    const permissions = new Set(session.permissions ?? []);
    return (permissions.has("pedagora.signatures.request") || permissions.has("signatures.request"))
      && (permissions.has("pedagora.driving.view") || permissions.has("driving.view"));
  });
  readonly dailyBatchResult = signal<{sent: number; failed: number} | null>(null);
  private dailyGeneration = 0;


  updateDailyDate(event: Event): void {
    this.dailyDate.set((event.target as HTMLInputElement).value);
    void this.loadDailyCandidates();
  }

  async loadDailyCandidates(): Promise<void> {
    const generation = ++this.dailyGeneration;
    this.dailyCandidates.set([]);
    this.selectedForDailySend.set(new Set());
    if (!this.canLoadDailyObservations() || !this.dailyDate()) return;
    try {
      const rows = await firstValueFrom(this.signatureApi.myDailyObservations(this.dailyDate()));
      if (generation === this.dailyGeneration) this.dailyCandidates.set(Array.isArray(rows) ? rows : []);
    } catch {
      if (generation === this.dailyGeneration) this.notifications.error('signatures.errors.load', '/conduite');
    }
  }

  toggleDailyCandidate(sourceId: string, checked: boolean): void {
    if (this.dailyBusy()) return;
    this.selectedForDailySend.update((old) => {
      const next = new Set(old);
      if (checked) next.add(sourceId); else next.delete(sourceId);
      return next;
    });
  }

  async sendDailySelection(): Promise<void> {
    if (this.dailyBusy() || !this.canLoadDailyObservations()) return;
    const selected = this.dailyCandidates().filter((item) => item.signatureStatus === 'not-requested'
      && this.selectedForDailySend().has(item.sourceId));
    if (!selected.length) return;
    this.dailyBusy.set(true);
    this.dailyBatchResult.set(null);
    let sent = 0, failed = 0;
    try {
      for (const candidate of selected) {
        try {
          const draft = await firstValueFrom(this.signatureApi.createDraft({
            sourceType: 'pedagogical-observation',
            sourceId: candidate.sourceId, enrollmentId: candidate.enrollmentId,
          }));
          if (!draft?.id) throw new Error('Invalid envelope');
          await firstValueFrom(this.signatureApi.requestObservation(draft.id));
          sent++;
        } catch { failed++; }
      }
      this.dailyBatchResult.set({sent, failed});
      if (failed) this.notifications.error('signatures.errors.request', '/conduite');
      await this.loadDailyCandidates();
    } finally { this.dailyBusy.set(false); }
  }

  get students() {
    return this.store.students();
  }

  get trainers() {
    return this.store.trainers();
  }

  get competencies() {
    return this.store.competencies();
  }

  get criteria() {
    return this.store.criteria(this.selectedCompetence(), this.selectedSubSkill());
  }

  get vehicles() {
    return [] as { id: string; label: string }[];
  }

  readonly selectedStudentId = signal("");
  readonly selectedTrainerId = signal("");
  readonly selectedVehicleId = signal("");
  readonly selectedCompetence = signal("");
  readonly selectedSubSkill = signal("");
  readonly date = signal("");
  readonly start = signal("");
  readonly end = signal("");
  readonly duration = signal("");
  readonly objective = signal("");
  readonly positive = signal("");
  readonly difficulties = signal("");
  readonly errors = signal("");
  readonly advice = signal("");
  readonly nextGoal = signal("");
  readonly freeObservation = signal("");
  readonly saved = signal(false);

  readonly evaluation = signal<Record<string, DrivingLevel>>({});

  readonly isStudent = computed(() => this.sessionService.role() === "stagiaire");
  readonly isTrainer = computed(() => this.sessionService.role() === "formateur");
  readonly canAssignTrainer = computed(() => this.accessPolicy.can("driving.assignTrainer"));
  readonly canEdit = computed(
    () => this.sessionService.role() === "direction" || this.sessionService.role() === "formateur",
  );

  constructor() {
    effect(() => {
      // Rafraîchir à l'arrivée/changement de la session AuthGate ; invalider les anciennes réponses.
      if (this.canLoadDailyObservations()) void this.loadDailyCandidates();
      else {
        ++this.dailyGeneration;
        this.dailyCandidates.set([]);
        this.selectedForDailySend.set(new Set());
      }
    });
    effect(() => {
      const students = this.store.students();
      const current = this.selectedStudentId();
      const selected = students.some((student) => student.id === current)
        ? current
        : (students[0]?.id ?? "");
      if (selected !== current) this.selectedStudentId.set(selected);
      this.store.selectStudent(selected);
    });

    effect(() => {
      const trainers = this.store.trainers();
      const current = this.selectedTrainerId();
      if (!trainers.some((trainer) => trainer.id === current)) {
        this.selectedTrainerId.set(trainers[0]?.id ?? "");
      }
    });

    effect(() => {
      const competencies = this.store.competencies();
      const current = this.selectedCompetence();
      const preferred = competencies.find((item) => item.id.toUpperCase() === "C3")?.id;
      const selected = competencies.some((item) => item.id === current)
        ? current
        : (preferred ?? competencies[0]?.id ?? "");
      if (selected !== current) this.selectedCompetence.set(selected);
    });

    effect(() => {
      const skills = this.store.subSkills(this.selectedCompetence());
      const current = this.selectedSubSkill();
      if (!skills.some((skill) => skill.id === current)) {
        this.selectedSubSkill.set(skills[0]?.id ?? "");
      }
    });

    effect(() => {
      const allowed = new Set(this.criteria.map((criterion) => criterion.id));
      const current = this.evaluation();
      const normalized = Object.fromEntries(
        Object.entries(current).filter(([key]) => allowed.has(key)),
      ) as Record<string, DrivingLevel>;
      if (Object.keys(normalized).length !== Object.keys(current).length) this.evaluation.set(normalized);
    });

    effect(() => {
      const form = this.store.sessionForm(this.selectedStudentId());
      this.date.set(form.date);
      this.start.set(form.start);
      this.end.set(form.end);
      this.duration.set(form.duration);
      this.saved.set(false);
    });
  }

  readonly selectedStudent = computed(() =>
    this.students.find((student) => student.id === this.selectedStudentId()) ?? { id: "", name: "" },
  );
  readonly selectedTrainer = computed(() =>
    this.trainers.find((trainer) => trainer.id === this.selectedTrainerId()) ?? { id: "", name: "" },
  );
  readonly selectedVehicle = computed(() =>
    this.vehicles.find((vehicle) => vehicle.id === this.selectedVehicleId()) ?? { id: "", label: "" },
  );
  readonly selectedCompetenceInfo = computed(() =>
    this.competencies.find((competence) => competence.id === this.selectedCompetence()) ?? {
      id: "",
      definitionId: "",
      descriptionKey: "",
    },
  );
  readonly subSkills = computed(() => this.store.subSkills(this.selectedCompetence()));
  readonly latestHistory = computed(() => this.store.history()[0] ?? EMPTY_HISTORY);
  readonly visibleHistory = computed(() => this.store.history());

  updateStudent(event: Event) {
    if (this.isStudent()) return;
    const id = (event.target as HTMLSelectElement).value ?? "";
    this.selectedStudentId.set(id);
    this.store.selectStudent(id);
    this.resetEvaluationFields();
  }

  updateTrainer(event: Event) {
    if (!this.canAssignTrainer() || this.isStudent()) return;
    this.selectedTrainerId.set((event.target as HTMLSelectElement).value ?? "");
  }

  updateVehicle(event: Event) {
    this.selectedVehicleId.set((event.target as HTMLSelectElement).value ?? "");
  }

  updateText(target: WritableSignal<string>, event: Event) {
    target.set((event.target as HTMLInputElement | HTMLTextAreaElement).value ?? "");
    this.saved.set(false);
  }

  selectCompetence(id: string) {
    if (!this.canEdit()) return;
    this.selectedCompetence.set(id ?? "");
    this.selectedSubSkill.set(this.store.subSkills(id ?? "")[0]?.id ?? "");
    this.evaluation.set({});
    this.saved.set(false);
  }

  selectSubSkill(id: string) {
    if (!this.canEdit()) return;
    this.selectedSubSkill.set(id ?? "");
    this.evaluation.set({});
    this.saved.set(false);
  }

  setLevel(criterionId: string, level: DrivingLevel) {
    if (!this.canEdit() || !criterionId) return;
    this.evaluation.update((current) => ({ ...current, [criterionId]: level }));
    this.saved.set(false);
  }

  levelClasses(criterionId: string, level: DrivingLevel) {
    const selected = this.evaluation()[criterionId] === level;
    if (!selected) return "bg-white text-[#243044] border-[#e5eaf0]";
    return level === "acquired"
      ? "bg-[#1fad55] text-white border-[#1fad55]"
      : level === "progress"
        ? "bg-[#f6a51e] text-white border-[#f6a51e]"
        : "bg-[#ed1f2b] text-white border-[#ed1f2b]";
  }

  historyLevelClasses(level: DrivingLevel) {
    return level === "acquired"
      ? "bg-[#d8f8df] text-[#18a547]"
      : level === "progress"
        ? "bg-[#fff0c9] text-[#8b5e00]"
        : "bg-[#ffe1df] text-[#f22b2b]";
  }

  labelForCriterion(id: string) {
    return this.criteria.find((criterion) => criterion.id === id)?.labelKey ?? id ?? "";
  }

  async save() {
    if (!this.canEdit()) return;
    const ok = await this.store.record({
      enrollmentId: this.selectedStudentId(),
      competenceCode: this.selectedCompetence(),
      subSkillCode: this.selectedSubSkill(),
      evaluation: this.evaluation(),
      objective: this.objective(),
      positive: this.positive(),
      difficulties: this.difficulties(),
      errors: this.errors(),
      advice: this.advice(),
      nextGoal: this.nextGoal(),
      freeObservation: this.freeObservation(),
      date: this.date(),
      trainerAuthGateUserId: this.selectedTrainer().id,
      trainerDisplayName: this.selectedTrainer().name,
    });
    this.saved.set(ok);
    if (ok) setTimeout(() => this.saved.set(false), 1800);
  }

  scrollToHistory() {
    document.getElementById("driving-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  private resetEvaluationFields(): void {
    this.objective.set("");
    this.positive.set("");
    this.difficulties.set("");
    this.errors.set("");
    this.advice.set("");
    this.nextGoal.set("");
    this.freeObservation.set("");
    this.evaluation.set({});
    this.saved.set(false);
  }
}
