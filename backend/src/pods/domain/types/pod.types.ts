import { PodRole, PodStatus } from "@/common";

export interface Pod {
    podId: string;
    /**
     * Reachable address the pod self-reports — the sole source for building this pod's
     * client URL. An ephemeral IP under a Deployment, or a stable per-pod DNS name under a
     * StatefulSet (`<pod>.<svc>.<ns>.svc.cluster.local`); the pod registry treats it as an
     * opaque host either way.
     */
    host: string;
    /**
     * Per-node MediaMTX ports the pod self-reports (several nodes can share a `host` and differ
     * only by port). Defaulted from config at registration when the pod omits them, so the
     * registry always holds a concrete port.
     */
    apiPort: number;
    rtspPort: number;
    metricsPort: number;
    type: PodRole;
    status: PodStatus;
    lastHeartbeatAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
