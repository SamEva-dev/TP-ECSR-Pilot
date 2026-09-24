// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export interface AuditLogItem {
  id: string;
  dateTime: string;
  author: string;
  actionKey: string;
  oldValue: string;
  newValue: string;
  reasonKey: string;
}
