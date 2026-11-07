import { Injectable, effect, inject, signal } from "@angular/core";
import {
  HubConnection,
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { environment } from "../../environments/environment";
import { AuthTokenStore } from "../session/auth-token.store";
import { OidcApplicationSessionService } from "../oidc/oidc-application-session.service";

export interface PedagoraRealtimeEvent {
  eventId: string;
  typeKey: string;
  occurredOnUtc: string;
  payload: unknown;
}

@Injectable({ providedIn: "root" })
export class RealtimeService {
  private readonly tokens = inject(AuthTokenStore);
  private readonly oidc = inject(OidcApplicationSessionService);
  private connection?: HubConnection;
  private queued: Promise<void> = Promise.resolve();
  private token: string | null = this.identityKey();
  private wanted = false;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private retryAttempt = 0;
  readonly connected = signal(false);
  readonly lastEvent = signal<PedagoraRealtimeEvent | null>(null);

  constructor() {
    effect(() => {
      const token = this.identityKey();
      if (token === this.token) return;
      this.token = token;
      this.clearRetry();
      // Drop data belonging to the previous identity immediately, before async teardown.
      this.lastEvent.set(null);
      this.connected.set(false);
      if (this.wanted)
        void this.enqueue(() => this.openFor(token)).catch(() => undefined);
    });
  }

  private identityKey(): string | null {
    if (environment.authMode !== 'oidc') return this.tokens.accessToken();
    const context = this.oidc.bootstrapResult();
    return this.oidc.ready() && context?.selectedWorkspaceId
      ? `${context.subject}:${context.selectedWorkspaceId}` : null;
  }

  start(): Promise<void> {
    this.wanted = true;
    return this.enqueue(() => this.openFor(this.identityKey()));
  }

  stop(): Promise<void> {
    this.wanted = false;
    this.clearRetry();
    this.lastEvent.set(null);
    return this.enqueue(async () => {
      await this.closeConnection();
    });
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    const next = this.queued.then(action, action);
    this.queued = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async closeConnection(): Promise<void> {
    const previous = this.connection;
    this.connection = undefined;
    this.connected.set(false);
    if (previous) await previous.stop();
  }

  private clearRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.retryAttempt = 0;
  }

  private legacyTokenExpired(): boolean {
    if (environment.authMode === 'oidc') return false;
    const token = this.tokens.accessToken();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
      return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now() + 5000;
    } catch { return true; }
  }

  private scheduleRetry(token: string): void {
    if (this.legacyTokenExpired() || !this.wanted || this.identityKey() !== token || this.retryTimer)
      return;
    const delay = Math.min(30000, 2000 * 2 ** Math.min(this.retryAttempt++, 4));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      if (this.wanted && this.identityKey() === token)
        void this.enqueue(() => this.openFor(token)).catch(() => undefined);
    }, delay);
  }

  private async openFor(token: string | null): Promise<void> {
    if (!this.wanted || this.identityKey() !== token) return;
    if (this.connection && this.connected() && this.token === token) return;
    await this.closeConnection();
    if (!token || this.legacyTokenExpired() || !this.wanted || this.identityKey() !== token) return;
    const hubBase = `${environment.apiBaseUrl}/hubs/notifications`;
    const hubUrl = environment.authMode === 'oidc'
      ? this.oidc.authorizedHubEndpoint(hubBase) : hubBase;
    if (!hubUrl) return;
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => environment.authMode === 'oidc'
          ? this.oidc.accessTokenForHub(hubBase)
          : (this.legacyTokenExpired() ? "" : this.tokens.accessToken() ?? ""),
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(
        environment.production ? LogLevel.Warning : LogLevel.Information,
      )
      .build();
    this.connection = connection;
    connection.on("domainEvent", (event: PedagoraRealtimeEvent) => {
      if (this.connection === connection && this.identityKey() === token)
        this.lastEvent.set(event);
    });
    connection.onreconnected(() => {
      if (this.connection === connection && this.identityKey() === token)
        this.connected.set(true);
    });
    connection.onreconnecting(() => {
      if (this.connection === connection) this.connected.set(false);
    });
    connection.onclose(() => {
      if (this.connection === connection) {
        this.connected.set(false);
        this.scheduleRetry(token);
      }
    });
    try {
      await connection.start();
      if (
        this.connection === connection &&
        this.identityKey() === token
      ) {
        this.connected.set(true);
        this.clearRetry();
      } else await this.closeConnection();
    } catch (error) {
      if (this.connection === connection) await this.closeConnection();
      this.scheduleRetry(token);
      throw error;
    }
  }
}
