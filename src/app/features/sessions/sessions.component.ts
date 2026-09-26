import { ChangeDetectionStrategy, Component, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { TrainingSessionApiStoreService } from "../../core/api-data/training-session-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type {
  PedagogicalSessionType,
  ProgrammedSession,
  SessionModality,
} from "../../core/models/sessions.models";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";

@Component({
  selector: "app-sessions",
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: "./sessions.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsComponent {
  readonly contextData = inject(ContextualTrainingDataService);
  readonly store = inject(TrainingSessionApiStoreService);
  readonly types: PedagogicalSessionType[] = [
    "classroom",
    "presentation",
    "evaluation",
    "sensitization",
    "catchup",
    "event",
  ];
  readonly sessions = this.store.sessions;
  readonly modalities: SessionModality[] = ["onsite", "remote-live", "remote-async", "practical"];

  date = this.today();
  start = "08:00";
  end = "12:00";
  trainer = "";
  promotionId = "";
  selectedType = signal<PedagogicalSessionType>("classroom");
  selectedModality = signal<SessionModality>("onsite");
  theme = "";
  objectives = "";
  supports = "";
  comments = "";

  get trainers(): string[] {
    return this.store.trainers();
  }

  get promotions(): Array<{ id: string; name: string }> {
    const cohort = this.contextData.cohort();
    return cohort ? [{ id: cohort.id ?? "", name: cohort.name ?? "" }] : [];
  }

  constructor() {
    effect(() => {
      this.promotionId = this.contextData.cohort()?.id ?? "";
      const trainers = this.store.trainers();
      if (!this.trainer || !trainers.includes(this.trainer)) this.trainer = trainers[0] ?? "";
    });
  }

  typeKey(type: PedagogicalSessionType): string {
    return `sessions.types.${type}`;
  }

  typeBadgeClasses(type: PedagogicalSessionType): string {
    switch (type) {
      case "classroom": return "bg-[#2b66a4] text-white";
      case "distance": return "bg-[#efe9ff] text-[#6f4ec7]";
      case "driving": return "bg-[#e6f2ff] text-[#205a98]";
      case "internship": return "bg-[#d8f8df] text-[#18a547]";
      case "presentation": return "bg-[#f0f2f5] text-[#6b7280]";
      case "evaluation": return "bg-[#fff0c9] text-[#7a5300]";
      case "sensitization": return "bg-[#d8f8df] text-[#18a547]";
      case "catchup": return "bg-[#ffe1df] text-[#f04438]";
      case "event": return "bg-[#e5f2ff] text-[#2b66a4]";
    }
  }

  modalityKey(modality: SessionModality): string {
    return `sessions.modalities.${modality}`;
  }

  modalityBadgeClasses(modality: SessionModality): string {
    switch (modality) {
      case "remote-live": return "bg-[#efe9ff] text-[#6f4ec7]";
      case "remote-async": return "bg-[#fff0d6] text-[#a26100]";
      case "practical": return "bg-[#e6f2ff] text-[#205a98]";
      case "onsite": return "bg-[#f0f3f7] text-[#667085]";
    }
  }

  modalityChipClasses(modality: SessionModality): string {
    return this.selectedModality() === modality
      ? "border-[#6f4ec7] bg-[#f3efff] text-[#6548b8] ring-1 ring-[#6f4ec7]/15"
      : "border-[#dce3eb] bg-white text-[#475569] hover:bg-[#f7f9fc]";
  }

  typeChipClasses(type: PedagogicalSessionType): string {
    return this.selectedType() === type
      ? "border-[#2b66a4] bg-[#eaf3fc] text-[#245c97] ring-1 ring-[#2b66a4]/15"
      : "border-[#dce3eb] bg-white text-[#475569] hover:bg-[#f7f9fc]";
  }

  attendancePercent(session: ProgrammedSession): number {
    return session.expected === 0 ? 0 : Math.round((session.present / session.expected) * 100);
  }

  attendanceClasses(session: ProgrammedSession): string {
    return session.present === session.expected
      ? "bg-[#d8f8df] text-[#18a547]"
      : "bg-[#fff0c9] text-[#8b5e00]";
  }

  async createSession(): Promise<void> {
    if (!this.theme.trim() || !this.promotionId) return;
    const created = await this.store.create({
      cohortId: this.promotionId,
      date: this.date ?? "",
      startTime: this.start ?? "",
      endTime: this.end ?? "",
      trainerDisplayName: this.trainer ?? "",
      type: this.selectedType(),
      modality: this.selectedModality(),
      title: this.theme.trim(),
      location: "",
      objective: this.objectives.trim(),
      supports: this.supports.trim(),
      comments: this.comments.trim(),
    });
    if (!created) return;
    this.theme = "";
    this.objectives = "";
    this.supports = "";
    this.comments = "";
  }

  sessionTitle(session: ProgrammedSession): string | null {
    return session.titleKey.startsWith("sessions.") || session.titleKey.startsWith("workspaceOperational.")
      ? session.titleKey
      : null;
  }

  sessionObjective(session: ProgrammedSession): string | null {
    return session.objectiveKey.startsWith("sessions.") || session.objectiveKey.startsWith("workspaceOperational.")
      ? session.objectiveKey
      : null;
  }

  sessionSupports(session: ProgrammedSession): string | null {
    return session.supportsKey.startsWith("sessions.") || session.supportsKey.startsWith("workspaceOperational.")
      ? session.supportsKey
      : null;
  }

  private today(): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values["year"] ?? ""}-${values["month"] ?? ""}-${values["day"] ?? ""}`;
  }
}
