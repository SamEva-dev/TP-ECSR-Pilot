import { Injectable, signal } from "@angular/core";

/** Requests opening the existing header workspace switcher without navigation. */
@Injectable({ providedIn: "root" })
export class WorkspaceContextOverlayService {
  readonly openRequest = signal(0);

  requestOpen(): void {
    this.openRequest.update(value => value + 1);
  }
}
