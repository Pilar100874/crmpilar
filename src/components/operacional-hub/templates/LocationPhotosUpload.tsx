import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LocationPhotosUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function LocationPhotosUpload({ 
  photos, 
  onChange, 
  maxPhotos = 3,
  disabled = false 
}: LocationPhotosUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Limite atingido",
        description: `Máximo de ${maxPhotos} fotos permitidas`,
        variant: "destructive",
      });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        const fileName = `location/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from("task-location-photos")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("task-location-photos")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      onChange([...photos, ...uploadedUrls]);
      toast({ title: `${uploadedUrls.length} foto(s) adicionada(s)` });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Erro ao enviar foto",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span>Fotos do Local ({photos.length}/{maxPhotos})</span>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, index) => (
          <div key={index} className="relative aspect-square group">
            <img
              src={url}
              alt={`Local ${index + 1}`}
              className="w-full h-full object-cover rounded-lg border border-border"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute -top-2 -right-2 h-6 w-6 bg-critical text-critical-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        {/* Add photo button */}
        {photos.length < maxPhotos && !disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors bg-muted/30 hover:bg-muted/50"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Camera className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      <p className="text-xs text-muted-foreground">
        Adicione fotos para mostrar onde a tarefa deve ser realizada
      </p>
    </div>
  );
}
