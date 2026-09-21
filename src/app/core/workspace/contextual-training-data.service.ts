import { Injectable, computed, inject } from '@angular/core';
import { WorkspaceContextService } from './workspace-context.service';
import { STUDENT_DIRECTORY, type StudentDirectoryItem } from '../mock-data/students.mock';
import { TRAINING_REFERENTIALS, type TrainingReferential } from '../mock-data/referentials.mock';
import { PLANNING_EVENTS, DRIVING_PROGRAMMED, type PlanningEvent } from '../mock-data/planning.mock';
import { PROGRAMMED_SESSIONS, type ProgrammedSession } from '../mock-data/sessions.mock';
import { ATTENDANCE_STUDENTS, type AttendanceStudent } from '../mock-data/attendance.mock';
import { INTERNSHIP_PERIODS, type InternshipPeriod } from '../mock-data/internships.mock';
import {
  CERTIFICATION_CANDIDATES,
  EXAM_SESSIONS,
  certificationSchemeForProgram,
  juryMembersForProgram,
  type CertificationCandidate,
  type ExamSession,
} from '../mock-data/certification.mock';
import { DRIVING_HISTORY, DRIVING_VEHICLES, type DrivingHistoryItem } from '../mock-data/driving.mock';
import type { ProgramModule } from '../models/workspace.models';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

@Injectable({ providedIn: 'root' })
export class ContextualTrainingDataService {
  readonly workspace = inject(WorkspaceContextService);

  readonly cohort = this.workspace.cohort;
  readonly program = this.workspace.program;
  readonly site = this.workspace.site;
  readonly organization = this.workspace.organization;

  readonly referential = computed<TrainingReferential | null>(() => {
    const cohort = this.cohort();
    const program = this.program();
    if (!program) return null;
    if (cohort?.referentialVersionId) {
      const exact = TRAINING_REFERENTIALS.find((item) => item.id === cohort.referentialVersionId);
      if (exact) return exact;
    }
    return (
      TRAINING_REFERENTIALS.find((item) => item.programId === program.id && item.status === 'active') ??
      TRAINING_REFERENTIALS.find((item) => item.programId === program.id) ??
      null
    );
  });

  readonly activeCohortId = computed(() => this.cohort()?.id ?? 'p1');
  readonly activeLegacyPromotionId = computed(
    () => this.cohort()?.legacyPromotionId ?? this.cohort()?.id ?? 'p1',
  );
  readonly activeCohortName = computed(() => this.cohort()?.name ?? 'TP ECSR 2026–2027');
  readonly isEcsr = computed(() => this.program()?.id === 'program-ecsr');
  readonly certificationScheme = computed(() => certificationSchemeForProgram(this.program()?.id ?? 'program-ecsr'));
  readonly juryMembers = computed(() => juryMembersForProgram(this.program()?.id ?? 'program-ecsr'));

  readonly students = computed<StudentDirectoryItem[]>(() => {
    const cohort = this.cohort();
    const referential = this.referential();
    if (!cohort) return STUDENT_DIRECTORY.filter((student) => student.promotionId === 'p1');

    if (cohort.legacyPromotionId) {
      return STUDENT_DIRECTORY.filter((student) => student.promotionId === cohort.legacyPromotionId).map(
        (student) => ({ ...student, promotionId: cohort.id, promotionName: cohort.name }),
      );
    }

    const source = STUDENT_DIRECTORY.slice(0, Math.min(cohort.studentCount, STUDENT_DIRECTORY.length));
    const totalHours = referential?.totalHours ?? 420;
    const sheetCount = referential?.sheetCount ?? 0;

    return source.map((student, index) => {
      const status = cohort.status === 'planned' ? 'good' : student.status;
      const baseline = cohort.status === 'planned' ? 0 : clamp(54 + ((index * 7) % 39));
      const progress = cohort.status === 'completed' ? clamp(84 + (index % 13)) : baseline;
      const completedHours = Math.round((totalHours * progress) / 100);
      const catchupHours = cohort.status === 'planned' ? 0 : index % 5 === 1 ? 7 : index % 7 === 3 ? 12 : 0;
      const prepared = sheetCount ? Math.round((sheetCount * progress) / 100) : 0;
      const presented = sheetCount ? Math.max(0, prepared - 5 - (index % 4)) : 0;
      const validated = sheetCount ? Math.max(0, presented - 2 - (index % 3)) : 0;
      return {
        ...student,
        promotionId: cohort.id,
        promotionName: cohort.name,
        progress,
        completedHours,
        catchupHours,
        preparedSheets: prepared,
        presentedSheets: presented,
        validatedSheets: validated,
        status: catchupHours >= 10 ? 'late' : catchupHours > 0 ? 'warning' : status,
      };
    });
  });

