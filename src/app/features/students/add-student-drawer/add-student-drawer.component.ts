import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
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

export interface CreateStudentPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  promotionId: string;
  startDate: string;
}

@Component({
  selector: "app-add-student-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./add-student-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddStudentDrawerComponent {
  readonly contextData = inject(ContextualTrainingDataService);
  readonly open = input(false);
  readonly closed = output<void>();
  readonly studentCreated = output<CreateStudentPayload>();
  readonly submitted = signal(false);
  readonly promotions = computed(() => {
    const cohort = this.contextData.cohort();
    return cohort ? [{ id: cohort.id, name: cohort.name }] : [];
  });

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
    promotionId: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startDate: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      const cohort = this.contextData.cohort();
      if (!cohort) return;
      this.form.controls.promotionId.setValue(cohort.id, { emitEvent: false });
      this.form.controls.startDate.setValue(cohort.start, { emitEvent: false });
    });
    effect(() => {
      if (this.open()) return;
      const cohort = this.contextData.cohort();
      this.form.reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        birthDate: "",
        promotionId: cohort?.id ?? "",
        startDate: cohort?.start ?? "",
      });
      this.submitted.set(false);
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.studentCreated.emit(this.form.getRawValue());
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
