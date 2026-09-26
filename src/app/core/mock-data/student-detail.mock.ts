import { STUDENT_DIRECTORY, type StudentDirectoryItem } from './students.mock';
import { sheetsFor } from './sheets.mock';
import { DRIVING_HISTORY } from './driving.mock';
import { INTERNSHIP_PERIODS } from './internships.mock';
import { AUDIT_LOG } from './reports.mock';
import type { StudentStatus } from '../models/app.models';

export type StudentDetailTab =
  | 'overview'
  | 'hours'
  | 'driving'
  | 'skills'
  | 'sheets'
  | 'attendance'
  | 'internships'
  | 'evaluations'
  | 'documents'
  | 'certification'
  | 'history';

export type HourCategoryKey =
  | 'classroom'
  | 'driving'
  | 'internship'
  | 'presentation'
  | 'assessment'
  | 'awareness'
  | 'catchup'
  | 'absence'
  | 'other';

export interface StudentHourRow {
  key: HourCategoryKey;
  planned: number;
  completed: number;
  catchup: number;
}

export interface StudentAttendanceRow {
  date: string;
  sessionKey: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  missedHours: string;
}

export interface StudentEvaluationRow {
  date: string;
  titleKey: string;
  resultKey: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
  evaluator: string;
}

export interface StudentDocumentRow {
  id: string;
  titleKey: string;
  categoryKey: string;
  date: string;
  size: string;
}

export interface StudentTimelineRow {
  dateKey: string;
  titleKey: string;
  detailKey: string;
  tone: 'success' | 'danger' | 'warning' | 'info';
}

export interface StudentDetailProfile extends StudentDirectoryItem {
  email: string;
  startDate: string;
  expectedEndDate: string;
  plannedHours: number;
  absences: number;
  delays: number;
  reworkSheets: number;
  skills: Record<'C1' | 'C2' | 'C3' | 'C4', number>;
  hours: StudentHourRow[];
  attendance: StudentAttendanceRow[];
  evaluations: StudentEvaluationRow[];
  documents: StudentDocumentRow[];
  timeline: StudentTimelineRow[];
}

const ABSENCES = [1, 3, 0, 2, 1, 2, 4, 0, 1, 1, 3, 0, 2, 4, 1];
const DELAYS = [2, 1, 0, 3, 0, 1, 2, 0, 1, 0, 2, 1, 0, 3, 0];

