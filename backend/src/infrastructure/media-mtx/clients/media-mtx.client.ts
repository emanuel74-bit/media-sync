import axios, { AxiosInstance } from "axios";

import { MediaMtxStreamInfo, V3PathItem, PipelineCreateResult } from "@/infrastructure";

import { mapV3PathToStream } from "../mappers";

/**
 * Thin HTTP adapter for a single MediaMTX node.
 * Owns its own AxiosInstance — one client per endpoint URL.
 * Returns domain-typed values — raw API shapes are mapped before leaving the client.
 * All errors propagate to the caller; no error handling here.
 */
export class MediaMtxClient {
    private readonly http: AxiosInstance;

    constructor(baseUrl: string) {
        this.http = axios.create({ baseURL: baseUrl, timeout: 8000 });
    }

    async listPaths(): Promise<MediaMtxStreamInfo[]> {
        const res = await this.http.get<{ items?: V3PathItem[] }>("/v3/paths/list");
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        return items.map((item) => mapV3PathToStream(item));
    }

    async getPathItem(pathName: string): Promise<V3PathItem> {
        const res = await this.http.get<V3PathItem>(
            `/v3/paths/get/${encodeURIComponent(pathName)}`,
        );
        return res.data;
    }

    async addPath(pathName: string, source: string): Promise<PipelineCreateResult> {
        const res = await this.http.post(`/v3/config/paths/add/${encodeURIComponent(pathName)}`, {
            source,
        });
        return res.data;
    }

    async removePath(pathName: string): Promise<void> {
        await this.http.post(`/v3/config/paths/remove/${encodeURIComponent(pathName)}`);
    }
}
