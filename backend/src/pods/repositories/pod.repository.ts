import { Pod } from "@/pods";
import { PodRole } from "@/common";

export abstract class PodRepository {
    abstract upsertByPodId(
        podId: string,
        fields: Partial<Omit<Pod, "podId" | "createdAt" | "updatedAt">>,
    ): Promise<Pod>;

    abstract findAll(): Promise<Pod[]>;

    abstract findActive(since: Date, role?: PodRole): Promise<Pod[]>;

    abstract findActivePodIds(since: Date): Promise<string[]>;
}
