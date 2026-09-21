import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { PROMOTIONS } from "../../core/mock-data/dashboard.mock";
import {
  PROGRAMMED_SESSIONS,
  SESSION_TRAINERS,
  type PedagogicalSessionType,
  type ProgrammedSession,
} from "../../core/mock-data/sessions.mock";

@Component({
  selector: "app-sessions",
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: "./sessions.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsComponent {
  readonly promotions = PROMOTIONS;
  readonly trainers = SESSION_TRAINERS;
  readonly types: PedagogicalSessionType[] = [
    "classroom",
    "presentation",
    "evaluation",
    "sensitization",
    "catchup",
    "event",
  ];
  readonly sessions = signal<ProgrammedSession[]>(PROGRAMMED_SESSIONS);

  date = "2026-09-25";
  start = "08:00";
  end = "12:00";
  trainer = "Yanis Morel";
  promotionId = "p1";
  selectedType = signal<PedagogicalSessionType>("classroom");
  theme = "";
  objectives = "";
  supports = "";
  comments = "";

  typeKey(type: PedagogicalSessionType) {
    return `sessions.types.${type}`;
  }

  typeBadgeClasses(type: PedagogicalSessionType) {
    switch (type) {
      case "classroom":
        return "bg-[#2b66a4] text-white";
      case "presentation":
        return "bg-[#f0f2f5] text-[#6b7280]";
      case "evaluation":
        return "bg-[#fff0c9] text-[#7a5300]";
      case "sensitization":
        return "bg-[#d8f8df] text-[#18a547]";
      case "catchup":
        return "bg-[#ffe1df] text-[#f04438]";
      case "event":
        return "bg-[#e5f2ff] text-[#2b66a4]";
    }
  }

  typeChipClasses(type: PedagogicalSessionType) {
    return this.selectedType() === type
      ? "border-[#2b66a4] bg-[#eaf3fc] text-[#245c97] ring-1 ring-[#2b66a4]/15"
      : "border-[#dce3eb] bg-white text-[#475569] hover:bg-[#f7f9fc]";
  }

  attendancePercent(session: ProgrammedSession) {
    return session.expected === 0
      ? 0
      : Math.round((session.present / session.expected) * 100);
  }

  attendanceClasses(session: ProgrammedSession) {
    return session.present === session.expected
      ? "bg-[#d8f8df] text-[#18a547]"
      : "bg-[#fff0c9] text-[#8b5e00]";
  }

  createSession() {
    if (!this.theme.trim()) return;
    const promotion =
      this.promotions.find((p) => p.id === this.promotionId) ??
      this.promotions[0];
    const id = `ps-${Date.now()}`;
    const formattedDate = this.date.split("-").reverse().join("/");
    const newSession: ProgrammedSession = {
      id,
      titleKey: "",
      date: formattedDate,
      start: this.start,
      end: this.end,
      trainer: this.trainer,
      promotion: promotion.name,
      promotionId: promotion.id,
      type: this.selectedType(),
      objectiveKey: "",
      supportsKey: "",
      present: 0,
      expected: promotion.id === "p2" ? 6 : 9,
    };
    this.sessions.update((items) => [
      {
        ...newSession,
        titleKey: this.theme.trim(),
        objectiveKey: this.objectives.trim(),
        supportsKey: this.supports.trim(),
      },
      ...items,
    ]);
    this.theme = "";
    this.objectives = "";
    this.supports = "";
    this.comments = "";
  }

  sessionTitle(session: ProgrammedSession) {
    return session.titleKey.startsWith("sessions.") ? session.titleKey : null;
  }

  sessionObjective(session: ProgrammedSession) {
    return session.objectiveKey.startsWith("sessions.")
      ? session.objectiveKey
      : null;
  }

  sessionSupports(session: ProgrammedSession) {
    return session.supportsKey.startsWith("sessions.")
      ? session.supportsKey
      : null;
  }
}
