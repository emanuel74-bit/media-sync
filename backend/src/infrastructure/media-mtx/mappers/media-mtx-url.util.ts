/**
 * URL helpers for the MediaMTX transport layer. Registered nodes report only host/IP,
 * so a node's HTTP base URL is assembled from a host plus per-deployment transport
 * config (credentials + port).
 */

/** Format `user:pass` credentials as a URL auth prefix (`user:pass@`), or `""` when empty. */
export function authPrefix(credentials: string): string {
    return credentials ? `${credentials}@` : "";
}

/** Assemble a node HTTP base URL from optional `user:pass@` auth, host, and port. */
export function buildNodeUrl(auth: string, host: string, port: number): string {
    return `http://${auth}${host}:${port}`;
}
