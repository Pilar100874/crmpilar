import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, ArrowLeft, ArrowRight, ImageIcon, X } from "lucide-react";
import { useCallback, useState, memo, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { CameraCapture } from "./CameraCapture";
import { ImageCropDialog } from "./ImageCropDialog";

interface PhotoCapture {
  loanId: string;
  toolName: string;
  kitName?: string;
  photo: string | null;
}

interface ReturnPhotoCaptureCardProps {
  photoCaptures: PhotoCapture[];
  currentPhotoIndex: number;
  onPhotoUpdate: (index: number, photo: string) => void;
  onPhotoRemove: (index: number) => void;
  onIndexChange: (index: number) => void;
  onBack: () => void;
  onContinue: () => void;
  canProceed: boolean;
}

export const ReturnPhotoCaptureCard = memo(function ReturnPhotoCaptureCard({
  photoCaptures,
  currentPhotoIndex,
  onPhotoUpdate,
  onPhotoRemove,
  onIndexChange,
  onBack,
  onContinue,
  canProceed,
}: ReturnPhotoCaptureCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const { toast } = useToast();
  const currentIndexRef = useRef(currentPhotoIndex);
  
  // Keep ref updated
  useEffect(() => {
    currentIndexRef.current = currentPhotoIndex;
  }, [currentPhotoIndex]);

  const processImage = useCallback((dataUrl: string) => {
    console.log("ReturnPhoto: Processing image data");
    
    const img = new window.Image();
    
    img.onload = () => {
      console.log("ReturnPhoto: Image loaded", img.naturalWidth, "x", img.naturalHeight);
      
      try {
        // Resize to max 1200px
        const maxDimension = 1200;
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No canvas context");
        
        ctx.drawImage(img, 0, 0, width, height);
        const processedUrl = canvas.toDataURL("image/jpeg", 0.85);
        
        console.log("ReturnPhoto: Image processed, updating index:", currentIndexRef.current);
        
        onPhotoUpdate(currentIndexRef.current, processedUrl);
        setIsLoading(false);
        
      } catch (error) {
        console.error("ReturnPhoto: Canvas error", error);
        toast({
          variant: "destructive",
          title: "Erro ao processar imagem",
          description: "Tente novamente",
        });
        setIsLoading(false);
      }
    };
    
    img.onerror = () => {
      console.error("ReturnPhoto: Image load error");
      toast({
        variant: "destructive",
        title: "Imagem inválida",
        description: "Tente outra foto",
      });
      setIsLoading(false);
    };
    
    img.src = dataUrl;
  }, [onPhotoUpdate, toast]);

  // Handle camera capture (via JavaScript camera)
  const handleCameraCapture = useCallback((file: File) => {
    setShowCamera(false);
    const objectUrl = URL.createObjectURL(file);
    setImageToCrop(objectUrl);
    setShowCrop(true);
  }, []);

  // Handle crop complete
  const handleCropComplete = useCallback((croppedFile: File) => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }
    
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl) {
        processImage(dataUrl);
      } else {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Erro ao processar imagem",
      });
    };
    reader.readAsDataURL(croppedFile);
  }, [imageToCrop, processImage, toast]);

  const handleRemovePhoto = useCallback(() => {
    onPhotoRemove(currentPhotoIndex);
  }, [currentPhotoIndex, onPhotoRemove]);

  const currentCapture = photoCaptures[currentPhotoIndex];

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
          <Camera className="h-8 w-8 text-amber-600" />
        </div>
        <CardTitle>Fotos Obrigatórias</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ferramenta {currentPhotoIndex + 1} de {photoCaptures.length}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current tool name */}
        <div className="rounded-lg bg-muted p-3 text-center">
          {currentCapture?.kitName && (
            <p className="text-xs text-primary font-medium mb-1">
              Kit: {currentCapture.kitName}
            </p>
          )}
          <p className="font-semibold">{currentCapture?.toolName}</p>
        </div>

        {/* Photo thumbnails */}
        {photoCaptures.length > 1 && (
          <div className="flex gap-2 justify-center overflow-x-auto pb-2">
            {photoCaptures.map((capture, index) => (
              <button
                key={capture.loanId}
                onClick={() => onIndexChange(index)}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                  index === currentPhotoIndex
                    ? "border-primary"
                    : capture.photo
                    ? "border-green-500"
                    : "border-muted"
                }`}
              >
                {capture.photo ? (
                  <img src={capture.photo} alt="" className="h-full w-full rounded-md object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Photo capture area */}
        {isLoading ? (
          <div className="h-40 w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground mt-2">Processando foto...</span>
          </div>
        ) : currentCapture?.photo ? (
          <div className="relative">
            <img
              src={currentCapture.photo}
              alt="Preview"
              className="w-full rounded-lg max-h-64 object-contain"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2"
              onClick={handleRemovePhoto}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div 
              className="h-40 w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setShowCamera(true)}
            >
              <Camera className="h-10 w-10 text-muted-foreground mb-3" />
              <span className="text-muted-foreground text-sm">Capture uma foto da ferramenta</span>
            </div>
            
            {/* Camera button only */}
            <Button
              type="button"
              onClick={() => setShowCamera(true)}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Abrir Câmera
            </Button>
          </div>
        )}

        {/* Navigation between photos */}
        {photoCaptures.length > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPhotoIndex === 0}
              onClick={() => onIndexChange(currentPhotoIndex - 1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center text-sm text-muted-foreground self-center">
              {currentPhotoIndex + 1} / {photoCaptures.length}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPhotoIndex === photoCaptures.length - 1}
              onClick={() => onIndexChange(currentPhotoIndex + 1)}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Voltar
          </Button>
          <Button
            onClick={onContinue}
            disabled={!canProceed}
            className="flex-1"
          >
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {/* JavaScript Camera */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Crop Dialog */}
      <ImageCropDialog
        open={showCrop}
        onOpenChange={setShowCrop}
        imageSrc={imageToCrop || ""}
        onCropComplete={handleCropComplete}
        freeform={true}
      />
    </Card>
  );
});
