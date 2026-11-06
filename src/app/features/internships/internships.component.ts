import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { WorkplaceApiStoreService } from "../../core/api-data/workplace-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  type InternshipDocument,
  type InternshipPeriod,
  type InternshipStatus,
} from "../../core/models/internships.models";
import { SessionService } from "../../core/session/session.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import {
  CreateInternshipDrawerComponent,
  type CreateInternshipPeriodPayload,
} from "./create-internship-drawer/create-internship-drawer.component";

@Component({
  selector: "app-internships",
  imports: [
    TranslatePipe,
    DatePipe,
    ProgressBarComponent,
    CreateInternshipDrawerComponent,
  ],
  templateUrl: "./internships.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternshipsComponent {
  readonly sessionService = inject(SessionService);
  readonly store = inject(WorkplaceApiStoreService);
  readonly drawerOpen = signal(false);
  readonly reassigningId = signal<string | null>(null);
  readonly lifecycleId = signal<string | null>(null);
  readonly lifecycleAction = signal<"cancel" | "archive" | "delete" | null>(null);
  readonly lifecycleReason = signal("");
  readonly lifecycleSaving = signal(false);
  openLifecycle(period: InternshipPeriod, action: "cancel" | "archive" | "delete"): void {
    if (!this.canCreate()) return;
    this.lifecycleId.set(period.id);
    this.lifecycleAction.set(action);
    this.lifecycleReason.set("");
  }
  closeLifecycle(): void {
    this.lifecycleId.set(null);
    this.lifecycleAction.set(null);
    this.lifecycleReason.set("");
  }
  async confirmLifecycle(): Promise<void> {
    const id = this.lifecycleId();
    const action = this.lifecycleAction();
    const reason = this.lifecycleReason().trim();
    if (!id || !action || this.lifecycleSaving() || (action !== "archive" && !reason)) return;
    this.lifecycleSaving.set(true);
    try {
      if (await this.store.changeLifecycle(id, action, action === "archive" ? null : reason)) this.closeLifecycle();
    } finally {
      this.lifecycleSaving.set(false);
    }
  }
  readonly tutorNameInput = signal("");
  readonly tutorEmailInput = signal("");
  readonly tutorPhoneInput = signal("");
  readonly savingReassignment = signal(false);
  readonly reassignmentSaved = signal(false);

  readonly periods = computed<InternshipPeriod[]>(() => this.store.periods().filter(p => p.status !== "deleted"));

  readonly totals = computed(() => {
    const periods = this.periods();
    const planned = periods.reduce(
      (total, period) => total + this.number(period.plannedHours),
      0,
    );
    const completed = periods.reduce(
      (total, period) => total + this.number(period.completedHours),
      0,
    );
    return {
      planned,
      completed,
      remaining: Math.max(0, planned - completed),
      incomplete: periods.filter((period) => period.status === "incomplete")
        .length,
    };
  });

  readonly canCreate = computed(() =>
    ["direction", "secretariat"].includes(this.sessionService.role()),
  );

  titleKey(): string {
    if (this.sessionService.role() === "stagiaire")
      return "internships.studentTitle";
    if (this.sessionService.role() === "formateur")
      return "internships.trainerTitle";
    return "internships.title";
  }

  subtitleKey(): string {
    if (this.sessionService.role() === "stagiaire")
      return "internships.studentSubtitle";
    if (this.sessionService.role() === "formateur")
      return "internships.trainerSubtitle";
    return "internships.subtitle";
  }

  openDrawer(): void {
    if (!this.canCreate()) return;
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  async addPeriod(payload: CreateInternshipPeriodPayload): Promise<void> {
    const created = await this.store.create(payload);
    if (created) this.closeDrawer();
  }

  openReassignment(period: InternshipPeriod): void {
    if (!this.canCreate()) return;
    this.reassigningId.set(period.id);
    this.tutorNameInput.set("");
    this.tutorEmailInput.set("");
    this.tutorPhoneInput.set("");
    this.reassignmentSaved.set(false);
  }

  cancelReassignment(): void {
    this.reassigningId.set(null);
  }

  async confirmReassignment(period: InternshipPeriod): Promise<void> {
    if (!this.canCreate() || this.savingReassignment() ||
      this.reassigningId() !== period.id ||
      !this.tutorNameInput().trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.tutorEmailInput().trim())) return;
    this.savingReassignment.set(true);
    try {
      const saved = await this.store.reassignTutor(period.id, this.tutorNameInput(), this.tutorEmailInput(), this.tutorPhoneInput());
      if (saved) {
        this.reassignmentSaved.set(true);
        this.reassigningId.set(null);
      }
    } finally {
      this.savingReassignment.set(false);
    }
  }

  progress(period: InternshipPeriod): number {
    if (!this.number(period.plannedHours)) return 0;
    return Math.round(
      (this.number(period.completedHours) / this.number(period.plannedHours)) *
        100,
    );
  }

  remaining(period: InternshipPeriod): number {
    return Math.max(
      0,
      this.number(period.plannedHours) - this.number(period.completedHours),
    );
  }

  statusClass(status: InternshipStatus): string {
    switch (status) {
      case "archived":
      case "deleted":
      case "completed":
        return "bg-[#d8f8df] text-[#18a547]";
      case "incomplete":
      case "cancelled":
        return "bg-[#ffe1df] text-[#f22b2b]";
      case "inProgress":
        return "bg-[#fff0c9] text-[#8b5e00]";
      default:
        return "bg-[#e5f2ff] text-[#2a64a2]";
    }
  }

  documentClass(document: InternshipDocument): string {
    if (document.status === "validated") return "bg-[#d8f8df] text-[#18a547]";
    if (document.status === "missing") return "bg-[#ffe1df] text-[#f22b2b]";
    return "bg-[#e5f2ff] text-[#245c97]";
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
}
