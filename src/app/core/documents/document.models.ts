export type ApiDocumentCategory =
  | "administrative"
  | "pedagogical"
  | "evaluation"
  | "course"
  | "internship"
  | "student"
  | "certification"
  | "other";

export type ApiDocumentVisibility = "all" | "staff" | "student";

export interface DocumentVersionDto {
  id: string;
  versionNumber: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  blobAvailable: boolean;
  securityStatus: string;
  uploadedByDisplayName: string;
  uploadedAtUtc: string;
}

export interface DocumentDto {
  id: string;
  organizationId: string;
  siteId?: string | null;
  programId?: string | null;
  cohortId?: string | null;
  ownerType: string;
  ownerId?: string | null;
  title: string;
  description?: string | null;
  category: ApiDocumentCategory;
  visibility: ApiDocumentVisibility;
  status: string;
  createdByDisplayName: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  versions: DocumentVersionDto[];
}
