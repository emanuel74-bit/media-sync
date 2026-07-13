/**
 * Curated public surface of the infrastructure layer. Features depend on the
 * composition-root modules and the MediaMTX **gateway** — its client registry and
 * the domain shapes the clients return. The application services that operate the
 * nodes (listing, pipeline, stats, metrics) are NOT here: they live in the
 * `media-nodes` feature, which consumes this gateway (ARCH-09, ARCH-10). Adapters'
 * mappers and raw wire (V3 / Prometheus) shapes stay internal to
 * `@/infrastructure/media-mtx`.
 */

export { DatabaseModule } from "./database";

export { MediaMtxModule, MediaMtxClientRegistry } from "./media-mtx";

export type {
    StreamDetails,
    MediaMtxClient,
    MediaMtxStreamInfo,
    PipelineCreateResult,
    MediaMtxMetricsClient,
    MediaMtxMetricsSnapshot,
} from "./media-mtx";
