import { MediaMtxClient } from "../../../../src/infrastructure/media-mtx/clients";
import { MediaMtxClientFactory } from "../../../../src/infrastructure/media-mtx/registry/media-mtx-client-factory.service";

describe("MediaMtxClientFactory", () => {
    let factory: MediaMtxClientFactory;

    beforeEach(() => {
        factory = new MediaMtxClientFactory();
    });

    it("creates a new MediaMtxClient for the given URL", () => {
        const client = factory.getOrCreate("http://localhost:9000");
        expect(client).toBeInstanceOf(MediaMtxClient);
    });

    it("returns the same instance for the same URL on subsequent calls", () => {
        const first = factory.getOrCreate("http://localhost:9000");
        const second = factory.getOrCreate("http://localhost:9000");
        expect(first).toBe(second);
    });

    it("creates separate instances for different URLs", () => {
        const ingest = factory.getOrCreate("http://ingest:9000");
        const cluster = factory.getOrCreate("http://cluster:9001");
        expect(ingest).not.toBe(cluster);
    });

    it("caches independently per URL — adding a third URL does not affect existing ones", () => {
        const a = factory.getOrCreate("http://a:9000");
        const b = factory.getOrCreate("http://b:9000");
        factory.getOrCreate("http://c:9000");

        expect(factory.getOrCreate("http://a:9000")).toBe(a);
        expect(factory.getOrCreate("http://b:9000")).toBe(b);
    });
});
