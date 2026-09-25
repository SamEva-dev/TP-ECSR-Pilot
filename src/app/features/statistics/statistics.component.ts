import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import {
  CENTER_COMPETENCIES,
  CENTER_PROMOTIONS,
  CENTER_RANKING,
  CENTER_STATUSES,
  SECRETARIAT_PRIORITIES,
  STUDENT_COMPETENCIES,
  TRAINER_COMPETENCIES,
  TRAINER_STUDENTS,
} from "../../core/api-data/runtime-data.store";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";

@Component({
  selector: "app-statistics",
  imports: [TranslatePipe, ProgressBarComponent],
  templateUrl: "./statistics.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsComponent {
  readonly sessionService = inject(SessionService);
  readonly centerPromotions = CENTER_PROMOTIONS;
  readonly centerCompetencies = CENTER_COMPETENCIES;
  readonly centerRanking = CENTER_RANKING;
  readonly centerStatuses = CENTER_STATUSES;
  readonly trainerCompetencies = TRAINER_COMPETENCIES;
  readonly trainerStudents = TRAINER_STUDENTS;
  readonly studentCompetencies = STUDENT_COMPETENCIES;
  readonly secretariatPriorities = SECRETARIAT_PRIORITIES;

  readonly role = computed(() => this.sessionService.role());

  isDirection() {
    return this.role() === "direction";
  }

  isSecretariat() {
    return this.role() === "secretariat";
  }

  isTrainer() {
    return this.role() === "formateur";
  }

  statusClasses(key: "good" | "warning" | "late" | "finished") {
    if (key === "good") return "bg-[#d8f8df] text-[#18a547]";
    if (key === "warning") return "bg-[#fff0c9] text-[#8b5e00]";
    if (key === "late") return "bg-[#ffe1df] text-[#f22b2b]";
    return "bg-[#e5f2ff] text-[#245c97]";
  }
}
