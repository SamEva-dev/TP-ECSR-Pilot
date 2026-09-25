import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import {
  StudentProfileApiService,
  type TopicProgressApi,
  type UpdateTopicProgressApiRequest,
} from "../../../core/students/student-profile-api.service";

@Component({
  selector: "app-evaluate-sheet-drawer",
  imports: [TranslatePipe],
  templateUrl: "./evaluate-sheet-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluateSheetDrawerComponent {
  readonly enrollmentId = input.required<string>();
  readonly studentName = input.required<string>();
  readonly topics = input.required<TopicProgressApi[]>();
  readonly closed = output<void>();
  readonly savedTopic = output<TopicProgressApi>();
  private readonly api = inject(StudentProfileApiService);
  readonly topicId = signal("");
  readonly selectedTopic = computed(
    () =>
      this.topics().find((x) => x.topicId === this.topicId()) ??
      this.topics()[0] ??
      null,
  );
  readonly status = signal("");
  readonly preparationDate = signal("");
  readonly presentationDate = signal("");
  readonly duration = signal("");
  readonly comment = signal("");
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly invalid = signal(false);
  readonly statuses = [
    "not_started",
    "in_progress",
    "ready",
    "presented",
    "validated",
    "rework",
  ];

  constructor() {
    effect(() => {
      const topic = this.selectedTopic();
      this.status.set(topic?.status ?? "");
      this.preparationDate.set(topic?.preparationDate ?? "");
      this.presentationDate.set(topic?.presentationDate ?? "");
      this.duration.set(
        topic?.presentationDurationMinutes == null
          ? ""
          : String(topic.presentationDurationMinutes),
      );
      this.comment.set(topic?.comment ?? "");
      this.error.set(false);
      this.invalid.set(false);
    });
  }

  selectTopic(event: Event): void {
    this.topicId.set((event.target as HTMLSelectElement).value);
  }
  setStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
    this.invalid.set(false);
  }
  setField(
    field: "preparationDate" | "presentationDate" | "duration" | "comment",
    event: Event,
  ): void {
    this[field].set(
      (event.target as HTMLInputElement | HTMLTextAreaElement).value,
    );
    this.invalid.set(false);
  }
  async save(): Promise<void> {
    const topic = this.selectedTopic();
    const duration = this.duration() ? Number(this.duration()) : null;
    const presented = ["presented", "validated", "rework"].includes(
      this.status(),
    );
    if (
      !topic ||
      !this.statuses.includes(this.status()) ||
      this.saving() ||
      (duration !== null &&
        (!Number.isInteger(duration) || duration < 1 || duration > 1440)) ||
      (presented && (!this.presentationDate() || duration === null))
    ) {
      this.invalid.set(true);
      return;
    }
    const request: UpdateTopicProgressApiRequest = {
      status: this.status(),
      preparationDate: this.preparationDate() || null,
      presentationDate: this.presentationDate() || null,
      presentationDurationMinutes: duration,
      evaluatorDisplayName: null,
      comment: this.comment().trim() || null,
    };
    this.saving.set(true);
    this.error.set(false);
    try {
      const row = await firstValueFrom(
        this.api.updateTopic(this.enrollmentId(), topic.topicId, request),
      );
      this.savedTopic.emit(row);
    } catch {
      this.error.set(true);
    } finally {
      this.saving.set(false);
    }
  }
  close(): void {
    if (!this.saving()) this.closed.emit();
  }
}
