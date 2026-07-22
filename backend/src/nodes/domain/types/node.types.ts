import { NodeRole, NodeStatus } from "@/common";

export interface Node {
    nodeId: string;
    /**
     * Reachable address the node self-reports — the sole source for building this node's
     * client URL. An ephemeral IP under a Deployment, or a stable per-node DNS name under a
     * StatefulSet (`<node>.<svc>.<ns>.svc.cluster.local`); the node registry treats it as an
     * opaque host either way.
     */
    host: string;
    /**
     * Per-node MediaMTX ports the node self-reports (several nodes can share a `host` and differ
     * only by port). Defaulted from config at registration when the node omits them, so the
     * registry always holds a concrete port.
     */
    apiPort: number;
    rtspPort: number;
    metricsPort: number;
    type: NodeRole;
    status: NodeStatus;
    lastHeartbeatAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
