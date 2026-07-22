import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

import { ConfigModule } from "@/config";

import { JobScheduler } from "./job-scheduler.service";

@Module({
    imports: [DiscoveryModule, ConfigModule],
    providers: [JobScheduler],
})
export class SchedulingModule {}
