import { Pod } from "../domain";
import { PodRole } from "../../common/domain";

export abstract class PodRepository {
    abstract upsertByPodId(
        podId: string,
        fields: Partial<Omit<Pod, "podId" | "createdAt" | "updatedAt">>,
    ): Promise<Pod>;

    abstract findAll(): Promise<Pod[]>;

    abstract findActive(since: Date, role?: PodRole): Promise<Pod[]>;

    abstract findActivePodIds(since: Date): Promise<string[]>;
}