  readonly planningEvents = computed<PlanningEvent[]>(() => {
    const cohort = this.cohort();
    const program = this.program();
    if (!cohort || !program) return [];
    const legacy = cohort.legacyPromotionId;
    if (legacy) return PLANNING_EVENTS.filter((event) => event.promotionId === legacy);

    const genericKeys = [
      'workspaceOperational.events.theory',
      'workspaceOperational.events.practice',
      'workspaceOperational.events.assessment',
      'workspaceOperational.events.safety',
      'workspaceOperational.events.workshop',
    ];
    return PLANNING_EVENTS.filter((event) => event.promotionId === 'p1').slice(0, 8).map((event, index) => ({
      ...event,
      id: `${cohort.id}-${event.id}`,
      promotionId: cohort.id,
      type: event.type === 'presentation' && !this.moduleEnabled('sheets') ? 'evaluation' : event.type,
      titleKey: genericKeys[index % genericKeys.length],
      meta: `${program.name} · ${this.site()?.city ?? ''}`,
    }));
  });

  readonly drivingProgrammed = computed<PlanningEvent[]>(() => {
    const cohort = this.cohort();
    if (!cohort) return [];
    if (cohort.legacyPromotionId) {
      return DRIVING_PROGRAMMED.filter((event) => event.promotionId === cohort.legacyPromotionId);
    }
    const students = this.students();
    return DRIVING_PROGRAMMED.slice(0, 4).map((event, index) => ({
      ...event,
      id: `${cohort.id}-${event.id}`,
      promotionId: cohort.id,
      titleKey: '',
      meta: `${students[index % Math.max(students.length, 1)]?.firstName ?? 'Stagiaire'} ${students[index % Math.max(students.length, 1)]?.lastName ?? ''} · ${this.vehicleLabels()[0]}`,
    }));
  });

  readonly programmedSessions = computed<ProgrammedSession[]>(() => {
    const cohort = this.cohort();
    if (!cohort) return [];
    if (cohort.legacyPromotionId) {
      return PROGRAMMED_SESSIONS.filter((session) => session.promotionId === cohort.legacyPromotionId);
    }
    return PROGRAMMED_SESSIONS.filter((session) => session.promotionId === 'p1').slice(0, 5).map((session, index) => ({
      ...session,
      id: `${cohort.id}-${session.id}`,
      promotionId: cohort.id,
      promotion: cohort.name,
      type: session.type === 'presentation' && !this.moduleEnabled('sheets') ? 'evaluation' : session.type,
      titleKey: index % 2 === 0 ? 'workspaceOperational.sessions.theory' : 'workspaceOperational.sessions.practice',
      objectiveKey: 'workspaceOperational.sessions.objective',
      supportsKey: 'workspaceOperational.sessions.supports',
      expected: Math.min(cohort.studentCount, 18),
      present: Math.max(0, Math.min(cohort.studentCount, 18) - (index % 3)),
    }));
  });

  readonly attendanceStudents = computed<AttendanceStudent[]>(() => {
    const students = this.students();
    return students.map((student, index) => {
      const template = ATTENDANCE_STUDENTS[index % ATTENDANCE_STUDENTS.length];
      return {
        ...template,
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        catchupHours: student.catchupHours,
        absences: Math.floor(student.catchupHours / 4),
      };
    });
  });

  readonly internships = computed<InternshipPeriod[]>(() => {
    const cohort = this.cohort();
    if (!cohort) return [];
    if (cohort.legacyPromotionId === 'p1') return INTERNSHIP_PERIODS;

    const students = this.students();
    const plannedHours = this.referential()?.stageRequirements[0]?.hours ?? 70;
    return INTERNSHIP_PERIODS.slice(0, Math.min(4, students.length)).map((period, index) => {
      const student = students[index];
      return {
        ...period,
        id: `${cohort.id}-${period.id}`,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        company: `${this.program()?.name ?? 'Formation'} Partner ${index + 1}`,
        city: this.site()?.city ?? period.city,
        plannedHours,
        completedHours: cohort.status === 'planned' ? 0 : Math.round(plannedHours * (0.25 + index * 0.18)),
        status: cohort.status === 'planned' ? 'planned' : index === 0 ? 'completed' : index === 1 ? 'incomplete' : 'inProgress',
      };
    });
  });

