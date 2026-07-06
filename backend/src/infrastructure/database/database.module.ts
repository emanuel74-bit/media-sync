import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { PodRepository } from "@/pods/repositories";
import { AlertRepository } from "@/alerts/repositories";
import { StreamRepository } from "@/streams/repositories";
import { StreamInspectionRepository } from "@/stream-inspection/repositories";
import { NodeMetricRepository, PathMetricRepository } from "@/metrics/repositories";

import {
    Pod,
    Alert,
    Stream,
    PodSchema,
    NodeMetric,
    PathMetric,
    AlertSchema,
    StreamSchema,
    NodeMetricSchema,
    PathMetricSchema,
    StreamInspection,
    MongoPodRepository,
    MongoAlertRepository,
    MongoStreamRepository,
    StreamInspectionSchema,
    MongoNodeMetricRepository,
    MongoPathMetricRepository,
    MongoStreamInspectionRepository,
} from "./mongo";

const MODELS = [
    { name: Alert.name, schema: AlertSchema },
    { name: Pod.name, schema: PodSchema },
    { name: Stream.name, schema: StreamSchema },
    { name: NodeMetric.name, schema: NodeMetricSchema },
    { name: PathMetric.name, schema: PathMetricSchema },
    { name: StreamInspection.name, schema: StreamInspectionSchema },
];

// The single storage-swap seam: rebind a port to a different adapter here and
// no feature module changes. Feature modules import DatabaseModule and depend
// only on the port tokens it exports — never on a schema or a Mongo* class.
const BINDINGS = [
    { provide: AlertRepository, useClass: MongoAlertRepository },
    { provide: PodRepository, useClass: MongoPodRepository },
    { provide: StreamRepository, useClass: MongoStreamRepository },
    { provide: NodeMetricRepository, useClass: MongoNodeMetricRepository },
    { provide: PathMetricRepository, useClass: MongoPathMetricRepository },
    { provide: StreamInspectionRepository, useClass: MongoStreamInspectionRepository },
];

@Module({
    imports: [MongooseModule.forFeature(MODELS)],
    providers: BINDINGS,
    exports: BINDINGS.map((binding) => binding.provide),
})
export class DatabaseModule {}
