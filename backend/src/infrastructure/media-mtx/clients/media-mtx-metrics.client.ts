import axios, { AxiosInstance } from "axios";

/**
 * Thin adapter for one MediaMTX node's Prometheus metrics endpoint (port 9998).
 * Returns the raw exposition text; parsing happens in the mapper.
 */
export class MediaMtxMetricsClient {
    private readonly http: AxiosInstance;

    constructor(baseUrl: string) {
        this.http = axios.create({ baseURL: baseUrl, timeout: 8000 });
    }

    async fetchMetricsText(): Promise<string> {
        const res = await this.http.get("/metrics", { responseType: "text" });
        return typeof res.data === "string" ? res.data : String(res.data);
    }
}
