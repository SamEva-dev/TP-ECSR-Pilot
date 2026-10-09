/**
 * S01: isolated behavioral regression checks on the original TS files.
 * Runs without an Angular server. TypeScript is required (project dependency or global).
 * Command: node src/tools/verify-auth-contracts.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch {
  try { ts = require(path.resolve(path.dirname(process.execPath), "../lib/node_modules/typescript")); }
  catch { throw new Error("Install TypeScript (npm install) before running these tests."); }
}
const src = path.resolve("src/app");
const location = (relative) => path.join(src, relative);
const env = { apiBaseUrl: "https://localhost:6001", authGateBaseUrl: "https://localhost:8081" };
const storage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  };
};
const localStorage = storage();
const sessionStorage = storage();
const signal = (value) => {
  let v = value;
  const s = () => v;
  s.set = (x) => { v = x; };
  s.asReadonly = () => s;
  s.update = (fn) => { v = fn(v); };
  return s;
};
const instances = new Map();
const angular = { Injectable: () => (klass) => klass, signal, computed: (fn) => fn, inject: (type) => {
  if (!instances.has(type)) throw new Error(`Missing DI instance for ${type?.name}`);
  return instances.get(type);
} };
const Router = class Router {};
const AuthRefreshService = class AuthRefreshService {};
let state;
const rxjs = {
  catchError: (callback) => (observable) => ({ evaluate: () => {
    try { return observable.evaluate(); } catch (error) { return callback(error).evaluate(); }
  }, pipe(...operators) { return operators.reduce((obs, op) => op(obs), this); } }),
  switchMap: (callback) => (observable) => ({ evaluate: () => callback(observable.evaluate()).evaluate(), pipe(...operators) { return operators.reduce((obs, op) => op(obs), this); } }),
  throwError: (factory) => ({ evaluate: () => { throw factory(); }, pipe(...operators) { return operators.reduce((obs, op) => op(obs), this); } }),
};
const observable = (evaluate) => ({ evaluate, pipe(...operators) { return operators.reduce((obs, op) => op(obs), this); } });
function compile(relative, deps = {}) {
  const output = ts.transpileModule(fs.readFileSync(location(relative), "utf8"), {
    fileName: relative,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  const fatal = output.diagnostics?.filter((x) => x.category === ts.DiagnosticCategory.Error) ?? [];
  assert.equal(fatal.length, 0, `${relative} must transpile`);
  const exports = {};
  const context = { exports, localStorage, sessionStorage, window: {},
    require: (name) => {
      if (name === "@angular/core") return angular;
      if (name === "@angular/router") return { Router };
      if (name === "rxjs") return rxjs;
      if (name === "../../environments/environment") return { environment: env };
      if (deps[name]) return deps[name];
      throw new Error(`Unhandled import in ${relative}: ${name}`);
    },
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    Date, JSON, Set, Map, decodeURIComponent, encodeURIComponent,
    crypto: { randomUUID: () => "test-idempotency-key" },
  };
  vm.runInNewContext(output.outputText, context, { filename: relative });
  return exports;
}
const auth = compile("core/session/auth-token.store.ts");
const AuthTokenStore = auth.AuthTokenStore;
const tokens = new AuthTokenStore();
instances.set(AuthTokenStore, tokens);
const sessions = compile("core/session/session.service.ts", { "./auth-token.store": auth });
const SessionService = sessions.SessionService;
instances.set(SessionService, null);
const jwt = (org = "org-1") => {
  const payload = { sub: "user-1", org_id: org, exp: Math.floor(Date.now() / 1000) + 3600, roles: ["Trainer"], permissions: ["pedagora.sessions.view"] };
  return `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;
};
const key = "tp-ecsr-pilot.session";
let count = 0;
function test(name, fn) {
  try { fn(); count += 1; console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}
test("S01 temporary login: token and session are nonpersistent", () => {
  const token = jwt();
  tokens.setTokens(token, "refresh", false);
  const svc = new SessionService();
  instances.set(SessionService, svc);
  svc.connectAuthenticatedToken(token);
  assert.equal(localStorage.getItem("pedagora-pilot.auth.access-token"), null);
  assert.equal(sessionStorage.getItem("pedagora-pilot.auth.access-token"), token);
  assert.equal(localStorage.getItem(key), null);
  assert.ok(sessionStorage.getItem(key));
});
test("S01 promotion changes and logout clear every context", () => {
  const svc = instances.get(SessionService);
  svc.setPromotion("cohort-1");
  assert.equal(svc.promotionId(), "cohort-1");
  assert.equal(JSON.parse(sessionStorage.getItem(key)).promotionId, "cohort-1");
  svc.disconnect();
  tokens.clear();
  assert.equal(svc.promotionId(), "");
  assert.equal(sessionStorage.getItem(key), null);
  assert.equal(localStorage.getItem(key), null);
});
test("S01 remembered login persists only in local storage", () => {
  const token = jwt();
  tokens.setTokens(token, "refresh", true);
  const svc = new SessionService();
  svc.connectAuthenticatedToken(token);
  assert.ok(localStorage.getItem(key));
  assert.equal(sessionStorage.getItem(key), null);
  assert.equal(svc.hasValidToken(), true);
});
test("S01 legacy persistent session migrates to temporary when remember=false", () => {
  const token = jwt();
  tokens.setTokens(token, "refresh", false);
  const oldSession = localStorage.getItem(key);
  sessionStorage.removeItem(key);
  localStorage.setItem(key, oldSession);
  const svc = new SessionService();
  assert.ok(svc.session());
  assert.equal(localStorage.getItem(key), null);
  assert.ok(sessionStorage.getItem(key));
});
const http = (url, method = "POST", initialHeaders = {}) => {
  const headers = new Map(Object.entries(initialHeaders));
  return {
    url, method,
    headers: { has: (key) => headers.has(key), get: (key) => headers.get(key) ?? null },
    clone: ({ setHeaders }) => http(url, method, Object.fromEntries([...headers, ...Object.entries(setHeaders)])),
  };
};
const idempotency = compile("core/http/idempotency.interceptor.ts").idempotencyInterceptor;
test("S01 idempotency only on Pedagora mutating calls", () => {
  assert.equal(idempotency(http("https://localhost:6001/api/v1/cohorts"), (r) => r).headers.get("Idempotency-Key"), "test-idempotency-key");
  assert.equal(idempotency(http("https://localhost:8081/api/Auth/login"), (r) => r).headers.get("Idempotency-Key"), null);
  assert.equal(idempotency(http("https://localhost:6001.attacker.test/"), (r) => r).headers.get("Idempotency-Key"), null);
  assert.equal(idempotency(http("https://localhost:6001/api/v1/cohorts", "GET"), (r) => r).headers.get("Idempotency-Key"), null);
  assert.equal(idempotency(http("https://localhost:6001/api/v1/cohorts", "POST", { "Idempotency-Key": "caller-key" }), (r) => r).headers.get("Idempotency-Key"), "caller-key");
});
const authInterceptor = compile("core/session/auth.interceptor.ts", {
  "./auth-token.store": auth,
  "./auth-refresh.service": { AuthRefreshService },
  "./session.service": sessions,
}).authInterceptor;
let redirects = [];
instances.set(Router, { navigateByUrl: (url) => { redirects.push(url); return Promise.resolve(); } });
let retry;
instances.set(AuthRefreshService, { refreshAccessToken: () => retry() });
test("S01 bearer only for Pedagora and protected AuthGate calls", () => {
  tokens.setTokens("access-1", "refresh", false);
  const svc = new SessionService();
  instances.set(SessionService, svc);
  const next = (request) => observable(() => request);
  const run = (url) => authInterceptor(http(url, "GET"), next).evaluate().headers.get("Authorization");
  assert.equal(run("https://localhost:6001/api/v1/cohorts"), "Bearer access-1");
  assert.equal(run("https://localhost:8081/api/Users/current"), "Bearer access-1");
  assert.equal(run("https://localhost:8081/api/Auth/login"), null);
  assert.equal(run("https://localhost:6001.attacker.test/api/v1/cohorts"), null);
  assert.equal(run("https://localhost:8081.evil.test/api/Users/current"), null);
});
test("S01 second 401 clears credentials and redirects", () => {
  tokens.setTokens("access-old", "refresh", false);
  redirects = [];
  retry = () => observable(() => { tokens.setTokens("access-new", "refresh-new", false); return "access-new"; });
  let disconnects = 0;
  instances.set(SessionService, { disconnect: () => { disconnects++; } });
  const next = () => observable(() => { throw { status: 401 }; });
  assert.throws(() => authInterceptor(http("https://localhost:6001/api/v1/cohorts"), next).evaluate(), (err) => err.status === 401);
  assert.equal(tokens.accessToken(), null);
  assert.equal(disconnects, 1);
  assert.deepEqual(redirects, ["/connexion"]);
});
test("S01 403 after refresh preserves authenticated session", () => {
  tokens.setTokens("access-old", "refresh", false);
  redirects = [];
  let disconnects = 0;
  retry = () => observable(() => { tokens.setTokens("access-new", "refresh-new", false); return "access-new"; });
  instances.set(SessionService, { disconnect: () => { disconnects++; } });
  const next = (request) => observable(() => { throw { status: request.headers.get("Authorization") === "Bearer access-old" ? 401 : 403 }; });
  assert.throws(() => authInterceptor(http("https://localhost:6001/api/v1/cohorts"), next).evaluate(), (err) => err.status === 403);
  assert.equal(tokens.accessToken(), "access-new");
  assert.equal(disconnects, 0);
  assert.deepEqual(redirects, []);
});
test("S01 original 401 is retried once with refreshed credentials", () => {
  tokens.setTokens("access-old", "refresh", false);
  redirects = [];
  retry = () => observable(() => { tokens.setTokens("access-new", "refresh-new", false); return "access-new"; });
  let calls = 0;
  const next = (request) => observable(() => {
    calls++;
    const token = request.headers.get("Authorization");
    if (token === "Bearer access-old") throw { status: 401 };
    return token;
  });
  const result = authInterceptor(http("https://localhost:6001/api/v1/cohorts"), next).evaluate();
  assert.equal(result, "Bearer access-new");
  assert.equal(calls, 2);
  assert.deepEqual(redirects, []);
});
test("S01 initial 500 is forwarded without session destruction", () => {
  tokens.setTokens("access-ok", "refresh", false);
  redirects = [];
  let disconnects = 0;
  instances.set(SessionService, { disconnect: () => { disconnects++; } });
  const next = () => observable(() => { throw { status: 500 }; });
  assert.throws(() => authInterceptor(http("https://localhost:6001/api/v1/cohorts"), next).evaluate(), (err) => err.status === 500);
  assert.equal(tokens.accessToken(), "access-ok");
  assert.equal(disconnects, 0);
  assert.deepEqual(redirects, []);
});
test("S01 401 without refresh token performs safe logout", () => {
  tokens.setTokens("access-old", null, false);
  redirects = [];
  let disconnects = 0;
  instances.set(SessionService, { disconnect: () => { disconnects++; } });
  const next = () => observable(() => { throw { status: 401 }; });
  assert.throws(() => authInterceptor(http("https://localhost:6001/api/v1/cohorts"), next).evaluate(), (err) => err.status === 401);
  assert.equal(tokens.accessToken(), null);
  assert.equal(disconnects, 1);
  assert.deepEqual(redirects, ["/connexion"]);
});
const config = fs.readFileSync(location("app.config.ts"), "utf8");
test("S00 correct interceptor wired and obsolete interceptor absent", () => {
  assert.match(config, /withInterceptors\(\s*\[([\s\S]*?)authInterceptor/);
  assert.ok(!fs.existsSync(location("core/http/auth-token.interceptor.ts")));
});
console.log(`S00/S01: ${count} tests completed${process.exitCode ? " with failure(s)" : " successfully"}.`);
