import axios, { AxiosInstance } from "axios";

import { NodeRole } from "@/common";

import { MediaMtxMetricsSnapshot } from "../types";
import { parsePrometheusText, mapMetricsToSnapshot } from "../mappers";

/**
 * Thin adapter for one MediaMTX node's Prometheus metrics endpoint (port 9998).
 * Fetches the raw exposition text and maps it to a domain snapshot at the boundary —
 * raw Prometheus samples never leave the client.
 */
export class MediaMtxMetricsClient {
    private readonly http: AxiosInstance;

    constructor(baseUrl: string) {
        this.http = axios.create({ baseURL: baseUrl, timeout: 8000 });
    }

    async fetchSnapshot(context: NodeRole, nodeId: string): Promise<MediaMtxMetricsSnapshot> {
        const res = await this.http.get("/metrics", { responseType: "text" });
        const text = typeof res.data === "string" ? res.data : String(res.data);
        return mapMetricsToSnapshot(parsePrometheusText(text), context, nodeId);
    }
}
