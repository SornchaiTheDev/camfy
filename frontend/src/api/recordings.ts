import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Recording, RecordingsPage } from "../types";

export function useInfiniteRecordings(params: { camera_id?: string; date?: string; limit?: number }) {
  const limit = params.limit ?? 50;
  return useInfiniteQuery<RecordingsPage>({
    queryKey: ["recordings", params],
    queryFn: ({ pageParam = 1 }) => {
      const qs = new URLSearchParams();
      if (params.camera_id) qs.set("camera_id", params.camera_id);
      if (params.date) qs.set("date", params.date);
      qs.set("page", String(pageParam));
      qs.set("limit", String(limit));
      return apiFetch(`/api/recordings?${qs}`);
    },
    getNextPageParam: (last) => {
      const loaded = last.page * last.limit;
      return loaded < last.total ? last.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useDeleteRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/recordings/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recordings"] }),
  });
}

export function useBulkDeleteRecordings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { camera_id?: string; before?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>);
      return apiFetch(`/api/recordings?${qs}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recordings"] }),
  });
}

export type { Recording };
