export type UserRole =
  "direction" | "formateur" | "stagiaire" | "secretariat" | "jury";
export type StudentStatus = "good" | "warning" | "late";
export type AlertLevel = "danger" | "warning" | "info";
export type SessionType = "driving" | "classroom" | "presentation" | "catchup";

export interface DemoSession {
  role: UserRole;
  firstName: string;
  lastName: string;
  promotionId: string;
  email: string;
  studentId?: string;
  trainerId?: string;
  juryId?: string;
  organisation?: string;
}
export interface Promotion {
  id: string;
  name: string;
  start: string;
  end: string;
  plannedHours: number;
}
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  promotionId: string;
  progress: number;
  plannedHours: number;
  completedHours: number;
  catchupHours: number;
  preparedSheets: number;
  validatedSheets: number;
  status: StudentStatus;
  skills: Record<"C1" | "C2" | "C3" | "C4", number>;
}
export interface AlertItem {
  id: string;
  level: AlertLevel;
  titleKey: string;
  detailKey: string;
}
export interface TrainerAgendaItem {
  time: string;
  target: string;
  subjectKey: string;
  type: SessionType;
}
export interface DrivingObservation {
  id: string;
  studentName: string;
  date: string;
  competence: string;
  subjectKey: string;
  positiveKey: string;
  workOnKey: string;
  nextGoalKey: string;
}
export interface TimelineItem {
  dateKey: string;
  titleKey: string;
  detailKey: string;
  status: "valid" | "absence" | "driving" | "classroom";
}
