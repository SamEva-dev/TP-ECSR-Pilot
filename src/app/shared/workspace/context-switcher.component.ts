import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  effect,
  signal,
} from "@angular/core";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { WorkspaceContextOverlayService } from "../../core/workspace/workspace-context-overlay.service";

@Component({
  selector: "app-context-switcher",
  imports: [TranslatePipe],
  templateUrl: "./context-switcher.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextSwitcherComponent {
  readonly workspace = inject(WorkspaceContextService);
  private readonly overlay = inject(WorkspaceContextOverlayService);
  readonly open = signal(false);

  constructor() {
    effect(() => {
      const requested = this.overlay.openRequest();
      if (requested > 0 && !this.workspace.isLocked()) this.open.set(true);
    });
  }

  toggle(): void {
    if (this.workspace.isLocked()) return;
    this.open.update((value) => !value);
  }

  close(): void {
    this.open.set(false);
  }

  selectOrganization(id: string): void {
    this.workspace.selectOrganization(id);
    this.close();
  }

  selectSite(id: string): void {
    this.workspace.selectSite(id);
    this.close();
  }

  selectProgram(id: string): void {
    this.workspace.selectProgram(id);
    this.close();
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
