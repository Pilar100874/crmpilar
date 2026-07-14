import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Printer, CheckCircle, XCircle, Image as ImageIcon, Zap } from "lucide-react";
import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getTemplateForBarcode, printZebraLabels } from "@/lib/zebraTemplates";

interface EmbalagemTabProps {
  ean13: string;
  ean14_1: string;
  ean14_2: string;
  imgEan13: string;
  imgEan14_1: string;
  imgEan14_2: string;
  estabelecimentoId: string;
  productData?: any;
  onEan13Change: (value: string) => void;
  onEan14_1Change: (value: string) => void;
  onEan14_2Change: (value: string) => void;
  onImgEan13Change: (url: string) => void;
  onImgEan14_1Change: (url: string) => void;
  onImgEan14_2Change: (url: string) => void;
}

// Calcula dígito verificador para EAN-13
function calcularDigitoVerificadorEan13(digits: string): number {
  if (digits.length !== 12) return -1;
  
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    soma += (i % 2 === 0) ? digit : digit * 3;
  }
  
  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

// Valida EAN-13 completo
function validarEan13(ean: string): boolean {
  if (!/^\d{13}$/.test(ean)) return false;
  
  const digits = ean.substring(0, 12);
  const checkDigit = parseInt(ean[12], 10);
  
  return calcularDigitoVerificadorEan13(digits) === checkDigit;
}

// Calcula dígito verificador para EAN-14
function calcularDigitoVerificadorEan14(digits: string): number {
  if (digits.length !== 13) return -1;
  
  let soma = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(digits[i], 10);
    soma += (i % 2 === 0) ? digit * 3 : digit;
  }
  
  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

// Calcula EAN-14 a partir do EAN-13
function calcularEan14(ean13: string, indicador: number): string {
  if (!validarEan13(ean13)) return "";
  
  // Pega os 12 primeiros dígitos do EAN-13 (sem o check digit)
  const baseDigits = ean13.substring(0, 12);
  
  // Adiciona o indicador de embalagem no início
  const ean14Sem_Digito = indicador.toString() + baseDigits;
  
  // Calcula novo dígito verificador
  const checkDigit = calcularDigitoVerificadorEan14(ean14Sem_Digito);
  
  return ean14Sem_Digito + checkDigit.toString();
}

