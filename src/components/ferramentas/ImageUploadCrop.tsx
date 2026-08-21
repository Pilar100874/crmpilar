import { uploadFerrFoto } from "@/lib/ferramentas/storage";
import { useState, useId } from "react";
import { Camera, Image, X, AlertCircle, Loader2 } from "lucide-react";
import { CameraCapture } from "./CameraCapture";
import { ImageCropDialog } from "./ImageCropDialog";
import { ImageZoom } from "./ui/image-zoom";
import { supabase } from "@/lib/ferramentas/supabase";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadCropProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  bucket: string;
  folder?: string;
  aspectRatio?: number;
  maxSize?: number;
}

export function ImageUploadCrop({
  value,
  onChange,
  bucket,
  folder = "",
  aspectRatio,
  maxSize = 5,
}: ImageUploadCropProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const galleryInputId = useId();

  // Abre o crop após capturar da câmera
  const handleFileFromCamera = (file: File) => {
    setShowCamera(false);
    const objectUrl = URL.createObjectURL(file);
    setImageToCrop(objectUrl);
    setShowCrop(true);
  };

  // Abre o crop após selecionar da galeria
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Selecione uma imagem");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setImageToCrop(objectUrl);
    setShowCrop(true);
    
    e.target.value = '';
  };

  // Após confirmar o crop, faz upload para Supabase
  const handleCropComplete = async (croppedFile: File) => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }

    setIsUploading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      const filePath = folder 
        ? `${folder}/${timestamp}.jpg`
        : `${timestamp}.jpg`;

      const signedUrl = await uploadFerrFoto(bucket, filePath, croppedFile);

      // Adiciona timestamp para bust de cache
      const finalUrl = `${signedUrl}&t=${timestamp}`;
      setIsImageLoaded(false); // Reset para mostrar loading na nova imagem
      onChange(finalUrl);

      toast({
        title: "Imagem salva!",
        description: "A foto foi enviada com sucesso.",
      });
    } catch (err: any) {
      console.error("Erro no upload:", err);
      setError(err.message || "Erro ao enviar imagem");
      toast({
        variant: "destructive",
        title: "Erro ao enviar imagem",
        description: err.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = async () => {
    // Se tiver uma URL, podemos deletar do storage (opcional)
    onChange(null);
    setError(null);
    setIsImageLoaded(false);
  };

  return (
    <div className="space-y-3">
      {/* Input para galeria */}
      <input
        id={galleryInputId}
        type="file"
        accept="image/*"
        onChange={handleGallerySelect}
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0 }}
      />

      {/* Preview */}
      {value ? (
        <div className="relative inline-block">
          {/* Loading skeleton enquanto imagem carrega */}
          {!isImageLoaded && (
            <div className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center border">
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            </div>
          )}
          {/* Imagem com zoom */}
          <div className={isImageLoaded ? "block" : "hidden"}>
            <ImageZoom
              src={value}
              alt="Preview"
              className="max-h-40 max-w-full"
              thumbnailClassName="max-h-40 max-w-full rounded-lg object-contain border"
              onLoad={() => setIsImageLoaded(true)}
            />
          </div>
          {/* Botão X só aparece quando imagem carregou */}
          {isImageLoaded && (
            <button
              type="button"
              className="absolute -right-2 -top-2 h-6 w-6 z-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
              onClick={handleClear}
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <div
          className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors active:bg-muted"
          onClick={() => !isUploading && setShowCamera(true)}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground/50 animate-spin" />
          ) : (
            <Camera className="h-8 w-8 text-muted-foreground/50" />
          )}
        </div>
      )}

      {/* Botões */}
      {!value && !isUploading && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 cursor-pointer active:scale-95 transition-transform"
          >
            <Camera className="h-4 w-4" />
            Câmera
          </button>
          
          <label
            htmlFor={galleryInputId}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer active:scale-95 transition-transform"
          >
            <Image className="h-4 w-4" />
            Galeria
          </label>
        </div>
      )}

      {/* Loading */}
      {isUploading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Enviando imagem...
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      {/* Modal de câmera */}
      {showCamera && (
        <CameraCapture
          onCapture={handleFileFromCamera}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Modal de crop */}
      <ImageCropDialog
        open={showCrop}
        onOpenChange={setShowCrop}
        imageSrc={imageToCrop || ""}
        onCropComplete={handleCropComplete}
        freeform={true}
      />
    </div>
  );
}
