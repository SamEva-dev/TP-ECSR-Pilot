import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SignatureApiService, type SignatureContent } from '../../core/signatures/signature-api.service';
import { ApplicationNotificationService } from '../../core/notifications/application-notification.service';

interface AttendanceSnapshot {
  Title?: string;
  StartsAtUtc?: string;
  EndsAtUtc?: string;
  TimeZoneId?: string;
  Status?: string;
  ArrivalAtUtc?: string | null;
  DepartureAtUtc?: string | null;
  ExpectedMinutes?: number;
  PresentMinutes?: number;
  MissedMinutes?: number;
}

@Component({
  selector: 'app-attendance-signature',
  imports: [TranslatePipe, RouterLink],
  templateUrl: './attendance-signature.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceSignatureComponent {
  private readonly api = inject(SignatureApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  readonly document = signal<SignatureContent | null>(null);
  readonly attendance = signal<AttendanceSnapshot | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly comment = signal('');

  constructor() { void this.reload(); }

  async reload(): Promise<void> {
    if (!this.id) { this.error.set(true); return; }
    this.loading.set(true);
    this.error.set(false);
    try {
      const content = await firstValueFrom(this.api.attendanceContent(this.id));
      // Snapshot is an exact server-frozen document; never rebuild hours on the client.
      const parsed: unknown = JSON.parse(content.snapshotJson || '{}');
      this.document.set(content);
      this.attendance.set(parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as AttendanceSnapshot : {});
      // An explicit POST, never a side effect of GET, persists the true viewed state.
      if (content.canRespond && content.envelope.status === 'pending') {
        try {
          const viewed = await firstValueFrom(this.api.markAttendanceViewed(this.id));
          this.document.set({ ...content, envelope: viewed });
        } catch {
          this.notifications.error('signatures.errors.view', `/signatures/attendance/${this.id}`);
        }
      }
    } catch {
      this.document.set(null);
      this.attendance.set(null);
      this.error.set(true);
      this.notifications.error('signatures.errors.load', '/presences');
    } finally { this.loading.set(false); }
  }

  updateComment(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value.slice(0, 2000));
  }

  async respond(acknowledge: boolean): Promise<void> {
    if (this.saving() || !this.document()?.canRespond) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.respondAttendance(this.id, {
        acknowledge, comment: acknowledge ? null : this.comment(),
      }));
      await this.reload();
    } catch {
      this.notifications.error('signatures.errors.respond', `/signatures/attendance/${this.id}`);
    } finally { this.saving.set(false); }
  }
}
