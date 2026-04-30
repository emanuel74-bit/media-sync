import { Stream, StreamAssignmentInfo } from "../domain/types/stream.types";

export abstract class StreamRepository {
    abstract create(data: Partial<Stream> & Pick<Stream, "name" | "source">): Promise<Stream>;

    abstract findByName(name: string): Promise<Stream | null>;

    abstract findAll(): Promise<Stream[]>;

    abstract findUnassigned(): Promise<Stream[]>;

    abstract findByAssignedPod(podId: string): Promise<Stream[]>;

    abstract upsert(name: string, data: Partial<Stream>): Promise<Stream>;

    abstract assignToPod(name: string, podId: string, assignedAt: Date): Promise<Stream | null>;

    abstract clearAssignment(name: string): Promise<Stream | null>;

    abstract update(name: string, data: Partial<Stream>): Promise<Stream | null>;

    abstract delete(name: string): Promise<boolean>;

    abstract getAssignmentInfo(): Promise<StreamAssignmentInfo[]>;
}
