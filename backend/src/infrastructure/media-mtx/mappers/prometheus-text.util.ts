import { PrometheusSample } from "../types";

const LINE = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{(.*)\})?\s+(.+)$/;
const LABEL = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g;

function parseLabels(raw: string | undefined): Record<string, string> {
    const labels: Record<string, string> = {};
    if (!raw) {
        return labels;
    }
    let match: RegExpExecArray | null;
    LABEL.lastIndex = 0;
    while ((match = LABEL.exec(raw)) !== null) {
        labels[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    return labels;
}

/**
 * Parse the Prometheus text exposition format into samples.
 * Tolerant: skips comments/blank/malformed lines and non-numeric values (NaN/Inf).
 */
export function parsePrometheusText(text: string): PrometheusSample[] {
    const samples: PrometheusSample[] = [];
    for (const rawLine of text.split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) {
            continue;
        }
        const match = LINE.exec(line);
        if (!match) {
            continue;
        }
        const value = Number(match[4].trim());
        if (!Number.isFinite(value)) {
            continue;
        }
        samples.push({ name: match[1], labels: parseLabels(match[3]), value });
    }
    return samples;
}
