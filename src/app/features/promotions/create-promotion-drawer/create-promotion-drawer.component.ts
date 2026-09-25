import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
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
import { TRAINING_REFERENTIALS } from "../../../core/api-data/runtime-data.store";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";

export interface CreatePromotionPayload {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  capacity: number;
  referentialVersionId: string;
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
  readonly submitted = signal(false);
  readonly referentials = computed(() =>
    TRAINING_REFERENTIALS.filter(
      (item) =>
        item.programId === this.programId() &&
        item.status === "active" &&
        !!item.apiId,
    ),
  );

  readonly form = new FormGroup({
    code: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(40)],
    }),
    name: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    startDate: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    capacity: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    referentialVersionId: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      if (this.open()) return;
      this.form.reset({
        code: "",
        name: "",
        startDate: "",
        endDate: "",
        capacity: 1,
        referentialVersionId: this.referentials()[0]?.id ?? "",
      });
      this.submitted.set(false);
    });
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.open()) this.requestClose();
  }

  requestClose(): void {
    this.closed.emit();
  }

  submit(): void {
    this.submitted.set(true);
    if (
      this.form.invalid ||
      this.form.value.endDate! < this.form.value.startDate!
    ) {
      this.form.markAllAsTouched();
      return;
    }
    this.promotionCreated.emit(this.form.getRawValue());
  }
}
