import { ChangeDetectionStrategy, Component, inject, computed } from "@angular/core";
import { RouterLink } from "@angular/router";
import { CertificationApiStoreService } from "../../core/api-data/certification-api-store.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";

@Component({
  selector: "app-jury",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./jury.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JuryComponent {
  readonly store = inject(CertificationApiStoreService);
  readonly sessions = this.store.jurySessions;
  readonly selectedId = this.store.selectedJurySessionId;
  readonly session = this.store.examSession;
  readonly candidates = this.store.candidates;
  readonly scheme = this.store.scheme;
  readonly hasAssignment = computed(() => this.sessions().length > 0);

  async selectSession(id: string): Promise<void> {
    await this.store.selectSession(id);
  }
}
