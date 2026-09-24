import { Injectable, inject, signal } from "@angular/core";
import { HubConnection, HubConnectionBuilder, HttpTransportType, LogLevel } from "@microsoft/signalr";
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

  readonly connected = signal(false);
  readonly lastEvent = signal<PedagoraRealtimeEvent | null>(null);

  async start(): Promise<void> {
    if (this.connection) return;

    this.connection = new HubConnectionBuilder()
      .withUrl(`${environment.apiBaseUrl}/hubs/notifications`, {
        accessTokenFactory: () => this.tokens.accessToken() ?? "",
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(environment.production ? LogLevel.Warning : LogLevel.Information)
      .build();

    this.connection.on("domainEvent", (event: PedagoraRealtimeEvent) => this.lastEvent.set(event));
    this.connection.onreconnected(() => this.connected.set(true));
    this.connection.onreconnecting(() => this.connected.set(false));
    this.connection.onclose(() => this.connected.set(false));

    await this.connection.start();
    this.connected.set(true);
  }

  async stop(): Promise<void> {
    const connection = this.connection;
    this.connection = undefined;
    if (connection) await connection.stop();
    this.connected.set(false);
  }
}
