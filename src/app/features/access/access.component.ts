import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  PedagoraAccessApiService,
  type ProductAccount,
} from "../../core/access/pedagora-access-api.service";
import { SessionService } from "../../core/session/session.service";

const ROLE_KEYS: Record<string, string> = {
  OrganizationAdministrator: "organization_admin",
  OrganizationDirection: "organization_direction",
  SiteDirection: "site_direction",
  PedagogicalManager: "pedagogical_manager",
  Secretariat: "secretariat",
  Trainer: "trainer",
  Student: "student",
  Jury: "jury",
  ReadOnly: "read_only",
};

@Component({
  selector: "app-access",
  imports: [TranslatePipe],
  templateUrl: "./access.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessComponent implements OnDestroy {
  private readonly api = inject(PedagoraAccessApiService);
  readonly session = inject(SessionService);
  readonly roleOptions = signal<{ value: string; key: string }[]>([]);
  readonly accounts = signal<ProductAccount[]>([]);
  readonly loading = signal(false);
  readonly savingId = signal<string | null>(null);
  readonly error = signal("");
  readonly page = signal(1);
  readonly total = signal(0);
  readonly search = signal("");
  readonly hasNext = computed(() => this.page() * 50 < this.total());
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / 50)),
  );
  private requestId = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const organizationId = this.session.session()?.organizationId;
      if (organizationId) void this.load(1);
      else {
        this.accounts.set([]);
        this.total.set(0);
      }
    });
  }

  async load(page = this.page()): Promise<void> {
    const requestId = ++this.requestId;
    this.loading.set(true);
    this.error.set("");
    try {
      const response = await firstValueFrom(
        this.api.list(page, this.search().trim()),
      );
      if (requestId !== this.requestId) return;
      this.accounts.set(response.items);
      this.roleOptions.set(
        response.rolesAvailable.map((value) => ({
          value,
          key: ROLE_KEYS[value.split(".").at(-1) ?? ""] ?? "",
        })),
      );
      this.total.set(response.totalCount);
      this.page.set(response.page);
    } catch (error) {
      if (requestId !== this.requestId) return;
      this.accounts.set([]);
      this.roleOptions.set([]);
      this.total.set(0);
      this.error.set(this.errorMessage(error));
    } finally {
      if (requestId === this.requestId) this.loading.set(false);
    }
  }

  setSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(1), 250);
  }
  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
    this.requestId++;
  }
  roleLabel(role: string): string {
    const key = this.roleOptions().find((option) => option.value === role)?.key;
    return key ? `access.assignments.roles.${key}` : role;
  }

  async changeRole(account: ProductAccount, role: string): Promise<void> {
    if (!role || this.savingId()) return;
    await this.mutate(account.id, () => this.api.setRole(account.id, role));
  }

  async changeStatus(account: ProductAccount): Promise<void> {
    if (this.savingId()) return;
    await this.mutate(account.id, () =>
      this.api.setActive(account.id, account.status !== "Active"),
    );
  }

  private async mutate(
    id: string,
    command: () => ReturnType<PedagoraAccessApiService["setRole"]>,
  ): Promise<void> {
    this.savingId.set(id);
    this.error.set("");
    try {
      await firstValueFrom(command());
      await this.load();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.savingId.set(null);
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) return "access.real.forbidden";
      if (error.status === 409) return "access.real.lastAdmin";
    }
    return "access.real.failed";
  }
}
