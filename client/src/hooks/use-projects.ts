import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type ProjectResponse, type InsertProject } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export function useProjects() {
  const query = useQuery({
    queryKey: [api.projects.list.path],
    queryFn: async (): Promise<ProjectResponse[]> => {
      const res = await fetch(api.projects.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      
      const data = await res.json();
      return api.projects.list.responses[200].parse(data);
    },
  });

  const createProject = useMutation({
    mutationFn: async (project: InsertProject) => {
      const res = await fetch(api.projects.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.projects.delete.path, { id }), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete project");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
    },
  });

  return {
    ...query,
    createProject,
    deleteProject,
  };
}
