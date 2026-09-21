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
import { STUDENTS } from "../../../core/mock-data/dashboard.mock";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";

export interface CreateInternshipPeriodPayload {
  studentId: string;
  studentName: string;
  company: string;
  city: string;
  tutor: string;
  tutorEmail: string;
  tutorPhone: string;
  startDate: string;
  endDate: string;
  plannedHours: number;
  agreementReceived: boolean;
  notes: string;
}

@Component({
  selector: "app-create-internship-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./create-internship-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateInternshipDrawerComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly periodCreated = output<CreateInternshipPeriodPayload>();
  readonly students = STUDENTS;
  readonly submitted = signal(false);

  readonly form = new FormGroup({
    studentId: new FormControl("s1", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    company: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    city: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    tutor: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    tutorEmail: new FormControl("", {
      nonNullable: true,
      validators: [Validators.email],
    }),
    tutorPhone: new FormControl("", { nonNullable: true }),
    startDate: new FormControl("2026-11-02", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: new FormControl("2026-12-11", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    plannedHours: new FormControl(175, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(1),
        Validators.max(1000),
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
    if (this.open()) this.requestClose();
  }

  requestClose(): void {
    this.submitted.set(false);
    this.closed.emit();
  }

  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.dateRangeInvalid()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const student = this.students.find((item) => item.id === values.studentId);
    if (!student) return;

    this.periodCreated.emit({
      ...values,
      studentName: `${student.firstName} ${student.lastName}`,
    });

    this.form.reset({
      studentId: "s1",
      company: "",
      city: "",
      tutor: "",
      tutorEmail: "",
      tutorPhone: "",
      startDate: "2026-11-02",
      endDate: "2026-12-11",
      plannedHours: 175,
      agreementReceived: false,
      notes: "",
    });
    this.submitted.set(false);
    this.closed.emit();
  }

  showRequired(
    name:
      | "studentId"
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
