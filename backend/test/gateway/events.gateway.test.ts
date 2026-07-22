import { Server } from "socket.io";
import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { EventsGateway } from "@/gateway";
import { SystemEventNames } from "@/common";

describe("EventsGateway", () => {
    let gateway: EventsGateway;
    let events: jest.Mocked<EventEmitter2>;
    let server: jest.Mocked<Server>;
    let handlers: Map<string, (payload: unknown) => void>;

    beforeEach(async () => {
        handlers = new Map<string, (payload: unknown) => void>();

        events = {
            on: jest.fn((event: string, handler: (payload: unknown) => void) => {
                handlers.set(event, handler);
                return events;
            }),
        } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [EventsGateway, { provide: EventEmitter2, useValue: events }],
        }).compile();

        gateway = module.get<EventsGateway>(EventsGateway);
        server = { emit: jest.fn() } as unknown as jest.Mocked<Server>;
        gateway.server = server;
    });

    it("registers websocket broadcast listeners for the configured system events", () => {
        gateway.onModuleInit();

        expect([...handlers.keys()]).toEqual([
            SystemEventNames.STREAM_SYNCED,
            SystemEventNames.STREAM_REMOVED,
            SystemEventNames.STREAM_RESERVED,
            SystemEventNames.STREAM_ASSIGNED,
            SystemEventNames.STREAM_UNASSIGNED,
            SystemEventNames.ALERT_CREATED,
            SystemEventNames.ALERT_UPDATED,
            SystemEventNames.ALERT_RESOLVED,
            SystemEventNames.STREAM_INSPECTED,
            SystemEventNames.NODE_REGISTERED,
        ]);
        expect(handlers.has(SystemEventNames.METRICS_COLLECTED)).toBe(false);
        expect(handlers.has(SystemEventNames.NODE_SAMPLED)).toBe(false);
        expect(handlers.has(SystemEventNames.SYNC_TICK)).toBe(false);
    });

    it("rebroadcasts configured events with the original payload", () => {
        const payload = {
            streamName: "stream-1",
            ingestNode: "ingest-1",
            expiresAt: new Date("2026-07-22T12:00:00.000Z"),
        };

        gateway.onModuleInit();
        handlers.get(SystemEventNames.STREAM_RESERVED)?.(payload);

        expect(server.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_RESERVED, payload);
    });
});
