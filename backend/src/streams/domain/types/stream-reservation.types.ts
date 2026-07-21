/** Coordinates returned to a client after reserving a publish slot on an ingest node. */
export interface StreamReservation {
    name: string;
    /** The ingest node the slot was placed on. */
    ingestNode: string;
    /** RTSP URL the client publishes to, with the publish user + secret already embedded. */
    publishUrl: string;
    /** Opaque secret authorizing publish on this path; also embedded in `publishUrl`. */
    publishToken: string;
    /** When the reservation expires if no media has arrived. */
    expiresAt: Date;
}
