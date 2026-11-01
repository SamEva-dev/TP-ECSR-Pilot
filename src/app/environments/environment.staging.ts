export const environment = {
  production: false,
  apiBaseUrl: "https://pedagora.api.staging.locaguest.com",
  authGateBaseUrl: "https://auth.staging.locaguest.com",
  authGateClientId: "pedagora-pilot-web",
  //authMode: "oidc" as "legacy" | "oidc",
  authMode:  "legacy",
  oidc: {
    authority: "https://auth.staging.locaguest.com/",
    clientId: "pedagora-pilot-web",
    redirectUri: "https://pedagora.staging.locaguest.com/auth/callback",
    scope: "openid profile email",
    responseType: "code",
    usePkce: true,
    apiAudience: "api://pedagora-pilot",
  },
  demoLoginEnabled: false,
  allowLegacyMockFallback: false,
} as const;
