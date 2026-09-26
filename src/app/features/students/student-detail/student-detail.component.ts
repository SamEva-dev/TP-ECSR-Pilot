import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SessionService } from '../../../core/session/session.service';
import { ProgressBarComponent } from '../../../shared/ui/progress-bar.component';
import type { DrivingCriterion, DrivingHistoryItem, DrivingLevel } from '../../../core/models/driving.models';
import type { SkillCriterionLevel, SkillDefinition } from '../../../core/models/skills.models';
import type { SheetStatus, PedagogicalSheet } from '../../../core/models/sheets.models';
import type { InternshipPeriod, InternshipStatus } from '../../../core/models/internships.models';
import type {
  StudentDetailProfile,
  StudentDetailTab,
  StudentEvaluationRow,
  StudentTimelineRow,
} from '../../../core/models/student-detail.models';
import type { StudentStatus } from '../../../core/models/app.models';
import type { LearnerDetailReport, LearnerCertificationDetail } from '../../../core/reporting/reporting.models';
import { ReportingApiService } from '../../../core/reporting/reporting-api.service';
import { WorkspaceContextService } from '../../../core/workspace/workspace-context.service';
import { ApplicationNotificationService } from '../../../core/notifications/application-notification.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { DocumentApiService } from '../../../core/documents/document-api.service';

interface AuditViewItem {
  id: string;
  dateTime: string;
  actionKey: string;
  oldValue: string;
  newValue: string;
  reasonKey: string;
  author: string;
}

interface ExamCandidateView {
  id: string;
  candidateNumber: string;
  ready: boolean;
  missingKeys: string[];
  completedHours: number;
  plannedHours: number;
  documentsReady: number;
  documentsTotal: number;
  ccp1: 'validated' | 'pending' | 'not_validated';
  ccp2: 'validated' | 'pending' | 'not_validated';
  steps: Array<{ id: string; labelKey: string; date: string; time: string; duration: string }>;
}

