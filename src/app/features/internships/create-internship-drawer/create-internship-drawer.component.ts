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
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { ContextualTrainingDataService } from "../../../core/workspace/contextual-training-data.service";

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
  readonly contextData = inject(ContextualTrainingDataService);
  readonly open = input(false);
  readonly closed = output<void>();
  readonly periodCreated = output<CreateInternshipPeriodPayload>();
  readonly submitted = signal(false);

  get students() {
    return this.contextData.students();
  }

  readonly form = new FormGroup({
    studentId: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    company: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    city: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    tutor: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    tutorEmail: new FormControl("", { nonNullable: true, validators: [Validators.email] }),
    tutorPhone: new FormControl("", { nonNullable: true }),
    startDate: new FormControl("2026-11-02", { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl("2026-12-11", { nonNullable: true, validators: [Validators.required] }),
    plannedHours: new FormControl(175, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(1000)] }),
    agreementReceived: new FormControl(false, { nonNullable: true }),
    notes: new FormControl("", { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  constructor() {
    effect(() => {
      const students = this.contextData.students();
      const planned = this.contextData.referential()?.stageRequirements[0]?.hours ?? 175;
      if (!students.some((student) => student.id === this.form.controls.studentId.value)) {
        this.form.controls.studentId.setValue(students[0]?.id ?? "", { emitEvent: false });
      }
      this.form.controls.plannedHours.setValue(planned, { emitEvent: false });
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

    const planned = this.contextData.referential()?.stageRequirements[0]?.hours ?? 175;
    this.form.reset({
      studentId: this.students[0]?.id ?? "",
      company: "",
      city: "",
      tutor: "",
      tutorEmail: "",
      tutorPhone: "",
      startDate: "2026-11-02",
      endDate: "2026-12-11",
      plannedHours: planned,
      agreementReceived: false,
      notes: "",
    });
    this.submitted.set(false);
    this.closed.emit();
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
    const start = this.form.controls.startDate.value;
    const end = this.form.controls.endDate.value;
    return Boolean(start && end && end < start);
  }
}
