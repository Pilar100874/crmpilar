import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCanvas } from "@/contexts/CanvasContext";
import { FabricImage } from "fabric";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { toast } from "@/lib/toast-config";
import { Barcode, QrCode } from "lucide-react";

type BarcodeType = "ean13" | "qrcode";

const BarcodePanel = () => {
  const { fabricCanvas } = useCanvas();
  const [barcodeType, setBarcodeType] = useState<BarcodeType>("qrcode");
  const [inputValue, setInputValue] = useState("");
  const [barcodeColor, setBarcodeColor] = useState("#000000");
  const [isValid, setIsValid] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  // Validate input based on barcode type
  useEffect(() => {
    if (!inputValue) {
      setIsValid(false);
      setValidationMessage("");
      return;
    }

    if (barcodeType === "ean13") {
      // EAN13 must be exactly 12 or 13 digits
      const digitsOnly = inputValue.replace(/\D/g, "");
      if (digitsOnly.length === 12 || digitsOnly.length === 13) {
        setIsValid(true);
        setValidationMessage("✓ EAN13 válido");
      } else {
        setIsValid(false);
        setValidationMessage(`✗ EAN13 precisa de 12-13 dígitos (atual: ${digitsOnly.length})`);
      }
    } else {
      // QR Code accepts any non-empty string
      if (inputValue.trim().length > 0) {
        setIsValid(true);
        setValidationMessage("✓ QR Code válido");
      } else {
        setIsValid(false);
        setValidationMessage("✗ Insira algum conteúdo");
      }
    }
  }, [inputValue, barcodeType]);

  const generateBarcode = async () => {
    if (!fabricCanvas || !isValid) return;

    try {
      let imageUrl: string;

      if (barcodeType === "ean13") {
        // Generate EAN13 barcode
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, inputValue, {
          format: "EAN13",
          width: 2,
          height: 100,
          displayValue: true,
          lineColor: barcodeColor,
        });
        imageUrl = canvas.toDataURL("image/png");
      } else {
        // Generate QR Code
        imageUrl = await QRCode.toDataURL(inputValue, {
          width: 300,
          margin: 2,
          color: {
            dark: barcodeColor,
            light: "#ffffff",
          },
        });
      }

      // Load image and add to canvas
      FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
        img.set({
          left: 100,
          top: 100,
          scaleX: 1,
          scaleY: 1,
        });
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        
        toast.success(`${barcodeType === "ean13" ? "Código de barras" : "QR Code"} adicionado!`);
      });
    } catch (error) {
      console.error("Error generating barcode:", error);
      toast.error("Erro ao gerar código");
    }
  };

  const handleTypeChange = (value: BarcodeType) => {
    setBarcodeType(value);
    setInputValue("");
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Código de Barras</h3>
        <p className="text-sm text-muted-foreground">
          Gere códigos de barras e QR Codes
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Código</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={barcodeType === "ean13" ? "default" : "outline"}
              className="w-full justify-start gap-2"
              onClick={() => handleTypeChange("ean13")}
            >
              <Barcode className="h-4 w-4" />
              <span>EAN13</span>
            </Button>
            <Button
              type="button"
              variant={barcodeType === "qrcode" ? "default" : "outline"}
              className="w-full justify-start gap-2"
              onClick={() => handleTypeChange("qrcode")}
            >
              <QrCode className="h-4 w-4" />
              <span>QR Code</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="barcode-color">Cor do Código</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="barcode-color"
              type="color"
              value={barcodeColor}
              onChange={(e) => setBarcodeColor(e.target.value)}
              className="w-20 h-10 cursor-pointer"
            />
            <Input
              type="text"
              value={barcodeColor}
              onChange={(e) => setBarcodeColor(e.target.value)}
              placeholder="#000000"
              className="flex-1"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="barcode-input">
            {barcodeType === "ean13" ? "Código EAN13" : "Conteúdo do QR Code"}
          </Label>
          <Input
            id="barcode-input"
            type="text"
            placeholder={
              barcodeType === "ean13"
                ? "Digite 12-13 dígitos (ex: 5901234123457)"
                : "Digite qualquer texto ou URL"
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid) {
                generateBarcode();
              }
            }}
          />
          {validationMessage && (
            <p
              className={`text-xs ${
                isValid ? "text-green-600 dark:text-green-400" : "text-destructive"
              }`}
            >
              {validationMessage}
            </p>
          )}
        </div>

        <Button
          onClick={generateBarcode}
          disabled={!isValid}
          className="w-full"
        >
          {barcodeType === "ean13" ? (
            <>
              <Barcode className="h-4 w-4 mr-2" />
              Gerar Código de Barras
            </>
          ) : (
            <>
              <QrCode className="h-4 w-4 mr-2" />
              Gerar QR Code
            </>
          )}
        </Button>
      </div>

      <div className="border-t pt-4 space-y-2">
        <h4 className="text-sm font-medium">Dicas:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          {barcodeType === "ean13" ? (
            <>
              <li>• EAN13 requer exatamente 12 ou 13 dígitos</li>
              <li>• Aceita apenas números</li>
              <li>• Exemplo: 5901234123457</li>
            </>
          ) : (
            <>
              <li>• QR Code aceita qualquer texto</li>
              <li>• Pode conter URLs, texto, números</li>
              <li>• Máximo recomendado: 500 caracteres</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default BarcodePanel;
