export type RemoteWorkStatus = "requested" | "approved" | "rejected" | "completed";
export type RemoteWorkPeriod = "full-day" | "morning" | "afternoon" | "custom";
export type RemoteActivityStatus = "todo" | "in-progress" | "done";
export type WorkMode = "onsite" | "remote" | "field" | "travel" | "leave" | "absence";

export interface RemoteWorkPolicy {
  enabled: boolean;
  approvalRequired: boolean;
  maxDaysPerWeek: number;
  halfDayAllowed: boolean;
  endOfDayReport: boolean;
}

export interface RemoteWorkRequest {
  id: string;
  userId: string;
  userName: string;
  roleKey: string;
  siteId: string;
  date: string;
  period: RemoteWorkPeriod;
  startTime: string;
  endTime: string;
  status: RemoteWorkStatus;
  activityCount: number;
  completedActivities: number;
  comment?: string;
  approver?: string;
}

export interface RemoteWorkActivity {
  id: string;
  requestId: string;
  titleKey: string;
  typeKey: string;
  relatedType?: "sheet" | "student" | "session" | "document";
  relatedLabel?: string;
  status: RemoteActivityStatus;
}

export interface TeamWorkModeDay {
  userId: string;
  userName: string;
  roleKey: string;
  siteId: string;
  monday: WorkMode;
  tuesday: WorkMode;
  wednesday: WorkMode;
  thursday: WorkMode;
  friday: WorkMode;
}

export const REMOTE_WORK_POLICY: RemoteWorkPolicy = {
  enabled: true,
  approvalRequired: true,
  maxDaysPerWeek: 2,
  halfDayAllowed: true,
  endOfDayReport: true,
};

export const REMOTE_WORK_REQUESTS: RemoteWorkRequest[] = [
  { id: "rw-1", userId: "u3", userName: "Marc Dupont", roleKey: "common.roles.formateur", siteId: "site-aftral-nice", date: "2026-09-24", period: "full-day", startTime: "08:30", endTime: "17:00", status: "approved", activityCount: 4, completedActivities: 2, comment: "Préparation pédagogique et suivi des stagiaires.", approver: "Claire Berthier" },
  { id: "rw-2", userId: "u2", userName: "Nadia Lambert", roleKey: "common.roles.secretariat", siteId: "site-aftral-nice", date: "2026-09-24", period: "morning", startTime: "08:30", endTime: "12:30", status: "approved", activityCount: 3, completedActivities: 3, approver: "Claire Berthier" },
  { id: "rw-3", userId: "u4", userName: "Sophie Martin", roleKey: "common.roles.formateur", siteId: "site-aftral-marseille", date: "2026-09-24", period: "full-day", startTime: "09:00", endTime: "17:30", status: "requested", activityCount: 4, completedActivities: 0, comment: "Préparation des évaluations et cours à distance." },
  { id: "rw-4", userId: "u3", userName: "Marc Dupont", roleKey: "common.roles.formateur", siteId: "site-aftral-nice", date: "2026-09-17", period: "full-day", startTime: "08:30", endTime: "17:00", status: "completed", activityCount: 4, completedActivities: 4, approver: "Claire Berthier" },
  { id: "rw-5", userId: "u3", userName: "Marc Dupont", roleKey: "common.roles.formateur", siteId: "site-aftral-nice", date: "2026-09-10", period: "full-day", startTime: "08:30", endTime: "17:00", status: "completed", activityCount: 3, completedActivities: 3, approver: "Claire Berthier" },
  { id: "rw-6", userId: "u2", userName: "Nadia Lambert", roleKey: "common.roles.secretariat", siteId: "site-aftral-nice", date: "2026-09-22", period: "afternoon", startTime: "13:30", endTime: "17:30", status: "completed", activityCount: 2, completedActivities: 2, approver: "Claire Berthier" },
];

export const REMOTE_WORK_ACTIVITIES: RemoteWorkActivity[] = [
  { id: "rwa-1", requestId: "rw-1", titleKey: "remoteWork.activities.prepareCourse", typeKey: "remoteWork.activityTypes.preparation", relatedType: "sheet", relatedLabel: "Fiche 21 — Distances", status: "done" },
  { id: "rwa-2", requestId: "rw-1", titleKey: "remoteWork.activities.correctSheets", typeKey: "remoteWork.activityTypes.correction", relatedType: "sheet", relatedLabel: "Fiches 21 et 32", status: "done" },
  { id: "rwa-3", requestId: "rw-1", titleKey: "remoteWork.activities.studentFollowUp", typeKey: "remoteWork.activityTypes.followUp", relatedType: "student", relatedLabel: "Julie Moreau", status: "in-progress" },
  { id: "rwa-4", requestId: "rw-1", titleKey: "remoteWork.activities.remoteMeeting", typeKey: "remoteWork.activityTypes.meeting", relatedType: "session", relatedLabel: "Réunion pédagogique · 15:00", status: "todo" },
];

export const TEAM_WORK_MODE_WEEK: TeamWorkModeDay[] = [
  { userId: "u3", userName: "Marc Dupont", roleKey: "common.roles.formateur", siteId: "site-aftral-nice", monday: "onsite", tuesday: "onsite", wednesday: "field", thursday: "remote", friday: "onsite" },
  { userId: "u2", userName: "Nadia Lambert", roleKey: "common.roles.secretariat", siteId: "site-aftral-nice", monday: "onsite", tuesday: "remote", wednesday: "onsite", thursday: "remote", friday: "onsite" },
  { userId: "u5", userName: "Yanis Morel", roleKey: "common.roles.formateur", siteId: "site-aftral-nice", monday: "field", tuesday: "onsite", wednesday: "onsite", thursday: "onsite", friday: "field" },
  { userId: "u6", userName: "Élodie Garnier", roleKey: "common.roles.formateur", siteId: "site-aftral-nice", monday: "onsite", tuesday: "onsite", wednesday: "remote", thursday: "onsite", friday: "onsite" },
  { userId: "u7", userName: "Thomas Leroy", roleKey: "common.roles.formateur", siteId: "site-aftral-nice", monday: "onsite", tuesday: "travel", wednesday: "travel", thursday: "onsite", friday: "onsite" },
];
