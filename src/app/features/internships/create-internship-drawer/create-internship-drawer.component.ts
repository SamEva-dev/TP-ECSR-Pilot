import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  effect,
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
import { WorkplaceApiStoreService } from "../../../core/api-data/workplace-api-store.service";
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
  readonly store = inject(WorkplaceApiStoreService);
  readonly open = input(false);
  readonly closed = output<void>();
  readonly periodCreated = output<CreateInternshipPeriodPayload>();
  readonly submitted = signal(false);
  private wasOpen = false;

  get students() {
    return this.store.students();
  }

  readonly form = new FormGroup({
    studentId: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    company: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    city: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    tutor: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    tutorEmail: new FormControl("", { nonNullable: true, validators: [Validators.email] }),
    tutorPhone: new FormControl("", { nonNullable: true }),
    startDate: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    plannedHours: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(1000)] }),
    agreementReceived: new FormControl(false, { nonNullable: true }),
    notes: new FormControl("", { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  constructor() {
    effect(() => {
      const open = this.open();
      const students = this.store.students();
      const defaultHours = this.store.defaultPlannedHours();

      if (open && !this.wasOpen) {
        this.resetForm(defaultHours, students[0]?.id ?? "");
      } else if (open && !students.some((student) => student.id === this.form.controls.studentId.value)) {
        this.form.controls.studentId.setValue(students[0]?.id ?? "", { emitEvent: false });
      }
      this.wasOpen = open;
    });
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
    if (this.store.creating()) return;
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
      studentName: `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
      company: values.company ?? "",
      city: values.city ?? "",
      tutor: values.tutor ?? "",
      tutorEmail: values.tutorEmail ?? "",
      tutorPhone: values.tutorPhone ?? "",
      startDate: values.startDate ?? "",
      endDate: values.endDate ?? "",
      plannedHours: Number.isFinite(values.plannedHours) ? values.plannedHours : 0,
      notes: values.notes ?? "",
    });
  }

  showRequired(
    name: "studentId" | "company" | "city" | "tutor" | "startDate" | "endDate" | "plannedHours",
  ): boolean {
    const control = this.form.controls[name];
    return (this.submitted() || control.touched) && control.hasError("required");
  }

  showEmailError(): boolean {
    const control = this.form.controls.tutorEmail;
    return (this.submitted() || control.touched) && control.hasError("email");
  }

  showHoursError(): boolean {
    const control = this.form.controls.plannedHours;
    return (this.submitted() || control.touched) && (control.hasError("min") || control.hasError("max"));
  }

  dateRangeInvalid(): boolean {
    const start = this.form.controls.startDate.value ?? "";
    const end = this.form.controls.endDate.value ?? "";
    return Boolean(start && end && end < start);
  }

  private resetForm(plannedHours: number, studentId: string): void {
    this.form.reset({
      studentId,
      company: "",
      city: "",
      tutor: "",
      tutorEmail: "",
      tutorPhone: "",
      startDate: "",
      endDate: "",
      plannedHours: Number.isFinite(plannedHours) ? plannedHours : 0,
      agreementReceived: false,
      notes: "",
    });
    this.submitted.set(false);
  }
}
