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
import type {
  CohortLearnerDto,
  CreateWorkplacePeriodPayload,
} from "../../../core/workplace/workplace.models";

@Component({
  selector: "app-create-internship-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./create-internship-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateInternshipDrawerComponent {
  readonly students = input<CohortLearnerDto[]>([]);
  readonly periodTypes = input<string[]>([]);
  readonly saving = input(false);
  readonly saveError = input(false);
  readonly open = input(false);
  readonly closed = output<void>();
  readonly periodCreated = output<CreateWorkplacePeriodPayload>();
  readonly submitted = signal(false);

  readonly form = new FormGroup({
    studentId: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    periodTypeCode: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    company: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    city: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    tutor: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    tutorEmail: new FormControl("", {
      nonNullable: true,
      validators: [Validators.email],
    }),
    tutorPhone: new FormControl("", { nonNullable: true }),
    startDate: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    plannedHours: new FormControl(0, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(0.01),
        Validators.max(2000),
      ],
    }),
    agreementReceived: new FormControl(false, { nonNullable: true }),
    notes: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.open() && !this.saving()) this.requestClose();
  }

  requestClose(): void {
    if (this.saving()) return;
    this.submitted.set(false);
    this.closed.emit();
  }

  submit(): void {
    this.submitted.set(true);
    if (this.saving() || this.form.invalid || this.dateRangeInvalid()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    if (
      !this.students().some((item) => item.enrollmentId === values.studentId) ||
      !this.periodTypes().includes(values.periodTypeCode)
    )
      return;

    this.periodCreated.emit({
      enrollmentId: values.studentId,
      periodTypeCode: values.periodTypeCode,
      company: values.company.trim(),
      city: values.city.trim(),
      tutorName: values.tutor.trim(),
      tutorEmail: values.tutorEmail.trim() || undefined,
      tutorPhone: values.tutorPhone.trim() || undefined,
      startDate: values.startDate,
      endDate: values.endDate,
      plannedHours: values.plannedHours,
      agreementReceived: values.agreementReceived,
      notes: values.notes.trim() || undefined,
    });
  }
  reset(): void {
    this.form.reset({
      studentId: "",
      periodTypeCode: "",
      company: "",
      city: "",
      tutor: "",
      tutorEmail: "",
      tutorPhone: "",
      startDate: "",
      endDate: "",
      plannedHours: 0,
      agreementReceived: false,
      notes: "",
    });
    this.submitted.set(false);
  }

  showRequired(
    name:
      | "studentId"
      | "periodTypeCode"
      | "company"
      | "city"
      | "tutor"
      | "startDate"
      | "endDate"
      | "plannedHours",
  ): boolean {
    const control = this.form.controls[name];
    return (
      (this.submitted() || control.touched) && control.hasError("required")
    );
  }

  showEmailError(): boolean {
    const control = this.form.controls.tutorEmail;
    return (this.submitted() || control.touched) && control.hasError("email");
  }

  showHoursError(): boolean {
    const control = this.form.controls.plannedHours;
    return (
      (this.submitted() || control.touched) &&
      (control.hasError("min") || control.hasError("max"))
    );
  }

  dateRangeInvalid(): boolean {
    const start = this.form.controls.startDate.value;
    const end = this.form.controls.endDate.value;
    return Boolean(start && end && end < start);
  }
}
