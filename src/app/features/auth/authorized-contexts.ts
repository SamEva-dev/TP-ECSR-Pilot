import type { AuthGateMembership } from "../../core/session/auth-gate.service";

/**
 * AuthGate issues identities and scoped access. PedagoraPilot is the authority
 * for active product memberships and owner organizations created by Register.
 * Both must agree; a display-name cache or a stale AuthGate grant is insufficient.
 */
export function authorizedPedagoraContexts(
  authGate: readonly AuthGateMembership[],
  localOrganizations: readonly { organizationId: string; name: string }[],
): { contexts: AuthGateMembership[]; names: Record<string, string> } {
  const permitted = new Map<string, string>();
  for (const org of localOrganizations) {
    const id = org.organizationId?.trim().toLowerCase();
    if (id && org.name?.trim()) permitted.set(id, org.name.trim());
  }
  const seen = new Set<string>();
  const contexts: AuthGateMembership[] = [];
  const names: Record<string, string> = {};
  for (const membership of authGate) {
    const id = membership.organizationId?.trim().toLowerCase();
    if (!id || membership.applicationCode?.trim().toLowerCase() !== "pedagora-pilot"
      || !permitted.has(id) || seen.has(id)) continue;
    seen.add(id);
    contexts.push(membership);
    names[membership.organizationId] = permitted.get(id)!;
  }
  return { contexts, names };
}
