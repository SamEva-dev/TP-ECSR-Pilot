import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { PlanningEvent, PlanningType } from "../../../core/models/planning.models";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";

export interface AddPlanningPayload {
  date: string;
  startTime: string;
  endTime: string;
  promotionId: string;
  type: PlanningType;
  title: string;
  responsible: string;
  location: string;
  competence: string;
}

@Component({
  selector: "app-add-planning-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./add-planning-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddPlanningDrawerComponent {
  private readonly workspace = inject(WorkspaceContextService);
  readonly open = input(false);
  readonly closed = output<void>();
  readonly eventCreated = output<AddPlanningPayload>();
  readonly submitted = signal(false);

  get promotions(): Array<{ id: string; name: string }> {
    return this.workspace.cohorts().map((cohort) => ({
      id: cohort.id ?? "",
      name: cohort.name ?? "",
    }));
  }

  readonly types: PlanningType[] = [
    "classroom",
    "distance",
    "driving",
    "evaluation",
    "internship",
    "presentation",
    "catchup",
    "sensitization",
    "event",
  ];

  readonly form = new FormGroup({
    date: new FormControl(this.today(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startTime: new FormControl("09:00", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endTime: new FormControl("12:00", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    promotionId: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    type: new FormControl<PlanningType>("classroom", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    title: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    responsible: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    location: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    competence: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(120)],
    }),
  });

  constructor() {
    const selected = this.workspace.cohort()?.id ?? "";
    if (selected) this.form.controls.promotionId.setValue(selected);
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.open()) this.requestClose();
  }

  requestClose(): void {
    this.submitted.set(false);
    this.closed.emit();
  }

  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.invalidPeriod() || !this.dayFromDate()) {
      this.form.markAllAsTouched();
      return;
    }

    this.eventCreated.emit(this.form.getRawValue());
  }

  invalidPeriod(): boolean {
    const { startTime, endTime } = this.form.getRawValue();
    return Boolean(startTime && endTime && endTime <= startTime);
  }

  dayFromDate(date = this.form.controls.date.value): PlanningEvent["day"] | null {
    if (!date) return null;
    const day = new Date(`${date}T12:00:00`).getDay();
    return (
      {
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
      } as Record<number, PlanningEvent["day"]>
    )[day] ?? null;
  }

  showRequired(
    name: "date" | "startTime" | "endTime" | "promotionId" | "type" | "title" | "responsible",
  ): boolean {
    const control = this.form.controls[name];
    return (this.submitted() || control.touched) && control.hasError("required");
  }

  typeKey(type: PlanningType): string {
    return `planning.types.${type}`;
  }

  reset(): void {
    this.form.reset({
      date: this.today(),
      startTime: "09:00",
      endTime: "12:00",
      promotionId: this.workspace.cohort()?.id ?? "",
      type: "classroom",
      title: "",
      responsible: "",
      location: "",
      competence: "",
    });
    this.submitted.set(false);
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
