import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X, SwitchCamera } from "lucide-react";

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isInitializedRef = useRef(false);
  const [scannerId] = useState(() => `qr-scanner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        const state = scanner.getState();
        if (state === 2) { // SCANNING
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) {
        console.log("Scanner cleanup:", err);
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async (mode: "environment" | "user") => {
    // Prevent multiple initializations
    if (scannerRef.current) {
      await stopScanner();
    }

    setIsStarting(true);
    setError(null);

    // Wait for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 300));

    const container = document.getElementById(scannerId);
    if (!container) {
      console.error("Scanner container not found:", scannerId);
      setError("Erro ao inicializar scanner");
      setIsStarting(false);
      return;
    }

    // Clear container completely to remove any duplicate video elements
    container.innerHTML = '';

    try {
      const scanner = new Html5Qrcode(scannerId, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: mode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          try {
            await scanner.stop();
          } catch {
            // Ignore
          }
          onScan(decodedText);
          onClose();
        },
        () => {
          // Ignore scan errors (no QR found)
        }
      );

      setIsStarting(false);
    } catch (err: any) {
      console.error("Scanner error:", err);
      setError(
        err?.message?.includes("Permission")
          ? "Permissão da câmera negada. Verifique as configurações do navegador."
          : "Não foi possível acessar a câmera"
      );
      setIsStarting(false);
    }
  }, [scannerId, onScan, onClose, stopScanner]);

  // Initialize scanner only once on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      startScanner(facingMode);
    }

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCamera = async () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    await startScanner(newMode);
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Escanear QR Code</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scanner Area */}
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          {error ? (
            <div className="text-center">
              <Camera className="mx-auto h-16 w-16 text-destructive/50" />
              <p className="mt-4 text-sm text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <div className="relative w-full max-w-sm overflow-hidden rounded-lg">
                {/* Scanner container - html5-qrcode will inject the video here */}
                <div 
                  id={scannerId} 
                  className="w-full [&>video]:!w-full [&>video]:!h-auto [&>video]:!object-cover"
                  style={{ minHeight: 300 }}
                />
                {isStarting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Camera className="mx-auto h-12 w-12 animate-pulse text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Iniciando câmera...
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Posicione o QR Code dentro da área de leitura
              </p>

              {/* Botão grande para trocar câmera */}
              <Button
                variant="outline"
                size="lg"
                className="mt-6 gap-2"
                onClick={toggleCamera}
                disabled={isStarting}
              >
                <SwitchCamera className="h-5 w-5" />
                Trocar Câmera
              </Button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
