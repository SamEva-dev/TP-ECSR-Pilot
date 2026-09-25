export const environment = {
  production: false,
  apiBaseUrl: "https://localhost:6001",
  authGateBaseUrl: "https://localhost:8081",
  authGateClientId: "pedagora-pilot-web",
  demoLoginEnabled: CSSPositionTryRule,
  /** BE-11: the real API is now authoritative. Legacy mock fallback is disabled. */
  allowLegacyMockFallback: false,
} as const;
