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
import { PEDAGOGICAL_TEAM } from "../../../core/mock-data/promotions.mock";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";

export interface CreatePromotionPayload {
  name: string;
  startDate: string;
  endDate: string;
  plannedHours: number;
  manager: string;
}

@Component({
  selector: "app-create-promotion-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./create-promotion-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePromotionDrawerComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly promotionCreated = output<CreatePromotionPayload>();
  readonly team = PEDAGOGICAL_TEAM;
  readonly submitted = signal(false);

  readonly form = new FormGroup({
    name: new FormControl("TP ECSR 2027–2028", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    startDate: new FormControl("2027-09-01", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: new FormControl("2028-06-30", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    plannedHours: new FormControl(910, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    manager: new FormControl("Claire Berthier", {
      nonNullable: true,
      validators: [Validators.required],
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
    if (this.form.invalid || this.hasInvalidDates()) {
      this.form.markAllAsTouched();
      return;
    }

    this.promotionCreated.emit(this.form.getRawValue());
    this.resetForm();
  }

  hasInvalidDates(): boolean {
    const { startDate, endDate } = this.form.getRawValue();
    return Boolean(startDate && endDate && endDate < startDate);
  }

  showRequired(
    controlName: "name" | "startDate" | "endDate" | "plannedHours" | "manager",
  ): boolean {
    const control = this.form.controls[controlName];
    return (
      (this.submitted() || control.touched) && control.hasError("required")
    );
  }

  showHoursError(): boolean {
    const control = this.form.controls.plannedHours;
    return (this.submitted() || control.touched) && control.hasError("min");
  }

  private resetForm(): void {
    this.form.reset({
      name: "TP ECSR 2027–2028",
      startDate: "2027-09-01",
      endDate: "2028-06-30",
      plannedHours: 910,
      manager: "Claire Berthier",
    });
    this.submitted.set(false);
  }

  fullName(member: { firstName: string; lastName: string }): string {
    return `${member.firstName} ${member.lastName}`;
  }
}
