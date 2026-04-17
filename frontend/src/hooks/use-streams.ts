import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    alertsApi,
    inspectionApi,
    metricsApi,
    podsApi,
    streamsApi,
} from "@/services/api";
import { wsManager } from "@/services/websocket";

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

export function usePods() {
    return useQuery({
        queryKey: ["pods"],
        queryFn: () => podsApi.getAll(),
        refetchInterval: 10000,
    });
}

export function useActivePods() {
    return useQuery({
        queryKey: ["pods", "active"],
        queryFn: async () => {
            const pods = await podsApi.getActive();
            return pods.filter((pod) => pod.type === "cluster");
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
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            name,
            isEnabled,
        }: {
            name: string;
            isEnabled: boolean;
        }) => streamsApi.update(name, { isEnabled }),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["streams"] });
            qc.invalidateQueries({ queryKey: ["stream", variables.name] });
        },
    });
}

export function useCreateStream() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            name: string;
            source: string;
            isEnabled?: boolean;
        }) => streamsApi.create(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["streams"] }),
    });
}

export function useUpdateStream() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            name,
            data,
        }: {
            name: string;
            data: { source?: string; isEnabled?: boolean; status?: string };
        }) => streamsApi.update(name, data),
        onSuccess: (_, { name }) => {
            qc.invalidateQueries({ queryKey: ["streams"] });
            qc.invalidateQueries({ queryKey: ["stream", name] });
        },
    });
}

export function useDeleteStream() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => streamsApi.delete(name),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["streams"] }),
    });
}

export function useAssignStream() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ name, podId }: { name: string; podId: string }) =>
            streamsApi.assign(name, podId),
        onSuccess: (_, { name }) => {
            qc.invalidateQueries({ queryKey: ["streams"] });
            qc.invalidateQueries({ queryKey: ["stream", name] });
            qc.invalidateQueries({ queryKey: ["pods"] });
        },
    });
}

export function useUnassignStream() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => streamsApi.unassign(name),
        onSuccess: (_, name) => {
            qc.invalidateQueries({ queryKey: ["streams"] });
            qc.invalidateQueries({ queryKey: ["stream", name] });
            qc.invalidateQueries({ queryKey: ["pods"] });
            qc.invalidateQueries({ queryKey: ["pods", "active"] });
        },
    });
}

export function useResolveAlert() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => alertsApi.resolve(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
    });
}

export function useRealtimeSync() {
    const queryClient = useQueryClient();

    useEffect(() => {
        wsManager.connect();

        const unsubscribeStreamSynced = wsManager.on(
            "stream.synced",
            (stream) => {
                queryClient.invalidateQueries({ queryKey: ["streams"] });
                queryClient.invalidateQueries({
                    queryKey: ["stream", stream.name],
                });
                queryClient.invalidateQueries({ queryKey: ["pods"] });
                queryClient.invalidateQueries({ queryKey: ["pods", "active"] });
                queryClient.invalidateQueries({
                    queryKey: ["metrics", stream.name],
                });
            },
        );

        const unsubscribeStreamRemoved = wsManager.on(
            "stream.removed",
            (streamName) => {
                queryClient.invalidateQueries({ queryKey: ["streams"] });
                queryClient.removeQueries({ queryKey: ["stream", streamName] });
                queryClient.invalidateQueries({ queryKey: ["pods"] });
                queryClient.invalidateQueries({ queryKey: ["pods", "active"] });
            },
        );

        const unsubscribeAlertCreated = wsManager.on("alert.created", () => {
            queryClient.invalidateQueries({ queryKey: ["alerts"] });
        });

        const unsubscribeInspection = wsManager.on(
            "stream.inspected",
            (inspection) => {
                queryClient.invalidateQueries({
                    queryKey: ["inspection", inspection.streamName],
                });
                queryClient.invalidateQueries({
                    queryKey: ["inspection-history", inspection.streamName],
                });
            },
        );

        return () => {
            unsubscribeStreamSynced();
            unsubscribeStreamRemoved();
            unsubscribeAlertCreated();
            unsubscribeInspection();
            wsManager.disconnect();
        };
    }, [queryClient]);
}
