import { PodRole, PodStatus } from "../../common/domain";

export interface Pod {
    podId: string;
    host?: string | null;
    tags: string[];
    type: PodRole;
    status: PodStatus;
    lastHeartbeatAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
