/**
 * Template-method base for per-endpoint client factories: owns the URL→client
 * cache and the get-or-create flow; subclasses supply only how to build one
 * client via `create`. One concrete subclass per client kind so each keeps its
 * own DI token (ARCH-07). See `MediaMtxClientFactory`, `MediaMtxMetricsClientFactory`.
 */
export abstract class CachingClientFactory<TClient> {
    private readonly cache = new Map<string, TClient>();

    /** Build a fresh client for `url`. Called once per distinct URL. */
    protected abstract create(url: string): TClient;

    getOrCreate(url: string): TClient {
        let client = this.cache.get(url);
        if (!client) {
            client = this.create(url);
            this.cache.set(url, client);
        }
        return client;
    }
}
