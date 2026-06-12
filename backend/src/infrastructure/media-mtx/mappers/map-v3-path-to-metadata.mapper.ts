import { StreamPathMetadata, V3PathItem } from "../types";

export function mapV3PathToMetadata(path: V3PathItem): StreamPathMetadata {
    return {
        bytesReceived: path?.bytesReceived,
        bytesSent: path?.bytesSent,
        readers: path?.readers,
    };
}
