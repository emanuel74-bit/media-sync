import { Module } from "@nestjs/common";

import { EventsGateway } from "./entry";

@Module({
    providers: [EventsGateway],
    exports: [EventsGateway],
})
export class SystemEventsModule {}
