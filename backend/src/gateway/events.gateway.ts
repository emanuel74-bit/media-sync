import { Server, Socket } from "socket.io";
import { Logger, OnModuleInit } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";

import { SystemEventNames, SystemEventName } from "@/common";

@WebSocketGateway({ cors: { origin: "*" } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(EventsGateway.name);

    private static readonly BROADCAST_EVENTS: readonly SystemEventName[] = [
        SystemEventNames.STREAM_SYNCED,
        SystemEventNames.STREAM_REMOVED,
        SystemEventNames.STREAM_ASSIGNED,
        SystemEventNames.STREAM_UNASSIGNED,
        SystemEventNames.ALERT_CREATED,
        SystemEventNames.ALERT_RESOLVED,
        SystemEventNames.STREAM_INSPECTED,
        SystemEventNames.POD_REGISTERED,
        SystemEventNames.POD_REMOVED,
    ];

    constructor(private readonly events: EventEmitter2) {}

    onModuleInit(): void {
        for (const event of EventsGateway.BROADCAST_EVENTS) {
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
