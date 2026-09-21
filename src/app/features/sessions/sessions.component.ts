import { ChangeDetectionStrategy, Component, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  SESSION_TRAINERS,
  type PedagogicalSessionType,
  type ProgrammedSession,
  type SessionModality,
} from "../../core/mock-data/sessions.mock";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";

@Component({
  selector: "app-sessions",
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: "./sessions.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsComponent {
  readonly contextData = inject(ContextualTrainingDataService);
  readonly trainers = SESSION_TRAINERS;
  readonly types: PedagogicalSessionType[] = [
    "classroom",
    "presentation",
    "evaluation",
    "sensitization",
    "catchup",
    "event",
  ];
  readonly sessions = signal<ProgrammedSession[]>([]);
  readonly modalities: SessionModality[] = ["onsite", "remote-live", "remote-async", "practical"];

  date = "2026-09-25";
  start = "08:00";
  end = "12:00";
  trainer = "Yanis Morel";
  promotionId = "";
  selectedType = signal<PedagogicalSessionType>("classroom");
  selectedModality = signal<SessionModality>("onsite");
  theme = "";
  objectives = "";
  supports = "";
  comments = "";

  get promotions() {
    const cohort = this.contextData.cohort();
    return cohort ? [{ id: cohort.id, name: cohort.name }] : [];
  }

  constructor() {
    effect(() => {
      this.sessions.set(this.contextData.programmedSessions().map((item) => ({ ...item })));
      this.promotionId = this.contextData.cohort()?.id ?? "";
    });
  }

  typeKey(type: PedagogicalSessionType) {
    return `sessions.types.${type}`;
  }

  typeBadgeClasses(type: PedagogicalSessionType) {
    switch (type) {
      case "classroom": return "bg-[#2b66a4] text-white";
      case "presentation": return "bg-[#f0f2f5] text-[#6b7280]";
      case "evaluation": return "bg-[#fff0c9] text-[#7a5300]";
      case "sensitization": return "bg-[#d8f8df] text-[#18a547]";
      case "catchup": return "bg-[#ffe1df] text-[#f04438]";
      case "event": return "bg-[#e5f2ff] text-[#2b66a4]";
    }
  }


  modalityKey(modality: SessionModality) {
    return `sessions.modalities.${modality}`;
  }

  modalityBadgeClasses(modality: SessionModality) {
    switch (modality) {
      case "remote-live": return "bg-[#efe9ff] text-[#6f4ec7]";
      case "remote-async": return "bg-[#fff0d6] text-[#a26100]";
      case "practical": return "bg-[#e6f2ff] text-[#205a98]";
      case "onsite": return "bg-[#f0f3f7] text-[#667085]";
    }
  }

  modalityChipClasses(modality: SessionModality) {
    return this.selectedModality() === modality
      ? "border-[#6f4ec7] bg-[#f3efff] text-[#6548b8] ring-1 ring-[#6f4ec7]/15"
      : "border-[#dce3eb] bg-white text-[#475569] hover:bg-[#f7f9fc]";
  }
  typeChipClasses(type: PedagogicalSessionType) {
    return this.selectedType() === type
      ? "border-[#2b66a4] bg-[#eaf3fc] text-[#245c97] ring-1 ring-[#2b66a4]/15"
      : "border-[#dce3eb] bg-white text-[#475569] hover:bg-[#f7f9fc]";
  }

  attendancePercent(session: ProgrammedSession) {
    return session.expected === 0 ? 0 : Math.round((session.present / session.expected) * 100);
  }

  attendanceClasses(session: ProgrammedSession) {
    return session.present === session.expected
      ? "bg-[#d8f8df] text-[#18a547]"
      : "bg-[#fff0c9] text-[#8b5e00]";
  }

  createSession() {
    if (!this.theme.trim()) return;
    const cohort = this.contextData.cohort();
    if (!cohort) return;
    const id = `ps-${Date.now()}`;
    const formattedDate = this.date.split("-").reverse().join("/");
    const newSession: ProgrammedSession = {
      id,
      titleKey: this.theme.trim(),
      date: formattedDate,
      start: this.start,
      end: this.end,
      trainer: this.trainer,
      promotion: cohort.name,
      promotionId: cohort.id,
      type: this.selectedType(),
      modality: this.selectedModality(),
      objectiveKey: this.objectives.trim(),
      supportsKey: this.supports.trim(),
      present: 0,
      expected: cohort.studentCount,
    };
    this.sessions.update((items) => [newSession, ...items]);
    this.theme = "";
    this.objectives = "";
    this.supports = "";
    this.comments = "";
  }

  sessionTitle(session: ProgrammedSession) {
    return session.titleKey.startsWith("sessions.") || session.titleKey.startsWith("workspaceOperational.")
      ? session.titleKey
      : null;
  }

  sessionObjective(session: ProgrammedSession) {
    return session.objectiveKey.startsWith("sessions.") || session.objectiveKey.startsWith("workspaceOperational.")
      ? session.objectiveKey
      : null;
  }

  sessionSupports(session: ProgrammedSession) {
    return session.supportsKey.startsWith("sessions.") || session.supportsKey.startsWith("workspaceOperational.")
      ? session.supportsKey
      : null;
  }
}
