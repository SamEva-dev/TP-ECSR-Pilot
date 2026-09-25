import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import {
  StudentProfileApiService,
  type LearnerProfileApi,
  type CompetencyDefinitionApi,
  type CompetencyProgressApi,
  type CohortCompetencyRowApi,
  type DrivingEvaluationApi,
} from "../../core/students/student-profile-api.service";

interface SkillGroup {
  definition: CompetencyDefinitionApi;
  criteria: CompetencyDefinitionApi[];
}

@Component({
  selector: "app-skills",
  imports: [TranslatePipe],
  templateUrl: "./skills.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsComponent {
  readonly session = inject(SessionService);
  readonly workspace = inject(WorkspaceContextService);
  private readonly api = inject(StudentProfileApiService);
  readonly isStudent = computed(() => this.session.role() === "stagiaire");
  readonly profile = signal<LearnerProfileApi | null>(null);
  readonly matrix = signal<CohortCompetencyRowApi[]>([]);
  readonly definitions = signal<CompetencyDefinitionApi[]>([]);
  readonly selectedEnrollmentId = signal("");
  readonly selectedDefinitionId = signal("");
  readonly driving = signal<DrivingEvaluationApi[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly drivingLoading = signal(false);
  readonly drivingError = signal(false);
  readonly definitionsError = signal(false);
  readonly selectedStudent = computed(
    () =>
      this.matrix().find(
        (x) => x.enrollmentId === this.selectedEnrollmentId(),
      ) ?? null,
  );
  readonly selectedProgress = computed(
    () => this.selectedStudent()?.competencies ?? [],
  );
  readonly progressIndex = computed(
    () =>
      new Map<string, Map<string, CompetencyProgressApi>>(
        this.matrix().map(
          (student) =>
            [
              student.enrollmentId,
              new Map<string, CompetencyProgressApi>(
                student.competencies.map(
                  (item) => [item.competencyDefinitionId, item] as const,
                ),
              ),
            ] as const,
        ),
      ),
  );
  readonly groups = computed<SkillGroup[]>(() => {
    const definitions = this.definitions();
    if (!definitions.length) {
      return this.selectedProgress().map((item) => ({
        definition: {
          id: item.competencyDefinitionId,
          parentId: null,
          code: item.code,
          title: item.title,
          kind: "",
          sortOrder: 0,
          active: true,
        },
        criteria: [],
      }));
    }
    const ids = new Set(definitions.map((x) => x.id));
    const children = new Map<string, CompetencyDefinitionApi[]>();
    for (const definition of definitions) {
      if (!definition.parentId) continue;
      const existing = children.get(definition.parentId) ?? [];
      existing.push(definition);
      children.set(definition.parentId, existing);
    }
    return definitions
      .filter((x) => !x.parentId || !ids.has(x.parentId))
      .map((definition) => ({
        definition,
        criteria: children.get(definition.id) ?? [],
      }));
  });
  readonly selectedGroup = computed(
    () =>
      this.groups().find(
        (x) => x.definition.id === this.selectedDefinitionId(),
      ) ??
      this.groups()[0] ??
      null,
  );
  readonly linkedDriving = computed(() => {
    const group = this.selectedGroup();
    if (!group) return [];
    const ids = new Set([
      group.definition.id,
      ...group.criteria.map((x) => x.id),
    ]);
    return this.driving().filter((item) =>
      ids.has(item.competencyDefinitionId),
    );
  });
  private generation = 0;
  private drivingGeneration = 0;

  constructor() {
    effect((onCleanup) => {
      const user = this.session.session();
      const cohort = this.workspace.cohort();
      const loaded = this.workspace.remoteWorkspaceLoaded();
      const generation = ++this.generation;
      this.profile.set(null);
      this.matrix.set([]);
      this.definitions.set([]);
      this.selectedEnrollmentId.set("");
      this.selectedDefinitionId.set("");
      this.loading.set(false);
      this.error.set(false);
      this.definitionsError.set(false);
      if (user && loaded) {
        this.loading.set(true);
        if (user.role === "stagiaire") void this.loadSelf(generation);
        else if (cohort?.apiId)
          void this.loadCohort(
            cohort.apiId,
            cohort.referentialVersionId ?? "",
            generation,
          );
        else this.loading.set(false);
      }
      onCleanup(() => {
        this.generation++;
      });
    });
    effect((onCleanup) => {
      const id = this.selectedEnrollmentId();
      const generation = ++this.drivingGeneration;
      this.driving.set([]);
      this.drivingLoading.set(false);
      this.drivingError.set(false);
      if (id) {
        this.drivingLoading.set(true);
        void this.loadDriving(id, generation);
      }
      onCleanup(() => {
        this.drivingGeneration++;
      });
    });
  }

  private async loadSelf(generation: number): Promise<void> {
    try {
      const profile = await firstValueFrom(this.api.self());
      const rows = await firstValueFrom(
        this.api.competencies(profile.enrollmentId),
      );
      if (generation !== this.generation) return;
      this.profile.set(profile);
      this.matrix.set([
        {
          enrollmentId: profile.enrollmentId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          competencies: rows,
        },
      ]);
      this.selectedEnrollmentId.set(profile.enrollmentId);
      const version = this.workspace.cohortReferentialVersionByApiId(
        profile.cohortId,
      );
      if (version) await this.loadDefinitions(version, generation);
      else this.definitionsError.set(true);
    } catch {
      if (generation === this.generation) this.error.set(true);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  private async loadCohort(
    cohortId: string,
    version: string,
    generation: number,
  ): Promise<void> {
    try {
      const rows = await firstValueFrom(this.api.cohortCompetencies(cohortId));
      if (generation !== this.generation) return;
      this.matrix.set(rows);
      this.selectedEnrollmentId.set(rows[0]?.enrollmentId ?? "");
      if (version) await this.loadDefinitions(version, generation);
      else this.definitionsError.set(true);
    } catch {
      if (generation === this.generation) this.error.set(true);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  private async loadDefinitions(
    version: string,
    generation: number,
  ): Promise<void> {
    try {
      const definitions = await firstValueFrom(
        this.api.competencyDefinitions(version),
      );
      if (generation === this.generation) this.definitions.set(definitions);
    } catch {
      if (generation === this.generation) this.definitionsError.set(true);
    }
  }

  private async loadDriving(
    enrollmentId: string,
    generation: number,
  ): Promise<void> {
    try {
      const records = await firstValueFrom(this.api.driving(enrollmentId));
      if (generation === this.drivingGeneration) this.driving.set(records);
    } catch {
      if (generation === this.drivingGeneration) this.drivingError.set(true);
    } finally {
      if (generation === this.drivingGeneration) this.drivingLoading.set(false);
    }
  }

  selectSkill(id: string): void {
    this.selectedDefinitionId.set(id);
  }
  updateStudent(event: Event): void {
    this.selectedEnrollmentId.set((event.target as HTMLSelectElement).value);
  }
  isSelectedGroup(definitionId: string): boolean {
    return this.selectedGroup()?.definition?.id === definitionId;
  }

  progressFor(
    definitionId: string,
    enrollmentId = this.selectedEnrollmentId(),
  ): CompetencyProgressApi | null {
    return this.progressIndex().get(enrollmentId)?.get(definitionId) ?? null;
  }

  levelKey(level: string | undefined): string {
    const normalized = level?.toLowerCase() ?? "";
    return ["acquired", "in_progress", "rework", "not_assessed"].includes(
      normalized,
    )
      ? "skills.real.level." + normalized
      : "skills.real.level.not_assessed";
  }
  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date);
  }
}
