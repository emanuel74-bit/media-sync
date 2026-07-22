/** Stream-configured track expectations, supplied as context to track rules. */
export interface StreamTrackAlertContext {
    metadata?: {
        hasExpectedVideo?: boolean;
        hasExpectedAudio?: boolean;
    };
}
