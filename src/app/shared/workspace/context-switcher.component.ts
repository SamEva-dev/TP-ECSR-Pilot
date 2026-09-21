import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";

@Component({
  selector: "app-context-switcher",
  imports: [TranslatePipe],
  templateUrl: "./context-switcher.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextSwitcherComponent {
  readonly workspace = inject(WorkspaceContextService);
  readonly open = signal(false);

  toggle(): void {
    if (this.workspace.isLocked()) return;
    this.open.update((value) => !value);
  }

  close(): void {
    this.open.set(false);
  }

  selectOrganization(id: string): void {
    this.workspace.selectOrganization(id);
  }

  selectSite(id: string): void {
    this.workspace.selectSite(id);
  }

  selectProgram(id: string): void {
    this.workspace.selectProgram(id);
  }

  selectCohort(id: string): void {
    this.workspace.selectCohort(id);
    this.close();
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.close();
  }
}
