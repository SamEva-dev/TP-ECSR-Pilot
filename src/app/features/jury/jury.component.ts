import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { ContextualTrainingDataService } from "../../core/workspace/contextual-training-data.service";

@Component({
  selector: "app-jury",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./jury.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JuryComponent {
  readonly contextData = inject(ContextualTrainingDataService);
  readonly exam = this.contextData.examSession;
  readonly candidates = this.contextData.certificationCandidates;
  readonly scheme = this.contextData.certificationScheme;
  readonly program = this.contextData.program;
  readonly juryMembers = this.contextData.juryMembers;
  readonly jury = computed(() => this.juryMembers()[0]);

  initials(item: { firstName: string; lastName: string }): string {
    return `${item.firstName[0] ?? ""}${item.lastName[0] ?? ""}`.toUpperCase();
  }
}
