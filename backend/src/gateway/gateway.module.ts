import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { EventsGateway } from "./events.gateway";

@Module({
    imports: [EventEmitterModule.forRoot()],
    providers: [EventsGateway],
    exports: [EventsGateway],
})
export class GatewayModule {}
