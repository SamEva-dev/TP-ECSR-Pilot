import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
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
import { parisInstant } from "../../../core/training-delivery/paris-time";
import type {
  TrainingSessionModality,
  TrainingSessionType,
} from "../../../core/training-delivery/training-delivery-api.service";

export interface AddPlanningPayload {
  date: string;
  startTime: string;
  endTime: string;
  type: TrainingSessionType;
  modality: TrainingSessionModality;
  title: string;
  responsible: string;
  location: string;
  objective: string;
}

@Component({
  selector: "app-add-planning-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./add-planning-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddPlanningDrawerComponent {
  readonly open = input(false);
  readonly saving = input(false);
  readonly error = input(false);
  readonly cohortName = input("");
  readonly closed = output<void>();
  readonly eventCreated = output<AddPlanningPayload>();
  readonly submitted = signal(false);
  readonly types: TrainingSessionType[] = [
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
  readonly modalities: TrainingSessionModality[] = [
    "onsite",
    "remote-live",
    "remote-async",
    "practical",
  ];
  readonly form = new FormGroup({
    date: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startTime: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endTime: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    type: new FormControl<TrainingSessionType>("classroom", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    modality: new FormControl<TrainingSessionModality>("onsite", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    title: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    responsible: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    location: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    objective: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
    }),
  });
  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.open()) this.requestClose();
  }
  requestClose(): void {
    if (!this.saving()) this.closed.emit();
  }
  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.invalidPeriod() || !this.cohortName()) {
      this.form.markAllAsTouched();
      return;
    }
    this.eventCreated.emit(this.form.getRawValue());
  }
  invalidPeriod(): boolean {
    const { date, startTime, endTime } = this.form.getRawValue();
    if (!date || !startTime || !endTime) return false;
    const start = parisInstant(date, startTime);
    const end = parisInstant(date, endTime);
    return !start || !end || end <= start;
  }
  typeKey(type: TrainingSessionType): string {
    return `planning.types.${type}`;
  }
  reset(): void {
    this.form.reset({
      date: "",
      startTime: "",
      endTime: "",
      type: "classroom",
      modality: "onsite",
      title: "",
      responsible: "",
      location: "",
      objective: "",
    });
    this.submitted.set(false);
  }
}
