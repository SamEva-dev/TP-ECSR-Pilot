import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  type InternshipDocument,
  type InternshipPeriod,
  type InternshipStatus,
} from "../../core/mock-data/internships.mock";
import { SessionService } from "../../core/session/session.service";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";
import { ProgressBarComponent } from "../../shared/ui/progress-bar.component";
import {
  CreateInternshipDrawerComponent,
  type CreateInternshipPeriodPayload,
} from "./create-internship-drawer/create-internship-drawer.component";

@Component({
  selector: "app-internships",
  imports: [
    TranslatePipe,
    ProgressBarComponent,
    CreateInternshipDrawerComponent,
  ],
  templateUrl: "./internships.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternshipsComponent {
  readonly sessionService = inject(SessionService);
  readonly contextData = inject(ContextualTrainingDataService);
  readonly drawerOpen = signal(false);
  readonly createdPeriods = signal<InternshipPeriod[]>([]);

  readonly periods = computed(() => {
    const allPeriods = [...this.createdPeriods(), ...this.contextData.internships()];
    const role = this.sessionService.role();
    if (role === "stagiaire") {
      const studentId = this.sessionService.session()?.studentId ?? "s1";
      return allPeriods.filter((period) => period.studentId === studentId);
    }
    if (role === "formateur")
      return allPeriods.filter((period) => period.trainerVisible);
    return allPeriods;
  });

  readonly totals = computed(() => {
    const periods = this.periods();
    const planned = periods.reduce(
      (total, period) => total + period.plannedHours,
      0,
    );
    const completed = periods.reduce(
      (total, period) => total + period.completedHours,
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
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  addPeriod(payload: CreateInternshipPeriodPayload): void {
    const period: InternshipPeriod = {
      id: `stage-local-${Date.now()}`,
      studentId: payload.studentId,
      studentName: payload.studentName,
      company: payload.company,
      city: payload.city,
      tutor: payload.tutor,
      startDate: this.formatDate(payload.startDate),
      endDate: this.formatDate(payload.endDate),
      plannedHours: payload.plannedHours,
      completedHours: 0,
      status: "planned",
      trainerVisible: true,
      activities: [
        {
          labelKey: "internships.activities.observeDrivingLessons",
          status: "pending",
        },
        {
          labelKey: "internships.activities.leadTheorySession",
          status: "pending",
        },
        {
          labelKey: "internships.activities.pedagogicalAppointment",
          status: "pending",
        },
        { labelKey: "internships.activities.lessonPlan", status: "pending" },
        {
          labelKey: "internships.activities.studentInitialAssessment",
          status: "pending",
        },
      ],
      tutorObservationKey: "internships.observations.notStarted",
      documents: [
        {
          labelKey: "internships.documents.agreement",
          status: payload.agreementReceived ? "available" : "missing",
        },
        {
          labelKey: "internships.documents.attendanceCertificate",
          status: "missing",
        },
        { labelKey: "internships.documents.finalReport", status: "missing" },
      ],
    };

    this.createdPeriods.update((items) => [period, ...items]);
  }

  progress(period: InternshipPeriod): number {
    if (!period.plannedHours) return 0;
    return Math.round((period.completedHours / period.plannedHours) * 100);
  }

  remaining(period: InternshipPeriod): number {
    return Math.max(0, period.plannedHours - period.completedHours);
  }

  statusClass(status: InternshipStatus): string {
    switch (status) {
      case "completed":
        return "bg-[#d8f8df] text-[#18a547]";
      case "incomplete":
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

  private formatDate(value: string): string {
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
  }
}
