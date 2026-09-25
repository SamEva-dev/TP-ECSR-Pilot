import { Injectable, computed, inject } from "@angular/core";
import { WorkspaceContextService } from "./workspace-context.service";
import type { StudentDirectoryItem } from "../models/students.models";
import type { TrainingReferential } from "../models/referentials.models";
import type { PlanningEvent } from "../models/planning.models";
import type { ProgrammedSession } from "../models/sessions.models";
import type { AttendanceStudent } from "../models/attendance.models";
import type { InternshipPeriod } from "../models/internships.models";
import type {
  CertificationCandidate,
  ExamSession,
} from "../models/certification.models";
import type { DrivingHistoryItem } from "../models/driving.models";
import type { ProgramModule } from "../models/workspace.models";
import {
  ATTENDANCE_STUDENTS,
  CERTIFICATION_CANDIDATES,
  DEFAULT_SHEET_CATALOG,
  DRIVING_HISTORY,
  DRIVING_PROGRAMMED,
  INTERNSHIP_PERIODS,
  PLANNING_EVENTS,
  PROGRAMMED_SESSIONS,
  STUDENT_DIRECTORY,
  TRAINING_REFERENTIALS,
  certificationSchemeForProgram,
  juryMembersForProgram,
  EXAM_SESSIONS,
} from "../api-data/runtime-data.store";

@Injectable({ providedIn: "root" })
export class ContextualTrainingDataService {
  readonly workspace = inject(WorkspaceContextService);
  readonly cohort = this.workspace.cohort;
  readonly program = this.workspace.program;
  readonly site = this.workspace.site;
  readonly organization = this.workspace.organization;

  readonly referential = computed<TrainingReferential | null>(() => {
    const cohort = this.cohort();
    const program = this.program();
    if (!program) return null;
    return (
      TRAINING_REFERENTIALS.find(
        (x: any) =>
          x.apiId === cohort?.referentialVersionId ||
          x.id === cohort?.referentialVersionId,
      ) ??
      TRAINING_REFERENTIALS.find(
        (x: any) => x.programId === program.id && x.status === "active",
      ) ??
      TRAINING_REFERENTIALS.find((x: any) => x.programId === program.id) ??
      null
    );
  });
  readonly activeCohortId = computed(() => this.cohort()?.id ?? "");
  readonly activeLegacyPromotionId = this.activeCohortId;
  readonly activeCohortName = computed(() => this.cohort()?.name ?? "");
  readonly isEcsr = computed(
    () => this.program()?.code?.toUpperCase() === "ECSR",
  );
  readonly certificationScheme = computed(() =>
    certificationSchemeForProgram(this.program()?.id ?? ""),
  );
  readonly juryMembers = computed(() =>
    juryMembersForProgram(this.program()?.id ?? ""),
  );
  readonly students = computed<StudentDirectoryItem[]>(() => {
    const cohort = this.cohort();
    if (!cohort) return [];
    return STUDENT_DIRECTORY.filter((x: any) => x.promotionId === cohort.id);
  });
  readonly planningEvents = computed<PlanningEvent[]>(() =>
    PLANNING_EVENTS.filter(
      (x: any) =>
        !this.cohort() || !x.promotionId || x.promotionId === this.cohort()?.id,
    ),
  );
  readonly drivingProgrammed = computed<PlanningEvent[]>(() =>
    DRIVING_PROGRAMMED.filter(
      (x: any) =>
        !this.cohort() || !x.promotionId || x.promotionId === this.cohort()?.id,
    ),
  );
  readonly programmedSessions = computed<ProgrammedSession[]>(() =>
    PROGRAMMED_SESSIONS.filter(
      (x: any) =>
        !this.cohort() || !x.promotionId || x.promotionId === this.cohort()?.id,
    ),
  );
  readonly attendanceStudents = computed<AttendanceStudent[]>(
    () => ATTENDANCE_STUDENTS,
  );
  readonly internships = computed<InternshipPeriod[]>(() => INTERNSHIP_PERIODS);
  readonly certificationCandidates = computed<CertificationCandidate[]>(
    () => CERTIFICATION_CANDIDATES,
  );
  readonly examSession = computed<ExamSession>(
    () =>
      EXAM_SESSIONS[0] ??
      ({
        id: "",
        name: "",
        promotionId: this.cohort()?.id ?? "",
        promotionName: this.cohort()?.name ?? "",
        centre: "",
        location: "",
        candidateIds: [],
        juryIds: [],
        programId: this.program()?.id,
        schemeId: this.certificationScheme()?.id,
      } as any),
  );
  readonly drivingHistory = computed<DrivingHistoryItem[]>(
    () => DRIVING_HISTORY,
  );
  readonly sheetCatalog = computed(() => DEFAULT_SHEET_CATALOG);
  moduleEnabled(module: ProgramModule): boolean {
    const r = this.referential() as any;
    const p = this.program();
    return Boolean(
      (r?.enabledModules ?? p?.enabledModules ?? []).includes(module),
    );
  }
  vehicleLabels(): string[] {
    return [];
  }
}
