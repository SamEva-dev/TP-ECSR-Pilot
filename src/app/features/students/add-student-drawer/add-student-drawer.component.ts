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
import { PROMOTIONS } from "../../../core/mock-data/dashboard.mock";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";

export interface CreateStudentPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  promotionId: string;
  startDate: string;
  sendInvitation: boolean;
}

@Component({
  selector: "app-add-student-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./add-student-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddStudentDrawerComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly studentCreated = output<CreateStudentPayload>();
  readonly promotions = PROMOTIONS;
  readonly submitted = signal(false);

  readonly form = new FormGroup({
    firstName: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    lastName: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl("", { nonNullable: true }),
    birthDate: new FormControl("", { nonNullable: true }),
    promotionId: new FormControl("p1", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startDate: new FormControl("2026-09-01", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    sendInvitation: new FormControl(true, { nonNullable: true }),
  });

  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.open()) {
      this.requestClose();
    }
  }

  requestClose(): void {
    this.submitted.set(false);
    this.closed.emit();
  }

  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.studentCreated.emit(this.form.getRawValue());
    this.form.reset({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      birthDate: "",
      promotionId: "p1",
      startDate: "2026-09-01",
      sendInvitation: true,
    });
    this.submitted.set(false);
  }

  showRequired(
    controlName:
      "firstName" | "lastName" | "email" | "promotionId" | "startDate",
  ): boolean {
    const control = this.form.controls[controlName];
    return (
      (this.submitted() || control.touched) && control.hasError("required")
    );
  }

  showEmailError(): boolean {
    const control = this.form.controls.email;
    return (this.submitted() || control.touched) && control.hasError("email");
  }
}
