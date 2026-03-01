import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type ProjectResponse } from "@shared/schema";

export function useProjects() {
  return useQuery({
    queryKey: [api.projects.list.path],
    queryFn: async (): Promise<ProjectResponse[]> => {
      const res = await fetch(api.projects.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      
      const data = await res.json();
      // Using custom parsing since zod validation is defined in shared/routes
      return api.projects.list.responses[200].parse(data);
    },
  });
}
