import { describe, expect, it } from "vitest";

import { stageTimestamp } from "@/lib/lifecycle";
import type { Stream } from "@/types";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
  name: "stream-1",
  source: "rtsp://source",
  status: "reserved",
  metadata: {},
  isEnabled: true,
  activeConsumers: 0,
  isManual: false,
  ...overrides,
});

describe("stageTimestamp", () => {
  it("uses updatedAt for a currently reserved stream", () => {
    const stream = makeStream({
      createdAt: "2026-08-14T10:00:00.000Z",
      updatedAt: "2026-08-14T10:01:00.000Z",
    });

    expect(stageTimestamp(stream, "reserved")).toBe(
      "2026-08-14T10:01:00.000Z",
    );
  });

  it("falls back to createdAt when a reserved stream has no updatedAt", () => {
    const stream = makeStream({ createdAt: "2026-08-14T10:00:00.000Z" });

    expect(stageTimestamp(stream, "reserved")).toBe(
      "2026-08-14T10:00:00.000Z",
    );
  });

  it("returns undefined when a reserved stream has no candidate timestamp", () => {
    expect(stageTimestamp(makeStream(), "reserved")).toBeUndefined();
  });

  it("returns undefined for a non-reserved stream regardless of timestamps", () => {
    const stream = makeStream({
      status: "discovered",
      createdAt: "2026-08-14T10:00:00.000Z",
      updatedAt: "2026-08-14T10:01:00.000Z",
    });

    expect(stageTimestamp(stream, "reserved")).toBeUndefined();
  });
});
