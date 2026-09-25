import { Injectable, computed, inject, signal } from "@angular/core";
import { AccessPolicyService } from "../access/access-policy.service";
import { ATTENTION_MOCK_ITEMS } from "../api-data/runtime-data.store";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

const STORAGE_KEY = "tp-ecsr-pilot.attention-read";

@Injectable({ providedIn: "root" })
export class AttentionService {
  private readonly access = inject(AccessPolicyService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly readIds = signal<Set<string>>(this.restore());

  readonly items = computed(() => {
    const roles = this.access.effectiveRoles();
    const programId = this.workspace.selection().programId;
    const cohortId = this.workspace.selection().cohortId;

    return ATTENTION_MOCK_ITEMS.filter((item) => {
      if (!item.audiences.some((role) => roles.includes(role))) return false;
      if (item.programIds && !item.programIds.includes(programId)) return false;
      if (item.cohortIds && !item.cohortIds.includes(cohortId)) return false;
      return this.access.can(item.permission);
    }).map((item) => ({
      ...item,
      read: this.readIds().has(this.contextualId(item.id)),
    }));
  });

  readonly unreadCount = computed(
    () => this.items().filter((item) => !item.read).length,
  );

  markRead(id: string): void {
    const contextualId = this.contextualId(id);
    if (this.readIds().has(contextualId)) return;
    const next = new Set<string>(this.readIds());
    next.add(contextualId);
    this.readIds.set(next);
    this.persist(next);
  }

  markAllRead(): void {
    const next = new Set<string>(this.readIds());
    this.items().forEach((item) => next.add(this.contextualId(item.id)));
    this.readIds.set(next);
    this.persist(next);
  }

  private contextualId(id: string): string {
    const selection = this.workspace.selection();
    return `${id}:${selection.organizationId}:${selection.siteId}:${selection.programId}:${selection.cohortId}`;
  }

  private persist(ids: Set<string>): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  }

  private restore(): Set<string> {
    if (typeof localStorage === "undefined") return new Set<string>();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<string>();
    try {
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return new Set<string>();
    }
  }
}
