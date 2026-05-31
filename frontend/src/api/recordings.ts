import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Recording, RecordingsPage } from "../types";

export function useRecordings(params: { camera_id?: string; date?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params.camera_id) qs.set("camera_id", params.camera_id);
  if (params.date) qs.set("date", params.date);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  return useQuery<RecordingsPage>({
    queryKey: ["recordings", params],
    queryFn: () => apiFetch(`/api/recordings?${qs}`),
    enabled: !!params.camera_id,
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
