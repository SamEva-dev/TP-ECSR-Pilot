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
import { PEDAGOGICAL_TEAM } from "../../../core/api-data/runtime-data.store";
import { ReferentialApiStoreService } from "../../../core/api-data/referential-api-store.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { WorkspaceCohort } from "../../../core/models/workspace.models";
import { SessionService } from "../../../core/session/session.service";

export interface CreatePromotionPayload {
  name: string;
  startDate: string;
  endDate: string;
  studentCount: number;
  manager: string;
  referentialVersionId: string;
  status: WorkspaceCohort["status"];
}

interface TeamOption {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
}

@Component({
  selector: "app-create-promotion-drawer",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./create-promotion-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePromotionDrawerComponent {
  private readonly referentialStore = inject(ReferentialApiStoreService);
  private readonly session = inject(SessionService);

  readonly open = input(false);
  readonly organizationName = input("");
  readonly siteName = input("");
  readonly programId = input("");
  readonly programName = input("");
  readonly closed = output<void>();
  readonly promotionCreated = output<CreatePromotionPayload>();
  readonly submitted = signal(false);

  readonly referentials = computed(() =>
    this.referentialStore.items().filter(
      (item) => item.programId === this.programId() && item.status !== "archived",
    ),
  );

  readonly form = new FormGroup({
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
    studentCount: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    manager: new FormControl("", {
      nonNullable: true,
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

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const firstReferential = this.referentials()[0];
      if (!this.form.controls.referentialVersionId.value && firstReferential)
        this.form.controls.referentialVersionId.setValue(firstReferential.id, { emitEvent: false });

      if (!this.form.controls.manager.value) {
        const manager = this.team[0];
        this.form.controls.manager.setValue(manager ? this.fullName(manager) : "", { emitEvent: false });
      }
    });
  }

  get team(): TeamOption[] {
    const runtime = PEDAGOGICAL_TEAM.map((member: any, index) => ({
      id: this.text(member?.id) || `trainer-${index}`,
      firstName: this.text(member?.firstName),
      lastName: this.text(member?.lastName),
      name: this.text(member?.name) || this.text(member?.label),
    })).filter((member) => this.fullName(member));

    if (runtime.length) return runtime;

    const current = this.session.session();
    if (!current) return [];
    const firstName = this.text(current.firstName);
    const lastName = this.text(current.lastName);
    const name = `${firstName} ${lastName}`.trim() || this.text(current.email);
    if (!name) return [];
    return [{
      id: this.text(current.userId) || this.text(current.email),
      firstName,
      lastName,
      name,
    }];
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

  fullName(member: TeamOption): string {
    return this.text(member.name) || `${this.text(member.firstName)} ${this.text(member.lastName)}`.trim();
  }

  private resetForm(): void {
    this.form.reset({
      name: "",
      startDate: "",
      endDate: "",
      studentCount: 0,
      manager: "",
      referentialVersionId: this.referentials()[0]?.id ?? "",
      status: "planned",
    });
    this.submitted.set(false);
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }
}
