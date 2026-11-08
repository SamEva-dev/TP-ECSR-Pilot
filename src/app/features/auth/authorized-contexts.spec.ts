import type { AuthGateMembership } from "../../core/session/auth-gate.service";
import { authorizedPedagoraContexts } from "./authorized-contexts";

const membership = (organizationId: string, applicationCode = "pedagora-pilot",
  initialRole = "Trainer"): AuthGateMembership => ({ organizationId, applicationCode, initialRole });
const org = (organizationId: string, name = "Centre de formation") => ({ organizationId, name });

describe("workspace selection — authorization intersection", () => {
  it("shows only the invited organization when a user has never registered their own", () => {
    const actual = authorizedPedagoraContexts(
      [membership("old-inactive"), membership("invited-active")],
      [org("invited-active", "Centre invitant")],
    );
    expect(actual.contexts.map(x => x.organizationId)).toEqual(["invited-active"]);
    expect(actual.names["invited-active"]).toBe("Centre invitant");
  });

  it("preserves an owned organization from Register alongside two active invitations", () => {
    const auth = [membership("registered", "pedagora-pilot", "OrganizationAdministrator"),
      membership("invite-one"), membership("invite-two")];
    expect(authorizedPedagoraContexts(auth,
      [org("registered"), org("invite-one"), org("invite-two")]
    ).contexts.map(x => x.organizationId)).toEqual(["registered", "invite-one", "invite-two"]);
  });

  it("excludes revoked local access even if AuthGate still offers the tenant", () => {
    expect(authorizedPedagoraContexts([membership("revoked")], []).contexts).toEqual([]);
  });

  it("excludes unrelated applications and duplicate memberships", () => {
    expect(authorizedPedagoraContexts(
      [membership("a", "locaguest"), membership("a"), membership("a")], [org("a")]
    ).contexts).toHaveSize(1);
  });

  it("matches identifiers case insensitively and rejects empty names", () => {
    const result = authorizedPedagoraContexts(
      [membership("ABC", "Pedagora-Pilot"), membership("blank")],
      [org("abc", " Centre ECSR "), org("blank", " ")],
    );
    expect(result.contexts.map(x => x.organizationId)).toEqual(["ABC"]);
    expect(result.names["ABC"]).toBe("Centre ECSR");
  });
});
