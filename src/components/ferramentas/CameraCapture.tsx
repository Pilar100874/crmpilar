import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsReady(true);
        };
      }
      
      setError(null);
    } catch (err: any) {
      console.error("Erro ao acessar câmera:", err);
      if (err.name === "NotAllowedError") {
        setError("Permissão de câmera negada. Verifique as configurações do navegador.");
      } else if (err.name === "NotFoundError") {
        setError("Nenhuma câmera encontrada neste dispositivo.");
      } else {
        setError(`Erro ao acessar câmera: ${err.message}`);
      }
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    
    video.pause();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleConfirm = () => {
    if (!capturedImage || !canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      }
    }, "image/jpeg", 0.9);
  };

  const handleSwitchCamera = () => {
    setCapturedImage(null);
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  // Renderiza inline (sem createPortal) para ficar dentro do focus trap do Radix Dialog pai
  // position:fixed garante que visualmente cobre toda a tela
  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black flex flex-col"
      style={{ touchAction: "none" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 absolute top-0 left-0 right-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
        
        <span className="text-white text-sm font-medium">
          {capturedImage ? "Confirmar foto" : "Tirar foto"}
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSwitchCamera}
          className="text-white hover:bg-white/20"
          disabled={!!capturedImage}
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Área da câmera/preview */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center p-6">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={startCamera} variant="secondary">
              Tentar novamente
            </Button>
          </div>
        ) : capturedImage ? (
          <img 
            src={capturedImage} 
            alt="Foto capturada" 
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-w-full max-h-full object-contain"
            style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />
        )}
      </div>

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controles */}
      <div className="p-6 bg-black/50 absolute bottom-0 left-0 right-0">
        {capturedImage ? (
          <div className="flex justify-center gap-6">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRetake}
              className="rounded-full px-6"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Tirar outra
            </Button>
            <Button
              size="lg"
              onClick={handleConfirm}
              className="rounded-full px-6 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-5 w-5 mr-2" />
              Usar esta
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={handleCapture}
              disabled={!isReady}
              className="w-20 h-20 rounded-full bg-white border-4 border-white/50 flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-300" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
