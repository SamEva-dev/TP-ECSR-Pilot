import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { StatisticsApiStoreService } from '../../core/api-data/statistics-api-store.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SessionService } from '../../core/session/session.service';
import { ProgressBarComponent } from '../../shared/ui/progress-bar.component';

@Component({
  selector: 'app-statistics',
  imports: [TranslatePipe, ProgressBarComponent],
  templateUrl: './statistics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsComponent {
  readonly sessionService = inject(SessionService);
  private readonly store = inject(StatisticsApiStoreService);

  readonly role = computed(() => this.sessionService.role());
  readonly directionAverageProgress = this.store.directionAverageProgress;
  readonly directionAttendance = this.store.directionAttendance;
  readonly directionCompletedHours = this.store.directionCompletedHours;
  readonly directionCatchupHours = this.store.directionCatchupHours;
  readonly trainerAverageProgress = this.store.trainerAverageProgress;
  readonly trainerAttendance = this.store.trainerAttendance;
  readonly trainerSessionCount = this.store.trainerSessionCount;
  readonly trainerStudentCount = this.store.trainerStudentCount;
  readonly secretariatToRegularize = this.store.secretariatToRegularize;
  readonly studentProgress = this.store.studentProgress;
  readonly studentAttendance = this.store.studentAttendance;
  readonly studentCompletedHours = this.store.studentCompletedHours;
  readonly studentPlannedHours = this.store.studentPlannedHours;
  readonly studentCatchupHours = this.store.studentCatchupHours;
  readonly studentPresentCount = this.store.studentPresentCount;
  readonly studentLateCount = this.store.studentLateCount;
  readonly studentAbsentCount = this.store.studentAbsentCount;
  readonly studentExcusedCount = this.store.studentExcusedCount;

  get centerPromotions() { return this.store.centerPromotions(); }
  get centerCompetencies() { return this.store.centerCompetencies(); }
  get centerRanking() { return this.store.centerRanking(); }
  get centerStatuses() { return this.store.centerStatuses(); }
  get trainerCompetencies() { return this.store.trainerCompetencies(); }
  get trainerStudents() { return this.store.trainerStudents(); }
  get studentCompetencies() { return this.store.studentCompetencies(); }
  get secretariatPriorities() { return this.store.secretariatPriorities(); }
  get studentHours() { return this.store.studentHours(); }

  centerSheetPrepared() { return this.store.centerSheets().prepared; }
  centerSheetPresented() { return this.store.centerSheets().presented; }
  centerSheetValidated() { return this.store.centerSheets().validated; }
  centerSheetRework() { return this.store.centerSheets().rework; }
  centerSheetProgress() { return this.store.centerSheets().progress; }
  trainerSheetPresented() { return this.store.trainerSheets().presented; }
  trainerSheetValidated() { return this.store.trainerSheets().validated; }
  trainerSheetRework() { return this.store.trainerSheets().rework; }
  trainerStatusCount(key: 'good' | 'warning' | 'late') {
    return this.store.trainerStatuses().find((item) => item.key === key)?.count ?? 0;
  }
  studentSheetPrepared() { return this.store.studentSheets().prepared; }
  studentSheetPresented() { return this.store.studentSheets().presented; }
  studentSheetValidated() { return this.store.studentSheets().validated; }
  studentSheetRework() { return this.store.studentSheets().rework; }
  studentSheetTotal() { return this.store.student()?.totalTopics ?? 0; }

  isDirection() { return this.role() === 'direction'; }
  isSecretariat() { return this.role() === 'secretariat'; }
  isTrainer() { return this.role() === 'formateur'; }

  statusClasses(key: 'good' | 'warning' | 'late' | 'finished') {
    if (key === 'good') return 'bg-[#d8f8df] text-[#18a547]';
    if (key === 'warning') return 'bg-[#fff0c9] text-[#8b5e00]';
    if (key === 'late') return 'bg-[#ffe1df] text-[#f22b2b]';
    return 'bg-[#e5f2ff] text-[#245c97]';
  }
}
