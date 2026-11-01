export const environment = {
  production: false,
  apiBaseUrl: "https://localhost:6001",
  authGateBaseUrl: "https://localhost:8081",
  authGateClientId: "pedagora-pilot-web",
  // La bascule exige un service Angular OIDC et une API qui valide cette audience.
  authMode: "legacy" as "legacy" | "oidc",
 // authMode: 'oidc' as 'legacy' | 'oidc',
  oidc: {
    authority: "https://localhost:8081/",
    clientId: "pedagora-pilot-web",
    redirectUri: "http://localhost:5200/auth/callback",
    scope: "openid profile email",
    responseType: "code",
    usePkce: true,
    apiAudience: "api://pedagora-pilot",
  },
  demoLoginEnabled: false,
  /** BE-11: the real API is now authoritative. Legacy mock fallback is disabled. */
  allowLegacyMockFallback: false,
} as const;
