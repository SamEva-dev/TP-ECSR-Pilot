import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
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
import { TRAINING_REFERENTIALS } from "../../../core/mock-data/referentials.mock";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { WorkspaceCohort } from "../../../core/models/workspace.models";

export interface CreatePromotionPayload {
  name: string;
  startDate: string;
  endDate: string;
  studentCount: number;
  manager: string;
  referentialVersionId: string;
  status: WorkspaceCohort["status"];
}

@Component({
  selector: "app-create-promotion-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./create-promotion-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePromotionDrawerComponent {
  readonly open = input(false);
  readonly organizationName = input("—");
  readonly siteName = input("—");
  readonly programId = input("");
  readonly programName = input("—");
  readonly closed = output<void>();
  readonly promotionCreated = output<CreatePromotionPayload>();
  readonly team = PEDAGOGICAL_TEAM;
  readonly submitted = signal(false);

  readonly referentials = computed(() =>
    TRAINING_REFERENTIALS.filter(
      (item) => item.programId === this.programId() && item.status !== "archived",
    ),
  );

  readonly form = new FormGroup({
    name: new FormControl("Promotion 2027–2028", {
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
    studentCount: new FormControl(18, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    manager: new FormControl("Claire Berthier", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    referentialVersionId: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    status: new FormControl<WorkspaceCohort["status"]>("planned", {
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
    if (!this.form.controls.referentialVersionId.value && this.referentials().length) {
      this.form.controls.referentialVersionId.setValue(this.referentials()[0].id);
    }
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
    controlName:
      | "name"
      | "startDate"
      | "endDate"
      | "studentCount"
      | "manager"
      | "referentialVersionId"
      | "status",
  ): boolean {
    const control = this.form.controls[controlName];
    return (this.submitted() || control.touched) && control.hasError("required");
  }

  showStudentCountError(): boolean {
    const control = this.form.controls.studentCount;
    return (this.submitted() || control.touched) && control.hasError("min");
  }

  fullName(member: { firstName: string; lastName: string }): string {
    return `${member.firstName} ${member.lastName}`;
  }

  private resetForm(): void {
    this.form.reset({
      name: "Promotion 2027–2028",
      startDate: "2027-09-01",
      endDate: "2028-06-30",
      studentCount: 18,
      manager: "Claire Berthier",
      referentialVersionId: this.referentials()[0]?.id ?? "",
      status: "planned",
    });
    this.submitted.set(false);
  }
}
