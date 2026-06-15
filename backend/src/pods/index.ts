// The module export stays last: feature barrels must expose leaf exports first
// so cyclic re-entry during module evaluation can still resolve them.
export { PodsModule } from "./pods.module";
export { PodQueryService } from "./services";
export { PodRepository } from "./repositories";
export type { Pod, ActivePodRef } from "./domain";