function ascii(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function distributeHours(completedHours: number, catchupHours: number): StudentHourRow[] {
  const classroom = Math.round(completedHours * 0.57);
  const driving = Math.round(completedHours * 0.17);
  const internship = Math.round(completedHours * 0.2);
  const presentation = Math.round(completedHours * 0.03);
  const assessment = Math.round(completedHours * 0.02);
  const awareness = Math.max(completedHours - classroom - driving - internship - presentation - assessment, 0);

  return [
    { key: 'classroom', planned: 520, completed: classroom, catchup: 0 },
    { key: 'driving', planned: 160, completed: driving, catchup: 0 },
    { key: 'internship', planned: 175, completed: internship, catchup: 0 },
    { key: 'presentation', planned: 25, completed: presentation, catchup: 0 },
    { key: 'assessment', planned: 20, completed: assessment, catchup: 0 },
    { key: 'awareness', planned: 10, completed: awareness, catchup: 0 },
    { key: 'catchup', planned: catchupHours, completed: 0, catchup: catchupHours },
    { key: 'absence', planned: 0, completed: 0, catchup: 0 },
    { key: 'other', planned: 0, completed: 0, catchup: 0 },
  ];
}

function skillProgress(student: StudentDirectoryItem): Record<'C1' | 'C2' | 'C3' | 'C4', number> {
  return {
    C1: Math.min(100, student.progress + 20),
    C2: student.progress,
    C3: Math.max(10, student.progress - 20),
    C4: Math.max(8, student.progress - 40),
  };
}

function buildAttendance(student: StudentDirectoryItem, index: number): StudentAttendanceRow[] {
  if (student.id === 's1') {
    return [
      { date: '19/09/2026', sessionKey: 'studentDetail.attendance.sessions.pedagogicalDay', status: 'absent', missedHours: '7 h' },
      { date: '16/09/2026', sessionKey: 'studentDetail.attendance.sessions.signageClass', status: 'late', missedHours: '0,5 h' },
      { date: '12/09/2026', sessionKey: 'studentDetail.attendance.sessions.driving', status: 'present', missedHours: '—' },
      { date: '08/09/2026', sessionKey: 'studentDetail.attendance.sessions.sheet30', status: 'present', missedHours: '—' },
    ];
  }

  const hasAbsence = ABSENCES[index] > 0;
  const hasDelay = DELAYS[index] > 0;
  return [
    { date: '20/09/2026', sessionKey: 'studentDetail.attendance.sessions.classroom', status: 'present', missedHours: '—' },
    { date: '18/09/2026', sessionKey: 'studentDetail.attendance.sessions.driving', status: hasDelay ? 'late' : 'present', missedHours: hasDelay ? '0,5 h' : '—' },
    { date: '15/09/2026', sessionKey: 'studentDetail.attendance.sessions.presentation', status: hasAbsence ? 'absent' : 'present', missedHours: hasAbsence ? '4 h' : '—' },
  ];
}

function buildEvaluations(student: StudentDirectoryItem): StudentEvaluationRow[] {
  const mostlyPositive = student.progress >= 65;
  return [
    { date: '18/09/2026', titleKey: 'studentDetail.evaluations.rows.sheet32', resultKey: mostlyPositive ? 'studentDetail.evaluations.results.validated' : 'studentDetail.evaluations.results.rework', tone: mostlyPositive ? 'success' : 'warning', evaluator: 'Claire Berthier' },
    { date: '13/09/2026', titleKey: 'studentDetail.evaluations.rows.drivingC1', resultKey: 'studentDetail.evaluations.results.inProgress', tone: 'warning', evaluator: 'Marc Dupont' },
    { date: '17/07/2026', titleKey: 'studentDetail.evaluations.rows.internshipReview', resultKey: 'studentDetail.evaluations.results.validated', tone: 'success', evaluator: 'Émilie Rocher' },
    { date: '04/06/2026', titleKey: 'studentDetail.evaluations.rows.intermediateC2', resultKey: mostlyPositive ? 'studentDetail.evaluations.results.acquired' : 'studentDetail.evaluations.results.inProgress', tone: mostlyPositive ? 'success' : 'warning', evaluator: 'Sophie Lemaire' },
  ];
}

function buildDocuments(student: StudentDirectoryItem): StudentDocumentRow[] {
  return [
    { id: `${student.id}-d1`, titleKey: 'studentDetail.documents.rows.internshipAgreement', categoryKey: 'documents.categories.internship', date: '28/05/2026', size: '182 Ko' },
    { id: `${student.id}-d2`, titleKey: 'studentDetail.documents.rows.remc', categoryKey: 'documents.categories.pedagogical', date: '01/09/2026', size: '1,4 Mo' },
    { id: `${student.id}-d3`, titleKey: 'studentDetail.documents.rows.drivingGrid', categoryKey: 'documents.categories.evaluation', date: '04/09/2026', size: '96 Ko' },
    { id: `${student.id}-d4`, titleKey: 'studentDetail.documents.rows.intersectionsSupport', categoryKey: 'documents.categories.course', date: '18/09/2026', size: '3,2 Mo' },
    { id: `${student.id}-d5`, titleKey: 'studentDetail.documents.rows.internalRules', categoryKey: 'documents.categories.administrative', date: '25/08/2026', size: '240 Ko' },
  ];
}

function buildTimeline(student: StudentDirectoryItem): StudentTimelineRow[] {
  if (student.id === 's1') {
    return [
      { dateKey: 'studentDetail.timeline.18sep', titleKey: 'studentDetail.timeline.sheet32', detailKey: 'studentDetail.timeline.bends', tone: 'success' },
      { dateKey: 'studentDetail.timeline.19sep', titleKey: 'studentDetail.timeline.absence', detailKey: 'studentDetail.timeline.catchup7', tone: 'danger' },
      { dateKey: 'studentDetail.timeline.20sep', titleKey: 'studentDetail.timeline.driving', detailKey: 'studentDetail.timeline.drivingDetail', tone: 'warning' },
      { dateKey: 'studentDetail.timeline.21sep', titleKey: 'studentDetail.timeline.classroom', detailKey: 'studentDetail.timeline.classroomDetail', tone: 'info' },
    ];
  }

  return [
    { dateKey: 'studentDetail.timeline.18sep', titleKey: 'studentDetail.timeline.presentation', detailKey: 'studentDetail.timeline.presentationDetail', tone: 'success' },
    { dateKey: 'studentDetail.timeline.20sep', titleKey: 'studentDetail.timeline.driving', detailKey: 'studentDetail.timeline.genericDrivingDetail', tone: 'warning' },
    { dateKey: 'studentDetail.timeline.21sep', titleKey: 'studentDetail.timeline.classroom', detailKey: 'studentDetail.timeline.classroomDetail', tone: 'info' },
  ];
}

export const STUDENT_DETAIL_TABS: { id: StudentDetailTab; labelKey: string }[] = [
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

export function studentDetailById(id: string): StudentDetailProfile | undefined {
  const index = STUDENT_DIRECTORY.findIndex((item) => item.id === id);
  if (index < 0) return undefined;

  const student = STUDENT_DIRECTORY[index];
  const isCurrentPromotion = student.promotionId === 'p1';
  return {
    ...student,
    email: `${ascii(student.firstName)}.${ascii(student.lastName)}@stagiaire.fr`,
    startDate: isCurrentPromotion ? '01/09/2026' : '02/09/2025',
    expectedEndDate: isCurrentPromotion ? '30/06/2027' : '26/06/2026',
    plannedHours: 910,
    absences: ABSENCES[index] ?? 0,
    delays: DELAYS[index] ?? 0,
    reworkSheets: student.id === 's1' ? 6 : Math.max(1, Math.round(student.preparedSheets * 0.16)),
    skills: skillProgress(student),
    hours: distributeHours(student.completedHours, student.catchupHours),
    attendance: buildAttendance(student, index),
    evaluations: buildEvaluations(student),
    documents: buildDocuments(student),
    timeline: buildTimeline(student),
  };
}

export function studentSheets(id: string) {
  const student = STUDENT_DIRECTORY.find((item) => item.id === id);
  return student ? sheetsFor(student) : [];
}

export function studentDrivingHistory(id: string) {
  return DRIVING_HISTORY.filter((item) => item.studentId === id);
}

export function studentInternships(id: string) {
  return INTERNSHIP_PERIODS.filter((item) => item.studentId === id);
}

export function studentAuditHistory(id: string) {
  if (id === 's1') return AUDIT_LOG.slice(0, 2);
  if (id === 's2') return AUDIT_LOG.filter((item) => item.id === 'a3' || item.id === 'a4');
  return AUDIT_LOG.slice(0, 1);
}

export function statusTone(status: StudentStatus): 'success' | 'warning' | 'danger' {
  return status === 'good' ? 'success' : status === 'warning' ? 'warning' : 'danger';
}
