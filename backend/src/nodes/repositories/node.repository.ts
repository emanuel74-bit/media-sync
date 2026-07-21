import { NodeRole } from "@/common";

import { Node } from "../domain";

export abstract class NodeRepository {
    abstract upsertByNodeId(
        nodeId: string,
        fields: Partial<Omit<Node, "nodeId" | "createdAt" | "updatedAt">>,
    ): Promise<Node>;

    abstract findAll(): Promise<Node[]>;

    abstract findActive(since: Date, role?: NodeRole): Promise<Node[]>;
}
