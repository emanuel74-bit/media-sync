import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { StreamStatus } from "@/types";
import { wsManager } from "@/services/websocket";
import {
  alertsApi,
  ingestApi,
  inspectionApi,
  metricsApi,
  nodesApi,
  streamsApi,
} from "@/services/api";

export function useStreams() {
  return useQuery({
    queryKey: ["streams"],
    queryFn: () => streamsApi.getAll(),
    refetchInterval: 10000,
  });
}

export function useStream(name: string) {
  return useQuery({
    queryKey: ["stream", name],
    queryFn: () => streamsApi.getByName(name),
    enabled: !!name,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: () => alertsApi.getAll(),
    refetchInterval: 10000,
  });
}

export function useNodes() {
  return useQuery({
    queryKey: ["nodes"],
    queryFn: () => nodesApi.getAll(),
    refetchInterval: 10000,
  });
}

export function useActiveClusterNodes() {
  return useQuery({
    queryKey: ["nodes", "active", "cluster"],
    queryFn: async () => {
      const nodes = await nodesApi.getActive();
      return nodes.filter((node) => node.type === "cluster");
    },
    refetchInterval: 10000,
  });
}

export function useStreamMetrics(name: string, limit = 60) {
  return useQuery({
    queryKey: ["metrics", name, limit],
    queryFn: () => metricsApi.getByStream(name, limit),
    enabled: !!name,
  });
}

export function useStreamInspection(name: string) {
  return useQuery({
    queryKey: ["inspection", name],
    queryFn: () => inspectionApi.getByStream(name),
    enabled: !!name,
    refetchInterval: 30000,
  });
}

export function useStreamInspectionHistory(name: string, limit = 10) {
  return useQuery({
    queryKey: ["inspection-history", name, limit],
    queryFn: () => inspectionApi.getHistory(name, limit),
    enabled: !!name,
  });
}

export function useToggleStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, isEnabled }: { name: string; isEnabled: boolean }) =>
      streamsApi.update(name, { isEnabled }),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: ["streams"] });
      queryClient.invalidateQueries({ queryKey: ["stream", name] });
    },
  });
}

export function useCreateStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; source: string; isEnabled?: boolean }) =>
      streamsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["streams"] }),
  });
}

export function useReserveStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => ingestApi.reserve(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["streams"] }),
  });
}

export function useUpdateStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      data,
    }: {
      name: string;
      data: { source?: string; isEnabled?: boolean; status?: StreamStatus };
    }) => streamsApi.update(name, data),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: ["streams"] });
      queryClient.invalidateQueries({ queryKey: ["stream", name] });
    },
  });
}

export function useDeleteStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => streamsApi.delete(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["streams"] }),
  });
}

export function useAssignStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, nodeId }: { name: string; nodeId: string }) =>
      streamsApi.assign(name, nodeId),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: ["streams"] });
      queryClient.invalidateQueries({ queryKey: ["stream", name] });
      queryClient.invalidateQueries({ queryKey: ["nodes"] });
    },
  });
}

export function useUnassignStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => streamsApi.unassign(name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ["streams"] });
      queryClient.invalidateQueries({ queryKey: ["stream", name] });
      queryClient.invalidateQueries({ queryKey: ["nodes"] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsApi.resolve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    wsManager.connect();

    const invalidateStream = (name?: string) => {
      queryClient.invalidateQueries({ queryKey: ["streams"] });
      if (name) {
        queryClient.invalidateQueries({ queryKey: ["stream", name] });
      }
    };
    const invalidateNodes = () =>
      queryClient.invalidateQueries({ queryKey: ["nodes"] });
    const invalidateAlerts = () =>
      queryClient.invalidateQueries({ queryKey: ["alerts"] });

    const unsubscribers = [
      wsManager.on("stream.synced", (stream) => {
        invalidateStream(stream.name);
        invalidateNodes();
        queryClient.invalidateQueries({ queryKey: ["metrics", stream.name] });
      }),
      wsManager.on("stream.removed", (streamName) => {
        queryClient.invalidateQueries({ queryKey: ["streams"] });
        queryClient.removeQueries({ queryKey: ["stream", streamName] });
        invalidateNodes();
      }),
      wsManager.on("stream.reserved", ({ streamName }) => {
        invalidateStream(streamName);
      }),
      wsManager.on("stream.assigned", ({ streamName }) => {
        invalidateStream(streamName);
        invalidateNodes();
      }),
      wsManager.on("stream.unassigned", (streamName) => {
        invalidateStream(streamName);
        invalidateNodes();
      }),
      wsManager.on("alert.created", invalidateAlerts),
      wsManager.on("alert.updated", invalidateAlerts),
      wsManager.on("alert.resolved", invalidateAlerts),
      wsManager.on("stream.inspected", (inspection) => {
        queryClient.invalidateQueries({
          queryKey: ["inspection", inspection.streamName],
        });
        queryClient.invalidateQueries({
          queryKey: ["inspection-history", inspection.streamName],
        });
      }),
      wsManager.on("node.registered", invalidateNodes),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      wsManager.disconnect();
    };
  }, [queryClient]);
}
