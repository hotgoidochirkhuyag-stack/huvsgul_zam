import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { type ContentResponse } from "@shared/schema";

export function useContent() {
  const { data: content, isLoading } = useQuery<ContentResponse[]>({
    queryKey: [api.content.list.path],
  });

  const updateContent = useMutation({
    mutationFn: async ({ section, updates }: { section: string; updates: any }) => {
      const res = await fetch(buildUrl(api.content.update.path, { section }), {
        method: api.content.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update content");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.content.list.path] });
    },
  });

  const getSection = (section: string) => {
    return content?.find((c) => c.section === section);
  };

  return {
    content,
    isLoading,
    getSection,
    updateContent,
  };
}
