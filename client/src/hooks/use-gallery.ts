import { useQuery } from "@tanstack/react-query";

export function useGallery(apiUrl: string) {
  return useQuery({
    queryKey: [apiUrl],
    queryFn: async () => {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP алдаа: ${res.status}`);
      return res.json();
    },
    staleTime: 60000,
    retry: false,
  });
}
