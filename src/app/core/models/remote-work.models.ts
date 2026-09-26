export type RemoteWorkStatus = "requested" | "approved" | "rejected" | "completed" | "cancelled";
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
  comment: string;
  approver: string;
}

export interface RemoteWorkActivity {
  id: string;
  requestId: string;
  titleKey: string;
  typeKey: string;
  relatedType?: "sheet" | "student" | "session" | "document";
  relatedLabel: string;
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
