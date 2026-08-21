import { useState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase, Tool, Loan } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { CameraCapture } from "./CameraCapture";
import { ImageCropDialog } from "./ImageCropDialog";
import {
  Camera,
  Sparkles,
  X,
  Loader2,
  Check,
  AlertCircle,
  ImageIcon,
  Trash2,
  Wrench,
  Image,
} from "lucide-react";

interface LoanWithDetails extends Loan {
  tools?: Tool;
}

interface ReturnPhotoRecognitionProps {
  loans: LoanWithDetails[];
  selectedLoanIds: Set<string>;
  kitTools: { kit_id: string; tool_id: string }[];
  onSelectLoans: (loanIds: string[]) => void;
  onClose: () => void;
}

export function ReturnPhotoRecognition({
  loans,
  selectedLoanIds,
  kitTools,
  onSelectLoans,
  onClose,
}: ReturnPhotoRecognitionProps) {
  const { toast } = useToast();
  const galleryInputId = useId();
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognizedToolIds, setRecognizedToolIds] = useState<string[]>([]);
  const [selectedRecognizedLoanIds, setSelectedRecognizedLoanIds] = useState<Set<string>>(new Set());
  const [analysisNotes, setAnalysisNotes] = useState<string>("");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Reset state when image changes
  useEffect(() => {
    if (capturedImage) {
      setHasAnalyzed(false);
      setRecognizedToolIds([]);
      setSelectedRecognizedLoanIds(new Set());
      setAnalysisNotes("");
    }
  }, [capturedImage]);

  // Handle camera capture
  const handleCameraCapture = (file: File) => {
    setShowCamera(false);
    const objectUrl = URL.createObjectURL(file);
    setImageToCrop(objectUrl);
    setShowCrop(true);
  };

  // Handle gallery selection
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    setImageToCrop(objectUrl);
    setShowCrop(true);
    e.target.value = '';
  };

  // Handle crop complete
  const handleCropComplete = (croppedFile: File) => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }
    
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setIsLoading(false);
      toast({ variant: "destructive", title: "Erro ao processar imagem" });
    };
    reader.readAsDataURL(croppedFile);
  };

  const clearImage = () => {
    setCapturedImage(null);
    setHasAnalyzed(false);
    setRecognizedToolIds([]);
    setSelectedRecognizedLoanIds(new Set());
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    try {
      // Get all tools from active loans
      const toolsFromLoans = loans
        .filter((l) => l.tools)
        .map((l) => l.tools!);

      if (toolsFromLoans.length === 0) {
        toast({
          variant: "destructive",
          title: "Nenhuma ferramenta encontrada nos empréstimos",
        });
        return;
      }

      const response = await supabase.functions.invoke("identify-tools", {
        body: {
          image: capturedImage,
          tools: toolsFromLoans.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            type: t.type,
            serial_number: t.serial_number,
            photo_url: t.photo_url,
          })),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao analisar imagem");
      }

      const { matched_tool_ids, confidence_notes } = response.data;

      if (matched_tool_ids && matched_tool_ids.length > 0) {
        setRecognizedToolIds(matched_tool_ids);
        
        // Map tool IDs to loan IDs
        const matchedLoanIds = loans
          .filter((l) => matched_tool_ids.includes(l.tool_id))
          .map((l) => l.id);
        
        setSelectedRecognizedLoanIds(new Set(matchedLoanIds));
        setAnalysisNotes(confidence_notes || "");
        
        toast({
          title: `${matched_tool_ids.length} ferramenta(s) identificada(s)`,
          description: "Revise e confirme os itens reconhecidos.",
        });
      } else {
        setRecognizedToolIds([]);
        setAnalysisNotes(confidence_notes || "Nenhuma ferramenta foi identificada.");
        toast({
          title: "Nenhuma ferramenta identificada",
          description: "Tente tirar outra foto com melhor iluminação.",
        });
      }

      setHasAnalyzed(true);
    } catch (error: any) {
      console.error("Error analyzing image:", error);
      toast({
        variant: "destructive",
        title: "Erro ao analisar imagem",
        description: error.message || "Tente novamente",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleLoanSelection = (loanId: string) => {
    setSelectedRecognizedLoanIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(loanId)) {
        newSet.delete(loanId);
      } else {
        newSet.add(loanId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const loanIdsToSelect = Array.from(selectedRecognizedLoanIds);
    if (loanIdsToSelect.length === 0) {
      onClose();
      return;
    }

    // Expandir para kits completos
    const allLoanIdsToSelect = new Set<string>(loanIdsToSelect);
    let kitsExpanded = 0;

    for (const loanId of loanIdsToSelect) {
      const loan = loans.find((l) => l.id === loanId);
      if (!loan) continue;

      // Verificar se a ferramenta pertence a um kit via kit_tools
      const kitToolEntry = kitTools.find((kt) => kt.tool_id === loan.tool_id);
      if (kitToolEntry) {
        // Encontrar todos os empréstimos de ferramentas deste kit
        const kitToolIds = kitTools
          .filter((kt) => kt.kit_id === kitToolEntry.kit_id)
          .map((kt) => kt.tool_id);
        
        const kitLoanIds = loans
          .filter((l) => kitToolIds.includes(l.tool_id))
          .map((l) => l.id);

        const newLoans = kitLoanIds.filter((id) => !allLoanIdsToSelect.has(id));
        if (newLoans.length > 0) {
          kitsExpanded++;
          newLoans.forEach((id) => allLoanIdsToSelect.add(id));
        }
      }
    }

    const finalLoanIds = Array.from(allLoanIdsToSelect);
    onSelectLoans(finalLoanIds);
    
    if (kitsExpanded > 0) {
      toast({
        title: `${finalLoanIds.length} ferramenta(s) marcada(s) para devolução`,
        description: `${kitsExpanded} kit(s) expandido(s) automaticamente`,
      });
    } else {
      toast({
        title: `${finalLoanIds.length} ferramenta(s) marcada(s) para devolução`,
      });
    }
    onClose();
  };

  // Get loans that were recognized
  const recognizedLoans = loans.filter((l) => recognizedToolIds.includes(l.tool_id));

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Identificar por Foto
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Tire uma foto das ferramentas sendo devolvidas para seleção automática
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gallery input hidden */}
        <input
          id={galleryInputId}
          type="file"
          accept="image/*"
          onChange={handleGalleryChange}
          className="sr-only"
        />

        {!capturedImage ? (
          <div className="space-y-3">
            {isLoading ? (
              <div className="h-40 w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground mt-2">Carregando...</span>
              </div>
            ) : (
              <div 
                className="h-40 w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setShowCamera(true)}
              >
                <Camera className="h-10 w-10 text-muted-foreground mb-3" />
                <span className="text-muted-foreground text-sm">Capture uma foto das ferramentas</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer select-none active:scale-[0.98]"
              >
                <Camera className="h-4 w-4" />
                Câmera
              </button>
              <label
                htmlFor={galleryInputId}
                className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer select-none active:scale-[0.98]"
              >
                <Image className="h-4 w-4" />
                Galeria
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Captured image preview */}
            <div className="relative">
              <img
                src={capturedImage}
                alt="Foto capturada"
                className="w-full rounded-lg max-h-64 object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2"
                onClick={clearImage}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Analyze button */}
            {!hasAnalyzed && (
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Identificar Ferramentas
                  </>
                )}
              </Button>
            )}

            {/* Analysis results */}
            {hasAnalyzed && (
              <div className="space-y-3">
                {analysisNotes && (
                  <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    <AlertCircle className="inline h-4 w-4 mr-2" />
                    {analysisNotes}
                  </div>
                )}

                {recognizedLoans.length > 0 ? (
                  <>
                    <div className="text-sm font-medium">
                      Ferramentas reconhecidas ({recognizedLoans.length})
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 pr-4">
                        {recognizedLoans.map((loan) => (
                          <div
                            key={loan.id}
                            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                              selectedRecognizedLoanIds.has(loan.id)
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50"
                            }`}
                            onClick={() => toggleLoanSelection(loan.id)}
                          >
                            <Checkbox
                              checked={selectedRecognizedLoanIds.has(loan.id)}
                              onCheckedChange={() => toggleLoanSelection(loan.id)}
                            />
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                              {loan.tools?.photo_url ? (
                                <img
                                  src={loan.tools.photo_url}
                                  alt={loan.tools.name}
                                  className="h-8 w-8 rounded-lg object-cover"
                                />
                              ) : (
                                <Wrench className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">
                                {loan.tools?.name || "Ferramenta"}
                              </p>
                              {loan.tools?.type && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {loan.tools.type}
                                </Badge>
                              )}
                            </div>
                            {selectedRecognizedLoanIds.has(loan.id) && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowCamera(true)}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Nova Foto
                      </Button>
                      <Button
                        onClick={handleConfirm}
                        disabled={selectedRecognizedLoanIds.size === 0}
                        className="flex-1"
                      >
                        Selecionar ({selectedRecognizedLoanIds.size})
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nenhuma ferramenta do empréstimo foi identificada
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowCamera(true)}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Tentar outra foto
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
}