export function EmbalagemTab({
  ean13,
  ean14_1,
  ean14_2,
  imgEan13,
  imgEan14_1,
  imgEan14_2,
  estabelecimentoId,
  productData,
  onEan13Change,
  onEan14_1Change,
  onEan14_2Change,
  onImgEan13Change,
  onImgEan14_1Change,
  onImgEan14_2Change,
}: EmbalagemTabProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [ean13Valid, setEan13Valid] = useState<boolean | null>(null);
  const [printDialog, setPrintDialog] = useState<{ open: boolean; ean: string; type: string }>({
    open: false,
    ean: "",
    type: "",
  });
  const [printQuantity, setPrintQuantity] = useState("1");
  const [zebraDialog, setZebraDialog] = useState<{ open: boolean; ean: string; kind: "ean13" | "ean14"; label: string }>({
    open: false,
    ean: "",
    kind: "ean13",
    label: "",
  });
  const [zebraQty, setZebraQty] = useState("1");

  const handleEan13Change = (value: string) => {
    // Apenas números
    const cleanValue = value.replace(/\D/g, "").substring(0, 13);
    onEan13Change(cleanValue);

    if (cleanValue.length === 13) {
      const isValid = validarEan13(cleanValue);
      setEan13Valid(isValid);

      if (isValid) {
        // Calcula EAN-14 automaticamente
        const ean14_1_calc = calcularEan14(cleanValue, 1);
        const ean14_2_calc = calcularEan14(cleanValue, 2);
        onEan14_1Change(ean14_1_calc);
        onEan14_2Change(ean14_2_calc);
      } else {
        onEan14_1Change("");
        onEan14_2Change("");
      }
    } else if (cleanValue.length === 12) {
      // Calcula o dígito verificador automaticamente
      const checkDigit = calcularDigitoVerificadorEan13(cleanValue);
      const fullEan13 = cleanValue + checkDigit.toString();
      onEan13Change(fullEan13);
      setEan13Valid(true);
      
      // Calcula EAN-14 automaticamente
      const ean14_1_calc = calcularEan14(fullEan13, 1);
      const ean14_2_calc = calcularEan14(fullEan13, 2);
      onEan14_1Change(ean14_1_calc);
      onEan14_2Change(ean14_2_calc);
    } else {
      setEan13Valid(null);
      onEan14_1Change("");
      onEan14_2Change("");
    }
  };

  const uploadImage = async (file: File, type: "ean13" | "ean14_1" | "ean14_2"): Promise<string | null> => {
    try {
      setUploading(type);
      const fileExt = file.name.split(".").pop();
      const fileName = `${estabelecimentoId}/embalagem_${type}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("produtos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("produtos").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao fazer upload da imagem");
      return null;
    } finally {
      setUploading(null);
    }
  };

  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "ean13" | "ean14_1" | "ean14_2"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecione um arquivo de imagem");
      return;
    }

    const url = await uploadImage(file, type);
    if (url) {
      if (type === "ean13") onImgEan13Change(url);
      else if (type === "ean14_1") onImgEan14_1Change(url);
      else onImgEan14_2Change(url);
      toast.success("Imagem carregada com sucesso");
    }
  };

  const openPrintDialog = (ean: string, type: string) => {
    if (!ean) {
      toast.error("EAN não disponível para impressão");
      return;
    }
    setPrintDialog({ open: true, ean, type });
    setPrintQuantity("1");
  };

  const generateBarcodePDF = () => {
    const quantity = parseInt(printQuantity, 10);
    if (isNaN(quantity) || quantity < 1 || quantity > 100) {
      toast.error("Quantidade deve ser entre 1 e 100");
      return;
    }

    try {
      const { ean, type } = printDialog;
      const cleanEan = (ean || "").replace(/\D/g, "");
      const isEan13 = type === "EAN-13";
      const format: "EAN13" | "ITF14" = isEan13 ? "EAN13" : "ITF14";

      // Validação de comprimento
      if (isEan13 && cleanEan.length !== 13) {
        toast.error(`EAN-13 inválido: precisa ter 13 dígitos (atual: ${cleanEan.length}). Preencha o EAN corretamente antes de imprimir.`);
        return;
      }
      if (!isEan13 && cleanEan.length !== 14) {
        toast.error(`EAN-14 inválido: precisa ter 14 dígitos (atual: ${cleanEan.length}). Preencha o EAN-13 corretamente para gerar o EAN-14.`);
        return;
      }

      // Cria canvas para gerar o código de barras
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, cleanEan, {
        format,
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 10,
      });

      // Cria PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 60;
      const imgHeight = 30;
      const margin = 10;
      const cols = 3;
      const rows = 9;
      const perPage = cols * rows;

      let currentPage = 0;
      let itemCount = 0;

      for (let i = 0; i < quantity; i++) {
        const pageIndex = Math.floor(itemCount / perPage);
        const posInPage = itemCount % perPage;
        const col = posInPage % cols;
        const row = Math.floor(posInPage / cols);

        if (pageIndex > currentPage) {
          pdf.addPage();
          currentPage = pageIndex;
        }

        const x = margin + col * (imgWidth + 5);
        const y = margin + row * (imgHeight + 5);

        pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
        itemCount++;
      }

      pdf.save(`etiquetas_${type.replace(/[^a-zA-Z0-9]/g, "_")}_${cleanEan}.pdf`);
      toast.success(`PDF com ${quantity} etiqueta(s) gerado com sucesso`);
      setPrintDialog({ open: false, ean: "", type: "" });
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error(`Erro ao gerar PDF: ${error?.message || "verifique o código EAN"}`);
    }
  };

  const openZebraDialog = (value: string, kind: "ean13" | "ean14", label: string) => {
    if (!value) { toast.error("EAN não disponível"); return; }
    const clean = value.replace(/\D/g, "");
    if (kind === "ean13" && clean.length !== 13) {
      toast.error(`EAN-13 inválido: precisa ter 13 dígitos (atual: ${clean.length}).`);
      return;
    }
    if (kind === "ean14" && clean.length !== 14) {
      toast.error(`EAN-14 inválido: precisa ter 14 dígitos (atual: ${clean.length}). Preencha o EAN-13 corretamente.`);
      return;
    }
    const template = getTemplateForBarcode(estabelecimentoId, kind);
    if (!template) {
      toast.error(`Nenhum template Zebra padrão definido para ${kind.toUpperCase()}. Configure em Configurações de Vendas → Impressão de Etiquetas Zebra.`);
      return;
    }
    setZebraQty("1");
    setZebraDialog({ open: true, ean: value, kind, label });
  };

  const confirmZebraPrint = async () => {
    const qty = parseInt(zebraQty, 10);
    if (!qty || qty < 1 || qty > 500) { toast.error("Quantidade inválida (1 a 500)"); return; }
    const template = getTemplateForBarcode(estabelecimentoId, zebraDialog.kind);
    if (!template) { toast.error("Template não encontrado"); return; }
    try {
      const product = {
        ...(productData || {}),
        ean_13: ean13,
        ean_14_1: ean14_1,
        ean_14_2: ean14_2,
      };
      await printZebraLabels(template, product, qty);
      toast.success(`Enviando ${qty} etiqueta(s) para impressão...`);
      setZebraDialog({ ...zebraDialog, open: false });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao imprimir");
    }
  };

  const EanField = ({
    label,
    value,
    onChange,
    imageUrl,
    onImageChange,
    type,
    isCalculated = false,
    isValid,
  }: {
    label: string;
    value: string;
    onChange?: (value: string) => void;
    imageUrl: string;
    onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type: "ean13" | "ean14_1" | "ean14_2";
    isCalculated?: boolean;
    isValid?: boolean | null;
  }) => (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{label}</Label>
        {!isCalculated && isValid !== null && (
          <span className={`flex items-center gap-1 text-sm ${isValid ? "text-green-600" : "text-red-600"}`}>
            {isValid ? (
              <>
                <CheckCircle className="w-4 h-4" /> Válido
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" /> Inválido
              </>
            )}
          </span>
        )}
      </div>

      <div className="flex gap-4 items-start">
        {/* Campo EAN + Dígito Verificador */}
        <div className="flex-1">
          <div className="flex gap-2 items-center">
            <Input
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder={isCalculated ? "Calculado automaticamente" : "Digite 12 ou 13 dígitos"}
              readOnly={isCalculated}
              className={`font-mono flex-1 ${isCalculated ? "bg-muted/50" : ""}`}
              maxLength={isCalculated ? 14 : 13}
            />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground mb-0.5">DV</span>
              <Input
                value={isCalculated 
                  ? (value.length === 14 ? value.slice(-1) : "")
                  : (value.length === 13 ? value.slice(-1) : "")
                }
                readOnly
                className="w-12 text-center font-mono font-bold bg-muted/50"
                title="Dígito Verificador"
              />
            </div>
          </div>
          {isCalculated && (
            <p className="text-xs text-muted-foreground mt-1">
              Calculado a partir do EAN-13
            </p>
          )}
        </div>

        {/* Upload de imagem */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={`Embalagem ${label}`} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onImageChange}
              disabled={uploading === type}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={uploading === type}
              asChild
            >
              <span>
                <Upload className="w-3 h-3 mr-1" />
                {uploading === type ? "..." : "Foto"}
              </span>
            </Button>
          </label>
        </div>

        {/* Botões de imprimir */}
        <div className="flex flex-col gap-1.5 self-start mt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openPrintDialog(value, label)}
            disabled={!value}
          >
            <Printer className="w-4 h-4 mr-1" />
            PDF
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => openZebraDialog(value, type === "ean13" ? "ean13" : "ean14", label)}
            disabled={!value}
            title="Imprimir usando template Zebra padrão"
          >
            <Zap className="w-4 h-4 mr-1" />
            Zebra
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        <p>
          Digite o código EAN-13 do produto. Os códigos EAN-14 serão calculados automaticamente:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>
            <strong>EAN-14(1):</strong> Embalagem master nível 1 (indicador 1)
          </li>
          <li>
            <strong>EAN-14(2):</strong> Embalagem master nível 2 (indicador 2)
          </li>
        </ul>
      </div>

      <EanField
        label="EAN-13"
        value={ean13}
        onChange={handleEan13Change}
        imageUrl={imgEan13}
        onImageChange={(e) => handleImageSelect(e, "ean13")}
        type="ean13"
        isValid={ean13Valid}
      />

      <EanField
        label="EAN-14(1) - 1ª Embalagem Master"
        value={ean14_1}
        imageUrl={imgEan14_1}
        onImageChange={(e) => handleImageSelect(e, "ean14_1")}
        type="ean14_1"
        isCalculated
      />

      <EanField
        label="EAN-14(2) - 2ª Embalagem Master"
        value={ean14_2}
        imageUrl={imgEan14_2}
        onImageChange={(e) => handleImageSelect(e, "ean14_2")}
        type="ean14_2"
        isCalculated
      />

      {/* Dialog para quantidade de impressão */}
      <Dialog open={printDialog.open} onOpenChange={(open) => !open && setPrintDialog({ ...printDialog, open: false })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Imprimir Etiquetas {printDialog.type}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Código</Label>
              <Input value={printDialog.ean} readOnly className="font-mono bg-muted/50" />
            </div>
            <div>
              <Label>Quantidade de etiquetas</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={printQuantity}
                onChange={(e) => setPrintQuantity(e.target.value)}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground mt-1">Máximo: 100 etiquetas</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialog({ open: false, ean: "", type: "" })}>
              Cancelar
            </Button>
            <Button onClick={generateBarcodePDF}>
              <Printer className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Zebra */}
      <Dialog open={zebraDialog.open} onOpenChange={(open) => setZebraDialog({ ...zebraDialog, open })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Imprimir Zebra — {zebraDialog.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Código</Label>
              <Input value={zebraDialog.ean} readOnly className="font-mono bg-muted/50" />
            </div>
            <div>
              <Label>Quantidade de etiquetas</Label>
              <Input
                type="number"
                min="1"
                max="500"
                value={zebraQty}
                onChange={(e) => setZebraQty(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">Máximo: 500 etiquetas</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZebraDialog({ ...zebraDialog, open: false })}>
              Cancelar
            </Button>
            <Button onClick={confirmZebraPrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
