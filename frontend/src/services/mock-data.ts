import { Stream, Alert, Metric, StreamInspection, StreamTrack, Pod, StreamStatus } from '@/types';

const podIds = ['pod-alpha-01', 'pod-alpha-02', 'pod-beta-01', 'pod-beta-02', 'pod-gamma-01'];
const streamStatuses: StreamStatus[] = ['active', 'active', 'active', 'inactive', 'error', 'discovered', 'assigned'];
const sources = ['rtsp://cam-', 'rtmp://ingest-', 'srt://feed-'];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)]; }
function ago(hours: number) { return new Date(Date.now() - hours * 3600000).toISOString(); }

export function generateStreams(count = 42): Stream[] {
  return Array.from({ length: count }, (_, i) => {
    const status = pick(streamStatuses);
    const name = `stream-${String(i + 1).padStart(3, '0')}`;
    return {
      _id: crypto.randomUUID(),
      name,
      source: `${pick(sources)}${name}.local:${8554 + i}`,
      status,
      metadata: {},
      enabled: status !== 'inactive' || Math.random() > 0.3,
      lastSeenAt: ago(Math.random() * 2),
      lastSyncedAt: ago(Math.random() * 4),
      lastError: status === 'error' ? 'Connection timeout after 30s' : undefined,
      activeConsumers: status === 'active' ? rand(0, 12) : 0,
      assignedPod: Math.random() > 0.15 ? pick(podIds) : undefined,
      assignedAt: ago(rand(1, 72)),
      createdAt: ago(rand(100, 500)),
      updatedAt: ago(Math.random() * 10),
    };
  });
}

export function generatePods(): Pod[] {
  const podStatuses: Pod['status'][] = ['active', 'active', 'active', 'inactive', 'draining'];
  return podIds.map((podId, i) => ({
    _id: crypto.randomUUID(),
    podId,
    host: `10.0.${Math.floor(i / 2)}.${10 + i}`,
    tags: i < 2 ? ['ingest'] : ['cluster', ...(i === 4 ? ['gpu'] : [])],
    status: podStatuses[i] || 'active',
    lastHeartbeatAt: podStatuses[i] === 'inactive' ? ago(1) : ago(Math.random() * 0.02),
    createdAt: ago(rand(200, 600)),
    updatedAt: ago(Math.random() * 0.5),
  }));
}

export function generateAlerts(streams: Stream[]): Alert[] {
  const types = ['high_latency', 'packet_loss', 'fps_drop', 'connection_lost', 'bitrate_anomaly'];
  const severities: Alert['severity'][] = ['info', 'warning', 'critical'];
  const messages: Record<string, string> = {
    high_latency: 'Latency exceeded 200ms threshold',
    packet_loss: 'Packet loss above 5% detected',
    fps_drop: 'FPS dropped below 15',
    connection_lost: 'Stream connection lost',
    bitrate_anomaly: 'Bitrate deviation >40% from baseline',
  };
  return Array.from({ length: 28 }, () => {
    const type = pick(types);
    const resolved = Math.random() > 0.4;
    return {
      _id: crypto.randomUUID(),
      streamName: pick(streams).name,
      type,
      severity: pick(severities),
      message: messages[type],
      resolved,
      resolvedAt: resolved ? ago(Math.random() * 24) : undefined,
      createdAt: ago(rand(1, 96)),
      updatedAt: ago(Math.random() * 10),
    };
  });
}

export function generateMetrics(streamName: string, count = 60): Metric[] {
  return Array.from({ length: count }, (_, i) => ({
    _id: crypto.randomUUID(),
    streamName,
    context: (Math.random() > 0.5 ? 'ingest' : 'cluster') as Metric['context'],
    bitrate: 2500 + Math.sin(i * 0.3) * 800 + (Math.random() - 0.5) * 400,
    fps: 28 + Math.sin(i * 0.2) * 3 + (Math.random() - 0.5) * 2,
    latency: 45 + Math.sin(i * 0.15) * 25 + (Math.random() - 0.5) * 15,
    jitter: 5 + Math.random() * 10,
    packetLoss: Math.max(0, Math.random() * 3 - 1),
    consumers: rand(1, 8),
    createdAt: new Date(Date.now() - (count - i) * 60000).toISOString(),
    updatedAt: new Date(Date.now() - (count - i) * 60000).toISOString(),
  }));
}

const videoCodecs = ['H.264', 'H.265/HEVC', 'VP9', 'AV1'];
const audioCodecs = ['AAC', 'Opus', 'MP3', 'FLAC'];
const resolutions: [number, number][] = [[1920, 1080], [3840, 2160], [1280, 720], [2560, 1440]];

