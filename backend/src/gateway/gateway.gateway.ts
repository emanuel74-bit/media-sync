import { Server, Socket } from "socket.io";
import { Logger, OnModuleInit } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";

@WebSocketGateway({ cors: { origin: "*" } })
export class GatewayGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(GatewayGateway.name);

    private static readonly BROADCAST_EVENTS: readonly string[] = [
        "stream.synced",
        "stream.removed",
        "stream.assigned",
        "stream.unassigned",
        "alert.created",
        "alert.resolved",
        "stream.inspected",
        "pod.registered",
        "pod.removed",
    ];

    constructor(private readonly events: EventEmitter2) {}

    onModuleInit(): void {
        for (const event of GatewayGateway.BROADCAST_EVENTS) {
            this.events.on(event, (payload: unknown) => this.broadcast(event, payload));
        }
    }

    handleConnection(client: Socket): void {
        this.logger.log(`WebSocket connected: ${client.id}`);
    }

    handleDisconnect(client: Socket): void {
        this.logger.log(`WebSocket disconnected: ${client.id}`);
    }

    private broadcast(event: string, payload: unknown): void {
        if (this.server) {
            this.server.emit(event, payload);
        }
    }
}
