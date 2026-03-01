import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertContact, type ContactResponse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useCreateContact() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertContact): Promise<ContactResponse> => {
      const validated = api.contacts.create.input.parse(data);
      
      const res = await fetch(api.contacts.create.path, {
        method: api.contacts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to submit contact form");
      }
      
      return api.contacts.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({
        title: "Амжилттай илгээгдлээ", // Successfully sent
        description: "Бид тантай тун удахгүй холбогдох болно.", // We will contact you soon
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Алдаа гарлаа", // Error occurred
        description: error.message,
      });
    }
  });
}
