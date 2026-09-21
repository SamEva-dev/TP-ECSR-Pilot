import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  CERTIFICATION_CANDIDATES,
  EXAM_SESSIONS,
  JURY_MEMBERS,
} from "../../core/mock-data/certification.mock";

@Component({
  selector: "app-jury",
  imports: [RouterLink, TranslatePipe],
  templateUrl: "./jury.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JuryComponent {
  readonly exam = EXAM_SESSIONS[0];
  readonly candidates = CERTIFICATION_CANDIDATES;
  readonly jury = JURY_MEMBERS[0];

  initials(item: { firstName: string; lastName: string }): string {
    return `${item.firstName[0] ?? ""}${item.lastName[0] ?? ""}`.toUpperCase();
  }
}
