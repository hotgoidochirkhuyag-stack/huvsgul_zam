import { useQuery, useMutation } from "@tanstack/react-query";
import { MediaResponse } from "@shared/schema";
import { queryClient, apiRequest } from "./queryClient";

export function useMedia() {
  return useQuery<MediaResponse[]>({
    queryKey: ["/api/media"],
  });
}

export function useUploadMedia() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
    },
  });
}

export function useDeleteMedia() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/media/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
    },
  });
}
