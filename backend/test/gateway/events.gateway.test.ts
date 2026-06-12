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

        expect(events.on).toHaveBeenCalledTimes(8);
        expect(handlers.has(SystemEventNames.ALERT_CREATED)).toBe(true);
        expect(handlers.has(SystemEventNames.POD_REGISTERED)).toBe(true);
        expect(handlers.has(SystemEventNames.SYNC_TICK)).toBe(false);
    });

    it("rebroadcasts configured events with the original payload", () => {
        const payload = { streamName: "stream-1", severity: "warning" };

        gateway.onModuleInit();
        handlers.get(SystemEventNames.ALERT_CREATED)?.(payload);

        expect(server.emit).toHaveBeenCalledWith(SystemEventNames.ALERT_CREATED, payload);
    });
});
