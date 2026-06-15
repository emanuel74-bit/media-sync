/** A registered MediaMTX node (ingest or cluster) the registry can build a client for. */
export type MediaMtxPodEndpoint = {
    podId: string;
    host?: string | null;
};
