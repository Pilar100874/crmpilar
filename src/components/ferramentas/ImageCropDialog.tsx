import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Check, X, RotateCcw } from 'lucide-react';

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  aspectRatio?: number;
  freeform?: boolean;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  aspectRatio = 16 / 9,
  freeform = false,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  // Bloquear scroll do body quando aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      if (freeform) {
        setCrop({
          unit: '%',
          x: 10,
          y: 10,
          width: 80,
          height: 80,
        });
      } else {
        setCrop(centerAspectCrop(width, height, aspectRatio));
      }
    },
    [aspectRatio, freeform]
  );

  const handleResetCrop = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (freeform) {
        setCrop({
          unit: '%',
          x: 10,
          y: 10,
          width: 80,
          height: 80,
        });
      } else {
        setCrop(centerAspectCrop(width, height, aspectRatio));
      }
    }
  };

  const getCroppedImg = useCallback(async (): Promise<File | null> => {
    const image = imgRef.current;
    if (!image || !completedCrop) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], 'cropped-image.jpg', {
              type: 'image/jpeg',
            });
            resolve(file);
          } else {
            resolve(null);
          }
        },
        'image/jpeg',
        0.9
      );
    });
  }, [completedCrop]);

  const handleConfirm = async () => {
    try {
      const croppedFile = await getCroppedImg();
      if (croppedFile) {
        onCropComplete(croppedFile);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Erro ao recortar imagem:", error);
    }
  };

  if (!open) return null;

  // Renderiza inline (sem createPortal) para ficar dentro do focus trap do Radix Dialog pai
  // position:fixed garante que visualmente cobre toda a tela
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4"
      style={{ zIndex: 99999 }}
    >
      {/* Overlay escuro */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Conteúdo do modal */}
      <div className="relative bg-background rounded-lg shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: 'calc(100dvh - 16px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b shrink-0">
          <h2 className="text-base sm:text-lg font-semibold">Recortar Imagem</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Área de crop */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 min-h-0">
          <div className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={freeform ? undefined : aspectRatio}
              className="max-h-[calc(100dvh-220px)]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-[calc(100dvh-220px)] object-contain"
              />
            </ReactCrop>
          </div>
        </div>

        {/* Footer com botões */}
        <div className="flex gap-2 p-3 sm:p-4 border-t shrink-0 bg-background">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetCrop}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Resetar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Cancelar</span>
          </Button>
          <Button size="sm" onClick={handleConfirm} className="flex-1">
            <Check className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Confirmar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