export function generateInspection(streamName: string, source: 'ingest' | 'cluster'): StreamInspection {
  const [w, h] = pick(resolutions);
  const tracks: StreamTrack[] = [
    { type: 'video', codec: pick(videoCodecs), bitrate: rand(1500, 8000), width: w, height: h, fps: pick([24, 25, 30, 50, 60]) },
    { type: 'audio', codec: pick(audioCodecs), bitrate: rand(96, 320), channels: pick([1, 2, 6]), sampleRate: pick([44100, 48000]), language: pick(['en', 'es', 'fr', 'de', undefined]) },
  ];
  if (Math.random() > 0.7) tracks.push({ type: 'subtitle', codec: 'SRT', language: 'en' });
  return {
    _id: crypto.randomUUID(),
    streamName,
    source,
    tracks,
    metadata: { encoder: pick(['FFmpeg', 'OBS', 'GStreamer', 'Wirecast']) },
    lastError: Math.random() > 0.85 ? 'Probe timeout' : undefined,
    inspectedAt: ago(Math.random() * 0.5),
    createdAt: ago(Math.random() * 2),
    updatedAt: ago(Math.random() * 0.5),
  };
}

export function generateInspectionHistory(streamName: string, limit = 10): StreamInspection[] {
  return Array.from({ length: limit }, (_, i) => {
    const insp = generateInspection(streamName, pick(['ingest', 'cluster']));
    insp.inspectedAt = ago(i * 0.5 + Math.random() * 0.3);
    insp.createdAt = insp.inspectedAt;
    return insp;
  });
}

// Singleton mock data
let _streams: Stream[] | null = null;
let _alerts: Alert[] | null = null;
let _pods: Pod[] | null = null;

export function getMockStreams() {
  if (!_streams) _streams = generateStreams();
  return _streams;
}

export function getMockAlerts() {
  if (!_alerts) _alerts = generateAlerts(getMockStreams());
  return _alerts;
}

export function getMockPods() {
  if (!_pods) _pods = generatePods();
  return _pods;
}

export function addMockStream(data: { name: string; source: string; enabled?: boolean }): Stream {
  const streams = getMockStreams();
  const newStream: Stream = {
    _id: crypto.randomUUID(),
    name: data.name,
    source: data.source,
    status: 'discovered',
    metadata: {},
    enabled: data.enabled ?? false,
    activeConsumers: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  streams.push(newStream);
  return newStream;
}

export function updateMockStream(name: string, data: { source?: string; enabled?: boolean; status?: string; metadata?: Record<string, any> }): Stream | undefined {
  const streams = getMockStreams();
  const s = streams.find(s => s.name === name);
  if (!s) return undefined;
  if (data.source !== undefined) s.source = data.source;
  if (data.enabled !== undefined) s.enabled = data.enabled;
  if (data.status !== undefined) s.status = data.status as Stream['status'];
  if (data.metadata !== undefined) s.metadata = { ...s.metadata, ...data.metadata };
  s.updatedAt = new Date().toISOString();
  return s;
}

export function deleteMockStream(name: string): boolean {
  const streams = getMockStreams();
  const idx = streams.findIndex(s => s.name === name);
  if (idx === -1) return false;
  streams.splice(idx, 1);
  return true;
}

export function assignMockStream(name: string, podId: string): Stream | undefined {
  const streams = getMockStreams();
  const s = streams.find(s => s.name === name);
  if (!s) return undefined;
  s.assignedPod = podId;
  s.assignedAt = new Date().toISOString();
  s.status = 'assigned';
  s.updatedAt = new Date().toISOString();
  return s;
}

export function unassignMockStream(name: string): Stream | undefined {
  const streams = getMockStreams();
  const s = streams.find(s => s.name === name);
  if (!s) return undefined;
  s.assignedPod = undefined;
  s.assignedAt = undefined;
  s.status = 'discovered';
  s.updatedAt = new Date().toISOString();
  return s;
}

export function rebalanceMockStreams() {
  const streams = getMockStreams();
  const pods = getMockPods().filter(p => p.status === 'active' && p.tags.includes('cluster'));
  const unassigned = streams.filter(s => !s.assignedPod && s.enabled);
  unassigned.forEach((s, i) => {
    const pod = pods[i % pods.length];
    if (pod) {
      s.assignedPod = pod.podId;
      s.assignedAt = new Date().toISOString();
      s.status = 'assigned';
    }
  });
  return {
    message: 'Rebalancing initiated',
    totalStreams: streams.length,
    assignedStreams: streams.filter(s => s.assignedPod).length,
    unassignedStreams: streams.filter(s => !s.assignedPod).length,
  };
}
