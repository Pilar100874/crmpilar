import { useState, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { RotateCcw, Check, X, Camera, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CameraCapture } from "@/components/CameraCapture";

interface UseMobileCameraOptions {
  maxSizeMB?: number;
  maxDimension?: number;
  quality?: number;
  aspectRatio?: number;
  enableCrop?: boolean;
}

interface UseMobileCameraReturn {
  capturedImage: string | null;
  isLoading: boolean;
  openCamera: () => void;
  openGallery: () => void;
  clearImage: () => void;
  CropModal: React.ReactNode;
  /** Camera input ID for htmlFor binding */
  cameraInputId: string;
  /** Gallery input ID for htmlFor binding */
  galleryInputId: string;
  /** Hidden inputs to render in JSX - REQUIRED for mobile compatibility */
  HiddenInputs: React.ReactNode;
}

function getInitialCrop(mediaWidth: number, mediaHeight: number, aspect?: number): Crop {
  if (aspect) {
    return centerCrop(
      makeAspectCrop(
        { unit: "%", width: 90 },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  }
  
  return {
    unit: "%",
    x: 5,
    y: 5,
    width: 90,
    height: 90,
  };
}

// Global counter for stable IDs
let globalIdCounter = 0;

export function useMobileCamera(options: UseMobileCameraOptions = {}): UseMobileCameraReturn {
  const { 
    maxSizeMB = 25, 
    maxDimension = 1600,
    quality = 0.85,
    aspectRatio,
    enableCrop = true,
  } = options;
  
  const { toast } = useToast();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Camera capture state (JavaScript camera)
  const [showJsCamera, setShowJsCamera] = useState(false);
  
  // Crop dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Flag to prevent multiple onImageLoad calls
  const cropInitializedRef = useRef(false);
  
  // Generate stable IDs on first render only
  const stableIdsRef = useRef<{ camera: string; gallery: string } | null>(null);
  if (!stableIdsRef.current) {
    const id = ++globalIdCounter;
    stableIdsRef.current = {
      camera: `mc-cam-${id}`,
      gallery: `mc-gal-${id}`,
    };
  }
  const stableIds = stableIdsRef.current;

  // Process image (resize and optionally open crop)
  const processImage = useCallback((dataUrl: string, skipCrop: boolean = false) => {
    console.log("MobileCamera: Processing image, skipCrop:", skipCrop);
    
    const img = new Image();
    
    img.onload = () => {
      console.log("MobileCamera: Image loaded:", img.naturalWidth, "x", img.naturalHeight);
      
      try {
        // Resize large images
        let targetWidth = img.naturalWidth;
        let targetHeight = img.naturalHeight;
        
        if (targetWidth > maxDimension || targetHeight > maxDimension) {
          const ratio = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        }
        
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No canvas context");
        
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const processedDataUrl = canvas.toDataURL("image/jpeg", quality);
        
        if (skipCrop || !enableCrop) {
          // Save directly without crop
          setCapturedImage(processedDataUrl);
          setIsLoading(false);
          console.log("MobileCamera: Image saved directly");
        } else {
          // Open crop dialog
          cropInitializedRef.current = false;
          setImgSrc(processedDataUrl);
          setIsLoading(false);
          setIsDialogOpen(true);
          console.log("MobileCamera: Crop dialog opened");
        }
        
      } catch (error) {
        console.error("MobileCamera: Canvas error:", error);
        toast({
          variant: "destructive",
          title: "Erro ao processar imagem",
          description: "Tente com outra imagem",
        });
        setIsLoading(false);
      }
    };
    
    img.onerror = (e) => {
      console.error("MobileCamera: Image load error", e);
      toast({
        variant: "destructive",
        title: "Imagem inválida",
        description: "O arquivo pode estar corrompido",
      });
      setIsLoading(false);
    };
    
    img.src = dataUrl;
  }, [maxDimension, quality, enableCrop, toast]);

  // Handle file from JavaScript camera
  const handleJsCameraCapture = useCallback((file: File) => {
    setShowJsCamera(false);
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl) {
        // Camera captures go through crop if enabled
        processImage(dataUrl, !enableCrop);
      } else {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Erro ao ler imagem",
      });
    };
    reader.readAsDataURL(file);
  }, [processImage, enableCrop, toast]);

  // Handler for gallery input
  const handleGalleryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log("MobileCamera: Gallery input changed, files:", files?.length);
    
    if (!files || files.length === 0) {
      return;
    }
    
    const file = files[0];
    console.log("MobileCamera: Gallery file info:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    
    // Validate file type
    const mimeType = file.type || "";
    if (mimeType && !mimeType.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Selecione uma imagem válida",
      });
      e.target.value = '';
      return;
    }
    
    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: `O tamanho máximo é ${maxSizeMB}MB`,
      });
      e.target.value = '';
      return;
    }
    
    setIsLoading(true);
    
    const reader = new FileReader();
    
    reader.onload = () => {
      const dataUrl = reader.result as string;
      
      if (!dataUrl || typeof dataUrl !== 'string') {
        console.error("MobileCamera: Invalid gallery result");
        setIsLoading(false);
        e.target.value = '';
        return;
      }
      
      // Clear input
      e.target.value = '';
      
      // Gallery: use crop if enabled
      processImage(dataUrl, false);
    };
    
    reader.onerror = () => {
      console.error("MobileCamera: Gallery reader error");
      setIsLoading(false);
      e.target.value = '';
    };
    
    reader.readAsDataURL(file);
  }, [toast, maxSizeMB, processImage]);

  // Ref for gallery input
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Open JavaScript camera (works on all devices)
  const openCamera = useCallback(() => {
    console.log("MobileCamera: Opening JS camera");
    setShowJsCamera(true);
  }, []);

  const openGallery = useCallback(() => {
    console.log("MobileCamera: openGallery called");
    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
      galleryInputRef.current.click();
    }
  }, []);

  const clearImage = useCallback(() => {
    console.log("MobileCamera: Clearing image");
    setCapturedImage(null);
  }, []);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      // Only initialize crop once per image
      if (cropInitializedRef.current) {
        return;
      }
      cropInitializedRef.current = true;
      
      const { width, height } = e.currentTarget;
      console.log("MobileCamera: Crop image loaded:", width, "x", height);
      const initialCrop = getInitialCrop(width, height, aspectRatio);
      setCrop(initialCrop);
    },
    [aspectRatio]
  );

  const handleClose = useCallback(() => {
    console.log("MobileCamera: Closing dialog");
    setIsDialogOpen(false);
    setTimeout(() => {
      setImgSrc("");
      setCrop(undefined);
      setCompletedCrop(undefined);
      cropInitializedRef.current = false;
    }, 300);
  }, []);

  const handleResetCrop = useCallback(() => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const initialCrop = getInitialCrop(width, height, aspectRatio);
      setCrop(initialCrop);
    }
  }, [aspectRatio]);

  const handleConfirmCrop = useCallback(async () => {
    if (!imgRef.current || !completedCrop) {
      toast({
        variant: "destructive",
        title: "Selecione uma área",
        description: "Arraste para selecionar a área da imagem",
      });
      return;
    }

    setIsCropping(true);
    try {
      const image = imgRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2d context");

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      // Limit max dimensions
      const maxCropDimension = 1200;
      let finalWidth = cropWidth;
      let finalHeight = cropHeight;

      if (cropWidth > maxCropDimension || cropHeight > maxCropDimension) {
        const ratio = Math.min(maxCropDimension / cropWidth, maxCropDimension / cropHeight);
        finalWidth = cropWidth * ratio;
        finalHeight = cropHeight * ratio;
      }

      canvas.width = finalWidth;
      canvas.height = finalHeight;

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        cropWidth,
        cropHeight,
        0,
        0,
        finalWidth,
        finalHeight
      );

      const croppedDataUrl = canvas.toDataURL("image/jpeg", quality);
      
      setCapturedImage(croppedDataUrl);
      setIsDialogOpen(false);
      
      setTimeout(() => {
        setImgSrc("");
        setCrop(undefined);
        setCompletedCrop(undefined);
        cropInitializedRef.current = false;
      }, 300);
      
      console.log("MobileCamera: Image cropped and set");
    } catch (error: any) {
      console.error("Crop error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao recortar imagem",
        description: "Tente novamente",
      });
    } finally {
      setIsCropping(false);
    }
  }, [completedCrop, quality, toast]);

  // Hidden inputs - only gallery now (camera uses JS)
  const HiddenInputs = useMemo(() => (
    <>
      <input
        ref={galleryInputRef}
        id={stableIds.gallery}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
        onChange={handleGalleryChange}
        className="sr-only"
        aria-hidden="true"
      />
    </>
  ), [stableIds.gallery, handleGalleryChange]);

  // Render the crop modal + JS camera
  const CropModal = (
    <>
      {/* JavaScript Camera */}
      {showJsCamera && (
        <CameraCapture
          onCapture={handleJsCameraCapture}
          onClose={() => setShowJsCamera(false)}
        />
      )}
      
      {/* Crop Dialog */}
      {isDialogOpen && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCropping) {
              handleClose();
            }
          }}
        >
          <div className="absolute inset-0 bg-black/80" />
          
          <div className="relative z-10 w-[95vw] max-w-lg rounded-lg border bg-background p-4 shadow-lg animate-in fade-in-0 zoom-in-95">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                Ajustar Foto
              </h2>
            </div>

            <div className="flex items-center justify-center overflow-hidden py-4">
              {imgSrc ? (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspectRatio}
                  className="max-w-full"
                >
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={imgSrc}
                    onLoad={handleImageLoad}
                    className="max-h-[50vh] object-contain"
                    style={{ maxWidth: "100%" }}
                  />
                </ReactCrop>
              ) : (
                <div className="flex h-48 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetCrop}
                disabled={isCropping}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isCropping}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmCrop}
                disabled={isCropping}
              >
                {isCropping ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Confirmar
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );

  return {
    capturedImage,
    isLoading,
    openCamera,
    openGallery,
    clearImage,
    CropModal,
    cameraInputId: stableIds.camera,
    galleryInputId: stableIds.gallery,
    HiddenInputs,
  };
}