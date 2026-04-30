import { Module } from "@nestjs/common";

import { SequentialStreamTaskRunner } from "./services";

@Module({
    providers: [SequentialStreamTaskRunner],
    exports: [SequentialStreamTaskRunner],
})
export class TaskSequencingModule {}
