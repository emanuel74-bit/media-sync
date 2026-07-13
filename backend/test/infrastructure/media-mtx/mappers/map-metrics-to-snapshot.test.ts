import { PodRole } from "@/common";
import { parsePrometheusText, mapMetricsToSnapshot } from "@/infrastructure/media-mtx";

// Trimmed real MediaMTX v1.17.0 /metrics output: no streams, then one publishing stream.
const EMPTY = `paths 0
rtsp_conns 0
rtsp_sessions 0
rtmp_conns 0
srt_conns 0
webrtc_sessions 0
hls_muxers 0`;

const ONE_STREAM = `paths{name="probe",state="ready"} 1
paths_bytes_received{name="probe",state="ready"} 80909
paths_bytes_sent{name="probe",state="ready"} 0
paths_readers{name="probe",state="ready"} 0
paths_inbound_frames_in_error{name="probe",state="ready"} 0
rtsp_conns{id="6f82e597"} 1
rtsp_sessions{id="b773b0b9",path="probe",remoteAddr="172.17.0.1:54756",state="publish"} 1
rtsp_sessions_inbound_rtp_packets_lost{id="b773b0b9",path="probe",state="publish"} 0
rtmp_conns 0
srt_conns 0
webrtc_sessions 0
hls_muxers 0`;

describe("parsePrometheusText", () => {
    it("parses labelled and unlabelled samples, skipping comments and non-finite values", () => {
        const samples = parsePrometheusText(
            `# HELP paths count\npaths 2\nfoo{a="1",b="x"} 3.5\nbar NaN\n\n`,
        );
        expect(samples).toEqual([
            { name: "paths", labels: {}, value: 2 },
            { name: "foo", labels: { a: "1", b: "x" }, value: 3.5 },
        ]);
    });
});

describe("mapMetricsToSnapshot", () => {
    it("reports zero node counts and no paths when idle", () => {
        const snap = mapMetricsToSnapshot(parsePrometheusText(EMPTY), PodRole.INGEST, "ingest-1");
        expect(snap.node).toEqual({
            context: PodRole.INGEST,
            node: "ingest-1",
            paths: 0,
            rtspConns: 0,
            rtspSessions: 0,
            rtmpConns: 0,
            srtConns: 0,
            webrtcSessions: 0,
            hlsMuxers: 0,
        });
        expect(snap.paths).toEqual([]);
    });

    it("counts node-level families by summing series, not by prefix", () => {
        const snap = mapMetricsToSnapshot(
            parsePrometheusText(ONE_STREAM),
            PodRole.INGEST,
            "ingest-1",
        );
        // exactly one path + one rtsp conn + one rtsp session; bytes_received must NOT
        // be folded into the "paths" count.
        expect(snap.node.paths).toBe(1);
        expect(snap.node.rtspConns).toBe(1);
        expect(snap.node.rtspSessions).toBe(1);
    });

    it("builds a per-path snapshot keyed by the name label", () => {
        const snap = mapMetricsToSnapshot(
            parsePrometheusText(ONE_STREAM),
            PodRole.INGEST,
            "ingest-1",
        );
        expect(snap.paths).toEqual([
            {
                streamName: "probe",
                context: PodRole.INGEST,
                node: "ingest-1",
                state: "ready",
                ready: true,
                bytesReceived: 80909,
                bytesSent: 0,
                readers: 0,
                framesInError: 0,
            },
        ]);
    });
});
