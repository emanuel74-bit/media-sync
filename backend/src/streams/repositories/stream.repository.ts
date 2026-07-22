import { Stream, StreamAssignmentInfo } from "../domain";

export abstract class StreamRepository {
    abstract create(data: Partial<Stream> & Pick<Stream, "name" | "source">): Promise<Stream>;

    abstract findByName(name: string): Promise<Stream | null>;

    abstract findAll(): Promise<Stream[]>;

    abstract findUnassigned(): Promise<Stream[]>;

    abstract findByAssignedNode(nodeId: string): Promise<Stream[]>;

    /** Count `RESERVED` streams grouped by the ingest node they hold a slot on. */
    abstract countReservationsByIngestNode(): Promise<Record<string, number>>;

    abstract upsert(name: string, data: Partial<Stream>): Promise<Stream>;

    abstract assignToNode(name: string, nodeId: string, assignedAt: Date): Promise<Stream | null>;

    abstract clearAssignment(name: string): Promise<Stream | null>;

    abstract update(name: string, data: Partial<Stream>): Promise<Stream | null>;

    abstract delete(name: string): Promise<boolean>;

    abstract findAssignmentInfo(): Promise<StreamAssignmentInfo[]>;
}
