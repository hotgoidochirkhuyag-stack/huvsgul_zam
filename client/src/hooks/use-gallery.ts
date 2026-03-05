import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type SuccessGalleryResponse, type InsertSuccessGallery } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export function useGallery() {
  const query = useQuery({
    queryKey: [api.gallery.list.path],
    queryFn: async (): Promise<SuccessGalleryResponse[]> => {
      const res = await fetch(api.gallery.list.path);
      if (!res.ok) throw new Error("Failed to fetch gallery");
      const data = await res.json();
      return api.gallery.list.responses[200].parse(data);
    },
  });

  const createGallery = useMutation({
    mutationFn: async (item: InsertSuccessGallery) => {
      const res = await fetch(api.gallery.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Failed to create gallery item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.gallery.list.path] });
    },
  });

  const deleteGallery = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.gallery.delete.path, { id }), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete gallery item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.gallery.list.path] });
    },
  });

  return {
    ...query,
    createGallery,
    deleteGallery,
  };
}
