import { useState, useRef } from "react";
import { useMedia, useUploadMedia, useDeleteMedia } from "@/hooks/use-media";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Trash2, Image as ImageIcon, Video, Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MediaPickerProps {
  onSelect: (url: string) => void;
  allowedTypes?: ("image" | "video")[];
}

export default function MediaPicker({ onSelect, allowedTypes = ["image", "video"] }: MediaPickerProps) {
  const { data: media, isLoading } = useMedia();
  const uploadMutation = useUploadMedia();
  const deleteMutation = useDeleteMedia();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadMutation.mutateAsync(file);
      toast({ title: "Амжилттай", description: "Файл ачааллаа." });
    } catch (err) {
      toast({ title: "Алдаа", description: "Файл ачаалахад алдаа гарлаа.", variant: "destructive" });
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Хууллаа", description: "URL хаягийг хуулж авлаа." });
  };

  return (
    <div className="space-y-4 p-4 bg-card border rounded-lg max-h-[500px] overflow-y-auto">
      <div className="flex justify-between items-center">
        <h3 className="font-bold uppercase text-sm tracking-wider">Медиа сан</h3>
        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept={allowedTypes.map(t => t === "image" ? "image/*" : "video/*").join(",")} />
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
          <Upload className="w-4 h-4 mr-2" /> {uploadMutation.isPending ? "Уншиж ба nuclei..." : "Хуулах"}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {isLoading ? (
          <p>Уншиж байна...</p>
        ) : media?.map((item) => (
          <Card key={item.id} className="group relative overflow-hidden border-primary/10">
            <CardContent className="p-0 aspect-video relative">
              {item.type === "image" ? (
                <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Video className="w-8 h-8 text-primary/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => onSelect(item.url)}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => copyToClipboard(item.url)}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => deleteMutation.mutate(item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
            <div className="p-2 text-[10px] truncate bg-background/80">{item.filename}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
