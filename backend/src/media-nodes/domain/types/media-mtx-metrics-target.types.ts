import { NodeRole } from "@/common";
import { MediaMtxMetricsClient } from "@/infrastructure";

/** One MediaMTX node's Prometheus scrape target: which node, and the client to scrape it with. */
export interface MediaMtxMetricsTarget {
    context: NodeRole;
    nodeId: string;
    client: MediaMtxMetricsClient;
}
