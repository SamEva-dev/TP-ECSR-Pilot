import { Injectable, effect, inject, signal } from "@angular/core";
import {
  HubConnection,
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { environment } from "../../environments/environment";
import { AuthTokenStore } from "../session/auth-token.store";

export interface PedagoraRealtimeEvent {
  eventId: string;
  typeKey: string;
  occurredOnUtc: string;
  payload: unknown;
}

@Injectable({ providedIn: "root" })
export class RealtimeService {
  private readonly tokens = inject(AuthTokenStore);
  private connection?: HubConnection;
  private queued: Promise<void> = Promise.resolve();
  private token: string | null = this.tokens.accessToken();
  private wanted = false;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private retryAttempt = 0;
  readonly connected = signal(false);
  readonly lastEvent = signal<PedagoraRealtimeEvent | null>(null);

  constructor() {
    effect(() => {
      const token = this.tokens.accessToken();
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

  start(): Promise<void> {
    this.wanted = true;
    return this.enqueue(() => this.openFor(this.tokens.accessToken()));
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

  private scheduleRetry(token: string): void {
    if (!this.wanted || this.tokens.accessToken() !== token || this.retryTimer)
      return;
    const delay = Math.min(30000, 2000 * 2 ** Math.min(this.retryAttempt++, 4));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      if (this.wanted && this.tokens.accessToken() === token)
        void this.enqueue(() => this.openFor(token)).catch(() => undefined);
    }, delay);
  }

  private async openFor(token: string | null): Promise<void> {
    if (!this.wanted || this.tokens.accessToken() !== token) return;
    if (this.connection && this.connected() && this.token === token) return;
    await this.closeConnection();
    if (!token || !this.wanted || this.tokens.accessToken() !== token) return;
    const connection = new HubConnectionBuilder()
      .withUrl(`${environment.apiBaseUrl}/hubs/notifications`, {
        accessTokenFactory: () => this.tokens.accessToken() ?? "",
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(
        environment.production ? LogLevel.Warning : LogLevel.Information,
      )
      .build();
    this.connection = connection;
    connection.on("domainEvent", (event: PedagoraRealtimeEvent) => {
      if (this.connection === connection && this.tokens.accessToken() === token)
        this.lastEvent.set(event);
    });
    connection.onreconnected(() => {
      if (this.connection === connection && this.tokens.accessToken() === token)
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
        this.tokens.accessToken() === token
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
