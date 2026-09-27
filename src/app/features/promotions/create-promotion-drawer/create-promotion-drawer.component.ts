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
  untracked,
} from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { PedagoraAccessApiService } from "../../../core/access/pedagora-access-api.service";
import { ReferentialApiStoreService } from "../../../core/api-data/referential-api-store.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { WorkspaceCohort } from "../../../core/models/workspace.models";

export interface CreatePromotionPayload {
  name: string;
  startDate: string;
  endDate: string;
  studentCount: number;
  managerUserId: string;
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
  private readonly accessApi = inject(PedagoraAccessApiService);

  readonly open = input(false);
  readonly organizationName = input("");
  readonly siteName = input("");
  readonly programId = input("");
  readonly programName = input("");
  readonly closed = output<void>();
  readonly promotionCreated = output<CreatePromotionPayload>();
  readonly submitted = signal(false);
  readonly team = signal<TeamOption[]>([]);
  readonly teamLoading = signal(false);

  readonly referentials = computed(() =>
    this.referentialStore
      .items()
      .filter(
        (item) =>
          item.programId === this.programId() && item.status !== "archived",
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
    managerUserId: new FormControl("", {
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

  constructor() {
    effect(() => {
      if (!this.open()) return;
      untracked(() => void this.refreshCreationSources());
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
    if (
      !this.form.controls.referentialVersionId.value &&
      this.referentials().length
    ) {
      this.form.controls.referentialVersionId.setValue(
        this.referentials()[0].id,
      );
    }
    if (this.form.invalid || this.hasInvalidDates()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const manager = this.team().find(
      (member) => member.id === raw.managerUserId,
    );
    this.promotionCreated.emit({
      ...raw,
      manager: manager ? this.fullName(manager) : "",
    });
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
      | "managerUserId"
      | "referentialVersionId"
      | "status",
  ): boolean {
    const control = this.form.controls[controlName];
    return (
      (this.submitted() || control.touched) && control.hasError("required")
    );
  }

  showStudentCountError(): boolean {
    const control = this.form.controls.studentCount;
    return (this.submitted() || control.touched) && control.hasError("min");
  }

  fullName(member: TeamOption): string {
    return (
      this.text(member.name) ||
      `${this.text(member.firstName)} ${this.text(member.lastName)}`.trim()
    );
  }

  private async refreshCreationSources(): Promise<void> {
    await this.referentialStore.reload();
    const firstReferential = this.referentials()[0];
    const currentReferential = this.form.controls.referentialVersionId.value;
    if (
      !currentReferential ||
      !this.referentials().some((item) => item.id === currentReferential)
    )
      this.form.controls.referentialVersionId.setValue(
        firstReferential?.id ?? "",
        { emitEvent: false },
      );
    await this.loadTeam();
  }

  private async loadTeam(): Promise<void> {
    this.teamLoading.set(true);
    try {
      const page = await firstValueFrom(this.accessApi.trainers());
      const members = (page ?? [])
        .filter(
          (account) => account.status === "Active" && !account.isInvitation,
        )
        .map((account) => ({
          id: this.text(account.id),
          firstName: this.text(account.firstName),
          lastName: this.text(account.lastName),
          name:
            `${this.text(account.firstName)} ${this.text(account.lastName)}`.trim() ||
            this.text(account.email),
        }))
        .filter((member) => member.id && this.fullName(member));
      this.team.set(members);
      const current = this.form.controls.managerUserId.value;
      if (!current || !members.some((member) => member.id === current))
        this.form.controls.managerUserId.setValue(members[0]?.id ?? "", {
          emitEvent: false,
        });
    } catch {
      this.team.set([]);
      this.form.controls.managerUserId.setValue("", { emitEvent: false });
    } finally {
      this.teamLoading.set(false);
    }
  }

  private resetForm(): void {
    this.form.reset({
      name: "",
      startDate: "",
      endDate: "",
      studentCount: 0,
      managerUserId: this.team()[0]?.id ?? "",
      referentialVersionId: this.referentials()[0]?.id ?? "",
      status: "planned",
    });
    this.submitted.set(false);
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }
}
