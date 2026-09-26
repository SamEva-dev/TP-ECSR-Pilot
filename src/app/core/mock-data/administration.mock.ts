export interface AdminUserSummary {
  id: string;
  initials: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AccessRoleSummary {
  role: 'direction' | 'formateur' | 'stagiaire' | 'secretariat';
  icon: string;
  tone: 'blue' | 'green' | 'amber';
  descriptionKey: string;
}

export interface HourCategory {
  key: string;
  labelKey: string;
}

export interface RecentAdminAction {
  id: string;
  titleKey: string;
  metaKey: string;
}

export const ADMIN_USERS: AdminUserSummary[] = [
  { id: 'u1', initials: 'MD', firstName: 'Marc', lastName: 'Dupont', email: 'm.dupont@tpecsrpilot.fr' },
  { id: 'u2', initials: 'CB', firstName: 'Claire', lastName: 'Berthier', email: 'c.berthier@tpecsrpilot.fr' },
  { id: 'u3', initials: 'YM', firstName: 'Yanis', lastName: 'Morel', email: 'y.morel@tpecsrpilot.fr' },
  { id: 'u4', initials: 'SL', firstName: 'Sophie', lastName: 'Lemaire', email: 's.lemaire@tpecsrpilot.fr' },
  { id: 'u5', initials: 'IT', firstName: 'Ibrahim', lastName: 'Traoré', email: 'i.traore@tpecsrpilot.fr' },
];

export const HOUR_CATEGORIES: HourCategory[] = [
  { key: 'classroom', labelKey: 'administration.hours.classroom' },
  { key: 'driving', labelKey: 'administration.hours.driving' },
  { key: 'internship', labelKey: 'administration.hours.internship' },
  { key: 'presentation', labelKey: 'administration.hours.presentation' },
  { key: 'assessment', labelKey: 'administration.hours.assessment' },
  { key: 'awareness', labelKey: 'administration.hours.awareness' },
  { key: 'catchup', labelKey: 'administration.hours.catchup' },
  { key: 'absence', labelKey: 'administration.hours.absence' },
  { key: 'other', labelKey: 'administration.hours.other' },
];

export const ACCESS_ROLE_SUMMARIES: AccessRoleSummary[] = [
  { role: 'direction', icon: 'ph-users-three', tone: 'blue', descriptionKey: 'administration.access.direction' },
  { role: 'formateur', icon: 'ph-users-three', tone: 'blue', descriptionKey: 'administration.access.formateur' },
  { role: 'stagiaire', icon: 'ph-users-three', tone: 'green', descriptionKey: 'administration.access.stagiaire' },
  { role: 'secretariat', icon: 'ph-users-three', tone: 'amber', descriptionKey: 'administration.access.secretariat' },
];

export const RECENT_ADMIN_ACTIONS: RecentAdminAction[] = [
  { id: 'r1', titleKey: 'administration.recent.samHours.title', metaKey: 'administration.recent.samHours.meta' },
  { id: 'r2', titleKey: 'administration.recent.sheet32.title', metaKey: 'administration.recent.sheet32.meta' },
];