@Component({
  selector: 'app-student-detail',
  imports: [RouterLink, TranslatePipe, ProgressBarComponent],
  templateUrl: './student-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetailComponent {
  private readonly route = inject(ActivatedRoute);
  readonly sessionService = inject(SessionService);
  private readonly reporting = inject(ReportingApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly realtime = inject(RealtimeService);
  private readonly documentsApi = inject(DocumentApiService);

  private readonly detail = signal<LearnerDetailReport | null>(null);
  readonly selectedTab = signal<StudentDetailTab>('overview');
  readonly tabs: { id: StudentDetailTab; labelKey: string }[] = [
    { id: 'overview', labelKey: 'studentDetail.tabs.overview' },
    { id: 'hours', labelKey: 'studentDetail.tabs.hours' },
    { id: 'driving', labelKey: 'studentDetail.tabs.driving' },
    { id: 'skills', labelKey: 'studentDetail.tabs.skills' },
    { id: 'sheets', labelKey: 'studentDetail.tabs.sheets' },
    { id: 'attendance', labelKey: 'studentDetail.tabs.attendance' },
    { id: 'internships', labelKey: 'studentDetail.tabs.internships' },
    { id: 'evaluations', labelKey: 'studentDetail.tabs.evaluations' },
    { id: 'documents', labelKey: 'studentDetail.tabs.documents' },
    { id: 'certification', labelKey: 'studentDetail.tabs.certification' },
    { id: 'history', labelKey: 'studentDetail.tabs.history' },
  ];

  private readonly requestedId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly isSelfView = computed(() => this.sessionService.role() === 'stagiaire');
  readonly completedHours = computed(() => this.student?.completedHours ?? 0);
  readonly remainingHours = computed(() => Math.max((this.student?.plannedHours ?? 0) - this.completedHours(), 0));

  get student(): StudentDetailProfile { return this.mapStudent(this.detail()); }
  get skillDefinitions(): SkillDefinition[] { return this.mapSkills(this.detail()); }
  get drivingCriteria(): DrivingCriterion[] { return this.mapDrivingCriteria(this.detail()); }
  get sheets(): PedagogicalSheet[] { return this.mapSheets(this.detail()); }
  get drivingHistory(): DrivingHistoryItem[] { return this.mapDriving(this.detail()); }
  get internships(): InternshipPeriod[] { return this.mapInternships(this.detail()); }
  get auditHistory(): AuditViewItem[] { return this.mapAudit(this.detail()); }
  get certification(): ExamCandidateView | null { return this.mapCertification(this.detail()?.certification ?? null); }
  get examSession(): { name: string; startDate: string; endDate: string } {
    const certification = this.detail()?.certification;
    return certification
      ? { name: this.text(certification.sessionTitle), startDate: this.date(certification.startsAtUtc), endDate: this.date(certification.endsAtUtc) }
      : { name: '', startDate: '', endDate: '' };
  }

  constructor() {
    void this.realtime.start().catch(() => undefined);
    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const user = this.sessionService.session();
      const self = this.isSelfView();
      const cohortId = self ? this.workspace.cohort()?.apiId ?? '' : '';
      if (!ready || !user) { this.detail.set(null); return; }
      untracked(() => void this.load(self, cohortId));
    });
    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.(training\.(attendance|enrollment)|learning\.|workplace\.|document\.|certification\.)/.test(event.typeKey)) return;
      untracked(() => void this.load(this.isSelfView(), this.isSelfView() ? this.workspace.cohort()?.apiId ?? '' : ''));
    });
  }

  private async load(self: boolean, cohortId: string): Promise<void> {
    try {
      const result = self
        ? await firstValueFrom(this.reporting.myLearnerDetail(cohortId || undefined))
        : this.requestedId
          ? await firstValueFrom(this.reporting.learnerDetail(this.requestedId))
          : null;
      this.detail.set(result ?? null);
    } catch {
      this.detail.set(null);
      this.notifications.error('studentDetail.api.loadFailed', self ? '/accueil' : `/stagiaires/${this.requestedId}`);
    }
  }

  selectTab(tab: StudentDetailTab): void { this.selectedTab.set(tab); }

  initials(): string {
    const student = this.student;
    if (!student) return '';
    return `${this.text(student.firstName).charAt(0)}${this.text(student.lastName).charAt(0)}`.toUpperCase();
  }

  studentStatusClasses(): string {
    const status = this.student.status;
    return status === 'good' ? 'bg-[#d8f8df] text-[#18a547]' : status === 'warning' ? 'bg-[#fff0c9] text-[#8b5e00]' : 'bg-[#ffe1df] text-[#f22b2b]';
  }
  studentStatusKey(): string { return this.detail() ? `students.status.${this.student.status}` : ''; }
  skillProgress(code: string): number { return this.student.skills[code.toUpperCase() as 'C1' | 'C2' | 'C3' | 'C4'] ?? 0; }
  skillCriterionLevel(code: string, index: number): SkillCriterionLevel {
    const skill = this.skillDefinitions.find((item) => item.code.toUpperCase() === code);
    return skill?.criteria[index]?.level ?? 'not_assessed';
  }
  skillLevelClasses(level: SkillCriterionLevel): string {
    return level === 'acquired' ? 'bg-[#d8f8df] text-[#18a547]' : level === 'in_progress' ? 'bg-[#fff0c9] text-[#8b5e00]' : 'bg-[#ffe1df] text-[#f22b2b]';
  }
  drivingLevelClasses(level: DrivingLevel): string {
    return level === 'acquired' ? 'bg-[#d8f8df] text-[#18a547]' : level === 'progress' ? 'bg-[#fff0c9] text-[#8b5e00]' : 'bg-[#ffe1df] text-[#f22b2b]';
  }
  drivingLevelKey(level: DrivingLevel): string { return `drivingSession.levels.${level}`; }
  criterionLabelKey(criterionId: string): string { return this.drivingCriteria.find((criterion) => criterion.id === criterionId)?.labelKey ?? this.text(criterionId); }
  sheetStatusClasses(status: SheetStatus): string {
    switch (status) { case 'validated': return 'bg-[#d8f8df] text-[#18a547]'; case 'rework': return 'bg-[#ffe1df] text-[#f22b2b]'; case 'presented': return 'bg-[#e5f2ff] text-[#2a64a2]'; case 'ready': return 'bg-[#2a64a2] text-white'; case 'in_progress': return 'bg-[#fff0c9] text-[#8b5e00]'; default: return 'bg-[#eef2f6] text-[#64748b]'; }
  }
  attendanceClasses(status: 'present' | 'late' | 'absent' | 'excused'): string {
    return status === 'present' ? 'bg-[#d8f8df] text-[#18a547]' : status === 'late' ? 'bg-[#fff0c9] text-[#8b5e00]' : status === 'absent' ? 'bg-[#ffe1df] text-[#f22b2b]' : 'bg-[#e5f2ff] text-[#2a64a2]';
  }
  internshipClasses(status: InternshipStatus): string {
    return status === 'completed' ? 'bg-[#d8f8df] text-[#18a547]' : status === 'incomplete' ? 'bg-[#ffe1df] text-[#f22b2b]' : status === 'inProgress' ? 'bg-[#e5f2ff] text-[#2a64a2]' : 'bg-[#eef2f6] text-[#64748b]';
  }
  evaluationClasses(tone: 'success' | 'warning' | 'danger' | 'info'): string {
    return tone === 'success' ? 'bg-[#d8f8df] text-[#18a547]' : tone === 'warning' ? 'bg-[#fff0c9] text-[#8b5e00]' : tone === 'danger' ? 'bg-[#ffe1df] text-[#f22b2b]' : 'bg-[#e5f2ff] text-[#2a64a2]';
  }
  timelineDot(tone: 'success' | 'danger' | 'warning' | 'info'): string { return tone === 'success' ? 'bg-[#22a84b]' : tone === 'danger' ? 'bg-[#ed2e38]' : tone === 'warning' ? 'bg-[#f8a11a]' : 'bg-[#2a64a2]'; }
  internshipProgress(completed: number, planned: number): number { return planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0; }
  formatDate(value?: string): string { return this.date(value); }

  async downloadDocument(id: string): Promise<void> {
    const document = this.detail()?.documents?.find((item) => item.id === id);
    if (!document) return;
    try { await this.documentsApi.downloadById(id, this.text(document.fileName)); }
    catch { this.notifications.error('studentDetail.api.documentDownloadFailed', `/stagiaires/${this.requestedId}`); }
  }

  private mapStudent(detail: LearnerDetailReport | null): StudentDetailProfile {
    if (!detail) return {
      id: '', enrollmentId: '', firstName: '', lastName: '', promotionId: '', promotionName: '', progress: 0, completedHours: 0, catchupHours: 0, preparedSheets: 0, presentedSheets: 0, validatedSheets: 0, status: 'good', enrollmentStatus: 'active', email: '', startDate: '', expectedEndDate: '', plannedHours: 0, absences: 0, delays: 0, reworkSheets: 0, totalSheets: 0, skills: { C1: 0, C2: 0, C3: 0, C4: 0 }, hours: [
        { key: 'classroom', planned: 0, completed: 0, catchup: 0 }, { key: 'driving', planned: 0, completed: 0, catchup: 0 }, { key: 'internship', planned: 0, completed: 0, catchup: 0 }, { key: 'presentation', planned: 0, completed: 0, catchup: 0 }, { key: 'assessment', planned: 0, completed: 0, catchup: 0 }, { key: 'awareness', planned: 0, completed: 0, catchup: 0 }, { key: 'catchup', planned: 0, completed: 0, catchup: 0 }, { key: 'absence', planned: 0, completed: 0, catchup: 0 }, { key: 'other', planned: 0, completed: 0, catchup: 0 }
      ], attendance: [], evaluations: [], documents: [], timeline: []
    };
    const s = detail.summary;
    const competencies = s?.competencies ?? {};
    const catchup = this.hours(s?.catchupMinutes);
    const status: StudentStatus = catchup >= 10 ? 'late' : catchup > 0 || (s?.reworkTopics ?? 0) > 0 ? 'warning' : 'good';
    const evaluations = this.mapEvaluations(detail);
    const timeline = this.mapTimeline(detail);
    return {
      id: this.text(detail.learnerProfileId), enrollmentId: this.text(detail.enrollmentId), firstName: this.text(detail.firstName), lastName: this.text(detail.lastName),
      promotionId: this.text(detail.cohortKey), promotionName: this.text(detail.cohortName), progress: this.number(s?.averageCompetencyProgress),
      completedHours: this.hours(s?.completedMinutes), catchupHours: catchup, preparedSheets: this.number(s?.preparedTopics), presentedSheets: this.number(s?.presentedTopics),
      validatedSheets: this.number(s?.validatedTopics), status, enrollmentStatus: this.enrollmentStatus(detail.enrollmentStatus), email: this.text(detail.email),
      startDate: this.date(detail.cohortStartDate), expectedEndDate: this.date(detail.cohortEndDate), plannedHours: this.hours(s?.plannedMinutes), absences: this.number(s?.absentCount),
      delays: this.number(s?.lateCount), reworkSheets: this.number(s?.reworkTopics), totalSheets: this.number(s?.totalTopics),
      skills: { C1: this.number(competencies['C1']), C2: this.number(competencies['C2']), C3: this.number(competencies['C3']), C4: this.number(competencies['C4']) },
      hours: [
        { key: 'classroom', planned: 0, completed: this.hours(s?.classroomMinutes), catchup: 0 },
        { key: 'driving', planned: 0, completed: this.hours(s?.drivingMinutes), catchup: 0 },
        { key: 'internship', planned: 0, completed: this.hours(s?.internshipMinutes), catchup: 0 },
        { key: 'presentation', planned: 0, completed: 0, catchup: 0 }, { key: 'assessment', planned: 0, completed: 0, catchup: 0 },
        { key: 'awareness', planned: 0, completed: 0, catchup: 0 }, { key: 'catchup', planned: catchup, completed: 0, catchup },
        { key: 'absence', planned: 0, completed: 0, catchup: 0 }, { key: 'other', planned: 0, completed: 0, catchup: 0 },
      ],
      attendance: (detail.attendance ?? []).map((row) => ({ date: this.date(row.startsAtUtc), sessionKey: this.text(row.sessionTitle), status: this.attendanceStatus(row.status), missedHours: `${this.hours(row.missedMinutes)} h` })),
      evaluations,
      documents: (detail.documents ?? []).map((doc) => ({ id: this.text(doc.id), titleKey: this.text(doc.title), categoryKey: `documents.categories.${this.text(doc.category)}`, date: this.date(doc.createdAtUtc), size: this.fileSize(doc.sizeBytes) })),
      timeline,
    };
  }

  private mapSkills(detail: LearnerDetailReport | null): SkillDefinition[] {
    return (detail?.skills ?? []).map((skill) => ({ definitionId: this.text(skill.id), code: this.text(skill.code), titleKey: this.text(skill.title), criteria: (skill.criteria ?? []).map((c) => ({ definitionId: this.text(c.id), labelKey: this.text(c.title), level: this.skillLevel(c.level) })) }));
  }
  private mapDrivingCriteria(detail: LearnerDetailReport | null): DrivingCriterion[] {
    const map = new Map<string, string>();
    for (const item of detail?.driving ?? []) for (const criterion of item.criteria ?? []) if (!map.has(this.text(criterion.code))) map.set(this.text(criterion.code), this.text(criterion.label));
    return [...map.entries()].map(([id, labelKey]) => ({ id, labelKey }));
  }
  private mapSheets(detail: LearnerDetailReport | null): PedagogicalSheet[] {
    return (detail?.topics ?? []).map((topic) => ({ topicId: this.text(topic.id), number: this.number(topic.number), titleKey: this.text(topic.title), status: this.sheetStatus(topic.status), preparationDate: this.text(topic.preparationDate), presentationDate: this.text(topic.presentationDate), durationMinutes: 0, evaluator: '', commentKey: '', positivePoints: '', improvements: '', generalComment: '', nextObjective: '', evaluationLevels: {} }));
  }
  private mapDriving(detail: LearnerDetailReport | null): DrivingHistoryItem[] {
    const studentName = `${this.text(detail?.firstName)} ${this.text(detail?.lastName)}`.trim();
    return (detail?.driving ?? []).map((row) => ({ id: this.text(row.id), studentId: this.text(detail?.learnerProfileId), studentName, date: this.date(row.evaluatedAtUtc), competence: this.text(row.competencyCode), trainer: this.text(row.trainerDisplayName), subjectKey: this.text(row.subject), positiveKey: this.text(row.positive), difficultyKey: this.text(row.difficulty), nextGoalKey: this.text(row.nextGoal), evaluations: (row.criteria ?? []).map((c) => ({ criterionId: this.text(c.code), level: this.drivingLevel(c.level) })) }));
  }
  private mapInternships(detail: LearnerDetailReport | null): InternshipPeriod[] {
    const studentName = `${this.text(detail?.firstName)} ${this.text(detail?.lastName)}`.trim();
    return (detail?.workplace ?? []).map((row) => ({ id: this.text(row.id), studentId: this.text(detail?.learnerProfileId), studentName, company: this.text(row.company), city: this.text(row.city), tutor: this.text(row.tutorName), startDate: this.date(row.startDate), endDate: this.date(row.endDate), plannedHours: this.number(row.plannedHours), completedHours: this.number(row.completedHours), status: this.internshipStatus(row.status), trainerVisible: true, activities: (row.activities ?? []).map((a) => ({ labelKey: this.text(a.title), status: a.status === 'done' ? 'done' : a.status === 'notApplicable' ? 'notApplicable' : 'pending' })), tutorObservationKey: this.text(row.tutorObservation), documents: [] }));
  }
  private mapEvaluations(detail: LearnerDetailReport): StudentEvaluationRow[] {
    const rows: StudentEvaluationRow[] = [];
    for (const drive of detail.driving ?? []) rows.push({ date: this.date(drive.evaluatedAtUtc), titleKey: this.text(drive.subject), resultKey: drive.competencyCode ? `${drive.competencyCode}` : '', tone: 'info', evaluator: this.text(drive.trainerDisplayName) });
    for (const stage of detail.workplace ?? []) for (const evaluation of stage.evaluations ?? []) rows.push({ date: this.date(evaluation.evaluatedAtUtc), titleKey: this.text(evaluation.summary), resultKey: evaluation.validated === true ? 'studentDetail.evaluations.results.validated' : evaluation.validated === false ? 'studentDetail.evaluations.results.rework' : '', tone: evaluation.validated === true ? 'success' : evaluation.validated === false ? 'warning' : 'info', evaluator: this.text(evaluation.evaluatorDisplayName) });
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }
  private mapTimeline(detail: LearnerDetailReport): StudentTimelineRow[] {
    return (detail.history ?? []).map((item) => ({ dateKey: this.dateTime(item.occurredAtUtc), titleKey: this.text(item.action), detailKey: this.text(item.userDisplayName), tone: 'info' }));
  }
  private mapAudit(detail: LearnerDetailReport | null): AuditViewItem[] {
    return (detail?.history ?? []).map((item) => ({ id: this.text(item.id), dateTime: this.dateTime(item.occurredAtUtc), actionKey: this.text(item.action), oldValue: '', newValue: '', reasonKey: '', author: this.text(item.userDisplayName) }));
  }
  private mapCertification(value: LearnerCertificationDetail | null): ExamCandidateView | null {
    if (!value) return null;
    const detail = this.detail();
    const summary = detail?.summary;
    const unitStatus = (unit: string): 'validated' | 'pending' | 'not_validated' => {
      const steps = (value.steps ?? []).filter((s) => this.text(s.unitCode).toUpperCase() === unit);
      if (!steps.length) return 'pending';
      if (steps.every((s) => this.text(s.outcome).toLowerCase() === 'passed')) return 'validated';
      if (steps.some((s) => ['failed', 'absent'].includes(this.text(s.outcome).toLowerCase()))) return 'not_validated';
      return 'pending';
    };
    return { id: this.text(value.candidateId), candidateNumber: '', ready: value.eligible === true, missingKeys: Array.isArray(value.eligibilityBlockers) ? value.eligibilityBlockers.map((x) => this.text(x)) : [], completedHours: this.hours(summary?.completedMinutes), plannedHours: this.hours(summary?.plannedMinutes), documentsReady: 0, documentsTotal: 0, ccp1: unitStatus('CCP1'), ccp2: unitStatus('CCP2'), steps: (value.steps ?? []).map((step) => ({ id: this.text(step.id), labelKey: this.text(step.title), date: this.date(value.startsAtUtc), time: '', duration: `${this.number(step.durationMinutes)} min` })) };
  }

  private text(value: unknown): string { return typeof value === 'string' ? value : ''; }
  private number(value: unknown): number { const n = typeof value === 'number' ? value : Number(value); return Number.isFinite(n) ? n : 0; }
  private hours(minutes: unknown): number { return Math.round((this.number(minutes) / 60) * 10) / 10; }
  private date(value: unknown): string { const text = this.text(value); if (!text) return ''; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text); return m ? `${m[3]}/${m[2]}/${m[1]}` : text; }
  private dateTime(value: unknown): string { const text = this.text(value); if (!text) return ''; const d = new Date(text); return Number.isNaN(d.getTime()) ? text : d.toLocaleString('fr-FR'); }
  private fileSize(value: unknown): string { const bytes = this.number(value); if (!bytes) return '0 Ko'; if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024 * 10) / 10} Mo`; return `${Math.round(bytes / 1024)} Ko`; }
  private skillLevel(value: unknown): SkillCriterionLevel { const v = this.text(value); return v === 'acquired' ? 'acquired' : v === 'in_progress' ? 'in_progress' : v === 'rework' ? 'rework' : 'not_assessed'; }
  private drivingLevel(value: unknown): DrivingLevel { const v = this.text(value); return v === 'acquired' ? 'acquired' : v === 'in_progress' ? 'progress' : 'work'; }
  private sheetStatus(value: unknown): SheetStatus { const v = this.text(value); return ['not_started','in_progress','ready','presented','validated','rework'].includes(v) ? v as SheetStatus : 'not_started'; }
  private attendanceStatus(value: unknown): 'present' | 'late' | 'absent' | 'excused' { const v = this.text(value).toLowerCase(); return v === 'late' ? 'late' : v === 'absent' ? 'absent' : v === 'excused' ? 'excused' : 'present'; }
  private internshipStatus(value: unknown): InternshipStatus { const v = this.text(value); return v === 'completed' ? 'completed' : v === 'incomplete' ? 'incomplete' : v === 'inProgress' ? 'inProgress' : v === 'cancelled' ? 'cancelled' : 'planned'; }
  private enrollmentStatus(value: unknown): StudentDetailProfile['enrollmentStatus'] { const v = this.text(value).toLowerCase(); return ['pending','active','suspended','completed','withdrawn','cancelled'].includes(v) ? v as StudentDetailProfile['enrollmentStatus'] : 'active'; }
}
