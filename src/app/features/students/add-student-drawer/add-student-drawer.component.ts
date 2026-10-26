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
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";

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
  readonly contextData = inject(ContextualTrainingDataService);
  readonly workspace = inject(WorkspaceContextService);
  readonly open = input(false);
  readonly busy = input(false);
  readonly closed = output<void>();
  readonly studentCreated = output<CreateStudentPayload>();
  readonly submitted = signal(false);
  readonly promotions = computed(() => this.workspace.contextCohorts()
    .filter(item => !!item.apiId)
    .map(item => ({ id: item.id as string, name: item.name as string })));
  readonly promotionUnavailable = computed(() => !this.workspace.remoteWorkspaceLoaded() || this.promotions().length === 0);

  readonly form = new FormGroup({
    firstName: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl("", { nonNullable: true }),
    birthDate: new FormControl("", { nonNullable: true }),
    promotionId: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    startDate: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    sendInvitation: new FormControl({ value: true, disabled: true }, { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      // A failed request must keep the user's input. Clear only after closing.
      if (this.open()) return;
      const cohort = this.contextData.cohort();
      this.form.reset({
        firstName: "", lastName: "", email: "", phone: "", birthDate: "",
        promotionId: cohort?.id ?? "", startDate: cohort?.start ?? "", sendInvitation: true,
      });
      this.submitted.set(false);
    });

    effect(() => {
      const cohort = this.contextData.cohort();
      if (!cohort) return;
      // Do not replace an explicitly selected, still-authorized promotion.
      const currentId = this.form.controls.promotionId.value;
      if (currentId && this.promotions().some(item => item.id === currentId)) return;
      this.form.controls.promotionId.setValue(cohort.id, { emitEvent: false });
      this.form.controls.startDate.setValue(cohort.start, { emitEvent: false });
    });
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.open()) this.requestClose();
  }

  requestClose(): void {
    if (this.busy()) return;
    this.closed.emit();
  }

  submit(): void {
    if (this.busy()) return;
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.promotions().some(item => item.id === this.form.controls.promotionId.value)) {
      this.form.controls.promotionId.setErrors({ invalidContext: true });
      return;
    }
    this.studentCreated.emit(this.form.getRawValue());
  }

  showRequired(controlName: "firstName" | "lastName" | "email" | "promotionId" | "startDate"): boolean {
    const control = this.form.controls[controlName];
    return (this.submitted() || control.touched) && control.hasError("required");
  }

  showEmailError(): boolean {
    const control = this.form.controls.email;
    return (this.submitted() || control.touched) && control.hasError("email");
  }
}
