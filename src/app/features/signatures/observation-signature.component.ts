import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SignatureApiService, type SignatureContent } from '../../core/signatures/signature-api.service';
import { ApplicationNotificationService } from '../../core/notifications/application-notification.service';

interface ObservationSnapshot {
  Subject?: string; Positive?: string; Difficulty?: string;
  NextGoal?: string; FreeObservation?: string;
  TrainerDisplayName?: string; EvaluatedAtUtc?: string;
  Criteria?: Array<{Code?: string; Label?: string; Level?: string}>;
  EvaluationId?: string;
  Observations?: ObservationSnapshot[];
  Date?: string;
}

@Component({
  selector: 'app-observation-signature',
  imports: [TranslatePipe, RouterLink],
  templateUrl: './observation-signature.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservationSignatureComponent {
  private readonly api = inject(SignatureApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(ApplicationNotificationService);
  readonly document = signal<SignatureContent | null>(null);
  readonly observation = signal<ObservationSnapshot | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly comment = signal('');
  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  constructor() { void this.reload(); }

  async reload(): Promise<void> {
    if (!this.id) { this.error.set(true); return; }
    this.loading.set(true);
    this.error.set(false);
    try {
      const content = await firstValueFrom(this.api.observationContent(this.id));
      const parsed: unknown = JSON.parse(content.snapshotJson || '{}');
      this.observation.set(parsed && typeof parsed === 'object' ? parsed as ObservationSnapshot : {});
      this.document.set(content);
      // A successful GET does not mutate state. Record the opening explicitly for the
      // authenticated trainee; a failed acknowledgement must not hide the document.
      if (content.canRespond && content.envelope.status === 'pending') {
        try {
          const viewed = await firstValueFrom(this.api.markObservationViewed(this.id));
          this.document.set({ ...content, envelope: viewed });
        } catch {
          this.notifications.error('signatures.errors.view', `/signatures/${this.id}`);
        }
      }
    } catch {
      this.document.set(null);
      this.observation.set(null);
      this.error.set(true);
      this.notifications.error('signatures.errors.load', '/accueil');
    } finally { this.loading.set(false); }
  }

  updateComment(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value.slice(0, 2000));
  }

  async respond(acknowledge: boolean): Promise<void> {
    const status = this.document()?.envelope.status;
    if (this.saving() || (status !== 'pending' && status !== 'viewed')) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.respondObservation(this.id, {
        acknowledge, comment: acknowledge ? null : this.comment(),
      }));
      await this.reload();
    } catch {
      this.notifications.error('signatures.errors.respond', `/signatures/${this.id}`);
    } finally { this.saving.set(false); }
  }
}
