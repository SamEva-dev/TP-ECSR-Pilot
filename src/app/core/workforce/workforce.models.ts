export interface RemoteWorkActivityApi {
  id: string;
  code: string;
  label: string;
  status: string;
}
export interface RemoteWorkRequestApi {
  id: string;
  organizationId: string;
  siteId: string;
  authGateUserId: string;
  userDisplayName: string;
  userEmail?: string | null;
  date: string;
  period: string;
  startTime?: string | null;
  endTime?: string | null;
  status: string;
  comment?: string | null;
  approverUserId?: string | null;
  approverDisplayName?: string | null;
  decidedAtUtc?: string | null;
  activities: RemoteWorkActivityApi[];
}
