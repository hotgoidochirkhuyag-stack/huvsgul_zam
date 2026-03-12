import { useQuery } from "@tanstack/react-query";

export function useGallery(apiUrl: string) {
  return useQuery({
    queryKey: [apiUrl],
    queryFn: async () => {
      console.log("DEBUG [API-Request]:", apiUrl);
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) {
          throw new Error(`HTTP алдаа: ${res.status}`);
        }
        const data = await res.json();
        console.log("DEBUG [API-Success]:", data);
        return data;
      } catch (error) {
        console.error("DEBUG [API-Error]:", error);
        throw error; // Алдааг React Query-д дамжуулна
      }
    },
    staleTime: 0,
    retry: false // Алдаа гарвал дахин дахин оролдохгүй
  });
}