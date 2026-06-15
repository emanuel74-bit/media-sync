import { StreamPathMetadata, V3PathItem } from "../types";

export function mapV3PathToMetadata(path: V3PathItem): StreamPathMetadata {
    return {
        bytesReceived: path?.bytesReceived,
        bytesSent: path?.bytesSent,
        // Real v3 reports readers as an array; normalize to a count.
        readers: Array.isArray(path?.readers) ? path.readers.length : path?.readers,
    };
}
