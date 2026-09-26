export interface AuditLogItem {
  id: string;
  dateTime: string;
  author: string;
  actionKey: string;
  oldValue: string;
  newValue: string;
  reasonKey: string;
}

export const AUDIT_LOG: AuditLogItem[] = [
  { id: 'a1', dateTime: '21/09/2026 - 14:32', author: 'Marc Dupont', actionKey: 'reports.audit.actions.samHours', oldValue: '7 h', newValue: '6 h', reasonKey: 'reports.audit.reasons.inputError' },
  { id: 'a2', dateTime: '21/09/2026 - 11:05', author: 'Claire Berthier', actionKey: 'reports.audit.actions.sheet32Validated', oldValue: '—', newValue: 'Validée', reasonKey: 'reports.audit.reasons.compliantPresentation' },
  { id: 'a3', dateTime: '20/09/2026 - 17:48', author: 'Secrétariat', actionKey: 'reports.audit.actions.julieAbsence', oldValue: 'Absence', newValue: 'Excusée', reasonKey: 'reports.audit.reasons.medicalCertificate' },
  { id: 'a4', dateTime: '19/09/2026 - 09:12', author: 'Sophie Lemaire', actionKey: 'reports.audit.actions.julieDriving', oldValue: '—', newValue: '20/09 10:00–12:00', reasonKey: 'reports.audit.reasons.none' },
  { id: 'a5', dateTime: '18/09/2026 - 16:20', author: 'Direction', actionKey: 'reports.audit.actions.awaPromotion', oldValue: '—', newValue: '—', reasonKey: 'reports.audit.reasons.none' },
];