  readonly certificationCandidates = computed<CertificationCandidate[]>(() => {
    const cohort = this.cohort();
    const referential = this.referential();
    const program = this.program();
    if (!cohort || !program) return [];
    if (cohort.legacyPromotionId === 'p1' && program.id === 'program-ecsr') return CERTIFICATION_CANDIDATES;

    const students = this.students().slice(0, 7);
    const plannedHours = referential?.totalHours ?? 420;
    const scheme = this.certificationScheme();
    const documentTotal = scheme.requiredDocuments || referential?.requiredDocumentCount || 6;
    return students.map((student, index) => {
      const ready = student.progress >= 70 && student.catchupHours < 10;
      const unitStatuses = scheme.units.map((unit, unitIndex) => ({
        unitId: unit.id,
        status: (ready || unitIndex === 0 ? 'validated' : 'pending') as 'validated' | 'pending' | 'not_validated',
      }));
      return {
        ...CERTIFICATION_CANDIDATES[index % CERTIFICATION_CANDIDATES.length],
        id: `${cohort.id}-c${index + 1}`,
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        candidateNumber: `${program.code}-2027-${String(index + 1).padStart(4, '0')}`,
        promotionId: cohort.id,
        programId: program.id,
        schemeId: scheme.id,
        ready,
        missingKeys: ready ? [] : ['certification.missing.hours'],
        completedHours: student.completedHours,
        plannedHours,
        documentsReady: ready ? documentTotal : Math.max(0, documentTotal - 1),
        documentsTotal: documentTotal,
        ccp1: unitStatuses[0]?.status ?? 'pending',
        ccp2: unitStatuses[1]?.status ?? 'pending',
        unitStatuses,
        result: 'pending',
        published: false,
        examTime: `${String(8 + index).padStart(2, '0')}:00`,
        steps: scheme.steps.map((step, stepIndex) => ({
          ...step,
          status: 'planned' as const,
          date: stepIndex < 2 ? '18/02/2027' : '19/02/2027',
          time: `${String(8 + stepIndex * 2).padStart(2, '0')}:00`,
        })),
      };
    });
  });

  readonly examSession = computed<ExamSession>(() => {
    const cohort = this.cohort();
    const program = this.program();
    const candidates = this.certificationCandidates();
    const base = EXAM_SESSIONS[0];
    return {
      ...base,
      id: cohort?.legacyPromotionId === 'p1' && program?.id === 'program-ecsr' ? base.id : `exam-${cohort?.id ?? 'context'}`,
      name: `${program?.name ?? 'Formation'} — Session 2027`,
      promotionId: cohort?.id ?? 'p1',
      promotionName: cohort?.name ?? base.promotionName,
      centre: `${this.organization()?.shortName ?? 'Centre'} · ${this.site()?.city ?? ''}`,
      location: `${this.site()?.name ?? base.location} · Centre d’examen`,
      candidateIds: candidates.map((item) => item.id),
      juryIds: this.juryMembers().map((item) => item.id),
      programId: program?.id,
      schemeId: this.certificationScheme().id,
    };
  });

  readonly drivingHistory = computed<DrivingHistoryItem[]>(() => {
    const cohort = this.cohort();
    if (!cohort) return DRIVING_HISTORY;
    if (cohort.legacyPromotionId === 'p1' && this.isEcsr()) return DRIVING_HISTORY;
    const students = this.students();
    return DRIVING_HISTORY.slice(0, Math.min(4, students.length)).map((item, index) => ({
      ...item,
      id: `${cohort.id}-${item.id}`,
      studentId: students[index].id,
      studentName: `${students[index].firstName} ${students[index].lastName}`,
      subjectKey: 'workspaceOperational.driving.subject',
      positiveKey: 'workspaceOperational.driving.positive',
      difficultyKey: 'workspaceOperational.driving.difficulty',
      nextGoalKey: 'workspaceOperational.driving.nextGoal',
    }));
  });

  moduleEnabled(module: ProgramModule): boolean {
    const referential = this.referential();
    const program = this.program();
    return Boolean((referential?.enabledModules ?? program?.enabledModules ?? []).includes(module));
  }

  vehicleLabels(): string[] {
    switch (this.program()?.id) {
      case 'program-moto':
        return ['Yamaha MT-07 — MOTO-01', 'Honda CB500F — MOTO-02'];
      case 'program-pl':
        return ['Renault Trucks T — PL-01', 'MAN TGS — PL-02'];
      case 'program-bus':
        return ['Iveco Crossway — BUS-01', 'Mercedes Intouro — BUS-02'];
      default:
        return DRIVING_VEHICLES.map((item) => item.label);
    }
  }
}
