import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { GatewayGateway } from "./gateway.gateway";

@Module({
    imports: [EventEmitterModule.forRoot()],
    providers: [GatewayGateway],
    exports: [GatewayGateway],
})
export class GatewayModule {}
