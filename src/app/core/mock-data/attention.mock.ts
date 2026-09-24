import type { AppPermission } from "../access/access.models";
import type { MembershipRole } from "../models/workspace.models";

export type AttentionLevel = "info" | "warning" | "danger";

export interface AttentionMockItem {
  id: string;
  audiences: MembershipRole[];
  titleKey: string;
  detailKey: string;
  level: AttentionLevel;
  icon: string;
  path: string;
  permission: AppPermission;
  programIds?: string[];
  cohortIds?: string[];
}

export const ATTENTION_MOCK_ITEMS: AttentionMockItem[] = [
  {
    id: "direction-remote-work",
    audiences: ["platform_admin", "organization_admin", "organization_direction", "site_direction"],
    titleKey: "attention.items.remoteWork.title",
    detailKey: "attention.items.remoteWork.detail",
    level: "warning",
    icon: "ph-house-line",
    path: "/teletravail",
    permission: "remoteWork.view",
  },
  {
    id: "direction-certification",
    audiences: ["platform_admin", "organization_admin", "organization_direction", "site_direction", "pedagogical_manager"],
    titleKey: "attention.items.certification.title",
    detailKey: "attention.items.certification.detail",
    level: "danger",
    icon: "ph-certificate",
    path: "/certification",
    permission: "certification.view",
  },
  {
    id: "trainer-sheets",
    audiences: ["trainer", "pedagogical_manager"],
    titleKey: "attention.items.sheets.title",
    detailKey: "attention.items.sheets.detail",
    level: "warning",
    icon: "ph-presentation-chart",
    path: "/fiches",
    permission: "sheets.view",
    programIds: ["program-ecsr"],
  },
  {
    id: "trainer-distance-learning",
    audiences: ["trainer", "pedagogical_manager"],
    titleKey: "attention.items.distanceLearningTrainer.title",
    detailKey: "attention.items.distanceLearningTrainer.detail",
    level: "info",
    icon: "ph-video-camera",
    path: "/distanciel",
    permission: "distanceLearning.view",
  },
  {
    id: "secretariat-attendance",
    audiences: ["secretariat"],
    titleKey: "attention.items.attendance.title",
    detailKey: "attention.items.attendance.detail",
    level: "warning",
    icon: "ph-clipboard-text",
    path: "/presences",
    permission: "attendance.view",
  },
  {
    id: "secretariat-documents",
    audiences: ["secretariat"],
    titleKey: "attention.items.documents.title",
    detailKey: "attention.items.documents.detail",
    level: "danger",
    icon: "ph-folder-open",
    path: "/documents",
    permission: "documents.view",
  },
  {
    id: "student-distance-learning",
    audiences: ["student"],
    titleKey: "attention.items.distanceLearningStudent.title",
    detailKey: "attention.items.distanceLearningStudent.detail",
    level: "warning",
    icon: "ph-video-camera",
    path: "/distanciel",
    permission: "distanceLearning.view",
  },
  {
    id: "student-sheet",
    audiences: ["student"],
    titleKey: "attention.items.studentSheet.title",
    detailKey: "attention.items.studentSheet.detail",
    level: "info",
    icon: "ph-presentation-chart",
    path: "/fiches",
    permission: "sheets.view",
    programIds: ["program-ecsr"],
  },
  {
    id: "jury-candidates",
    audiences: ["jury"],
    titleKey: "attention.items.jury.title",
    detailKey: "attention.items.jury.detail",
    level: "info",
    icon: "ph-gavel",
    path: "/jury",
    permission: "jury.view",
  },
];
