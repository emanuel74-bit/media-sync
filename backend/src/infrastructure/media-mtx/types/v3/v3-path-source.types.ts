/**
 * The `source` field of a V3 path. The real MediaMTX v3 API returns an object
 * (`{ type, id }`) describing what feeds the path, or `null` when not ready.
 * The string form is tolerated for older shapes and test fixtures.
 */
export type V3PathSource = string | { type?: string; id?: string } | null;
