import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { CameraWithStatus, CreateCameraBody, UpdateCameraBody, ReorderItem, OnvifDiscoveredDevice, OnvifProfile } from "../types";

export function useCameras() {
  return useQuery<CameraWithStatus[]>({
    queryKey: ["cameras"],
    queryFn: () => apiFetch("/api/cameras"),
    refetchInterval: 30_000,
  });
}

export function useCamera(id: string) {
  return useQuery<CameraWithStatus>({
    queryKey: ["cameras", id],
    queryFn: () => apiFetch(`/api/cameras/${id}`),
  });
}

export function useCreateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCameraBody) =>
      apiFetch<CameraWithStatus>("/api/cameras", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });
}

export function useUpdateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateCameraBody & { id: string }) =>
      apiFetch<CameraWithStatus>(`/api/cameras/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });
}

export function useDeleteCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/cameras/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });
}

export function useReorderCameras() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: ReorderItem[]) =>
      apiFetch("/api/cameras/reorder", { method: "PATCH", body: JSON.stringify(items) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });
}

export function useStartCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/cameras/${id}/start`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });
}

export function useStopCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/cameras/${id}/stop`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });
}

export function useDiscoverOnvif() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ devices: OnvifDiscoveredDevice[] }>("/api/onvif/discover"),
  });
}

export function useProbeOnvif() {
  return useMutation({
    mutationFn: (params: { host: string; port?: number; username?: string; password?: string }) =>
      apiFetch<{ device_info: { manufacturer: string; model: string } | null; profiles: OnvifProfile[] }>(
        "/api/onvif/probe",
        { method: "POST", body: JSON.stringify(params) }
      ),
  });
}
