import { useState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase, Tool } from "@/lib/ferramentas/supabase";
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
  Image,
} from "lucide-react";

interface ToolWithKit extends Tool {
  kit?: { id: string; name: string };
}

interface ToolPhotoRecognitionProps {
  tools: ToolWithKit[];
  activeLoans: string[];
  pendingRequestToolIds: string[];
  selectedToolIds: string[];
  kitTools: { kit_id: string; tool_id: string }[];
  onAddTools: (toolIds: string[], isKitExpansion?: boolean) => void;
  onClose: () => void;
}

export function ToolPhotoRecognition({
  tools,
  activeLoans,
  pendingRequestToolIds,
  selectedToolIds,
  kitTools,
  onAddTools,
  onClose,
}: ToolPhotoRecognitionProps) {
  const { toast } = useToast();
  const galleryInputId = useId();
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognizedToolIds, setRecognizedToolIds] = useState<string[]>([]);
  const [selectedRecognizedIds, setSelectedRecognizedIds] = useState<Set<string>>(new Set());
  const [analysisNotes, setAnalysisNotes] = useState<string>("");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Reset state when image changes
  useEffect(() => {
    if (capturedImage) {
      setHasAnalyzed(false);
      setRecognizedToolIds([]);
      setSelectedRecognizedIds(new Set());
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
    setSelectedRecognizedIds(new Set());
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    try {
      // Filter available tools
      const availableTools = tools.filter(
        (t) =>
          !activeLoans.includes(t.id) &&
          !pendingRequestToolIds.includes(t.id) &&
          !selectedToolIds.includes(t.id)
      );

      if (availableTools.length === 0) {
        toast({
          variant: "destructive",
          title: "Nenhuma ferramenta disponível para reconhecimento",
        });
        return;
      }

      const response = await supabase.functions.invoke("identify-tools", {
        body: {
          image: capturedImage,
          tools: availableTools.map((t) => ({
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
        setSelectedRecognizedIds(new Set(matched_tool_ids));
        setAnalysisNotes(confidence_notes || "");
        toast({
          title: `${matched_tool_ids.length} ferramenta(s) identificada(s)`,
          description: "Revise e confirme as ferramentas reconhecidas.",
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

  const toggleToolSelection = (toolId: string) => {
    setSelectedRecognizedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const idsToAdd = Array.from(selectedRecognizedIds);
    if (idsToAdd.length === 0) {
      onClose();
      return;
    }

    // Expandir para kits completos
    const allIdsToAdd = new Set<string>(idsToAdd);
    const kitsExpanded: string[] = [];

    for (const toolId of idsToAdd) {
      const tool = tools.find((t) => t.id === toolId);
      
      // Verificar se a ferramenta pertence a um kit via kit_id
      if (tool?.kit?.id) {
        const kitToolIds = kitTools
          .filter((kt) => kt.kit_id === tool.kit!.id)
          .map((kt) => kt.tool_id);
        
        const newTools = kitToolIds.filter((id) => !allIdsToAdd.has(id));
        if (newTools.length > 0) {
          kitsExpanded.push(tool.kit.name);
          newTools.forEach((id) => allIdsToAdd.add(id));
        }
      }
      
      // Verificar se a ferramenta pertence a um kit via kit_tools
      const kitToolEntry = kitTools.find((kt) => kt.tool_id === toolId);
      if (kitToolEntry) {
        const kitToolIds = kitTools
          .filter((kt) => kt.kit_id === kitToolEntry.kit_id)
          .map((kt) => kt.tool_id);
        
        const newTools = kitToolIds.filter((id) => !allIdsToAdd.has(id));
        if (newTools.length > 0) {
          // Buscar nome do kit
          const kitTool = tools.find((t) => kitTools.some((kt) => kt.kit_id === kitToolEntry.kit_id && kt.tool_id === t.id) && t.kit);
          if (kitTool?.kit?.name && !kitsExpanded.includes(kitTool.kit.name)) {
            kitsExpanded.push(kitTool.kit.name);
          }
          newTools.forEach((id) => allIdsToAdd.add(id));
        }
      }
    }

    const finalIds = Array.from(allIdsToAdd);
    const hasKitExpansion = finalIds.length > idsToAdd.length;

    onAddTools(finalIds, hasKitExpansion);
    
    if (kitsExpanded.length > 0) {
      toast({
        title: `${finalIds.length} ferramenta(s) adicionada(s)`,
        description: `Kits expandidos automaticamente: ${kitsExpanded.join(", ")}`,
      });
    } else {
      toast({
        title: `${finalIds.length} ferramenta(s) adicionada(s)`,
      });
    }
    onClose();
  };

  const recognizedTools = tools.filter((t) => recognizedToolIds.includes(t.id));

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Reconhecimento por Foto
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Tire uma foto e a IA identificará as ferramentas
        </p>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
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
              <div className="h-32 sm:h-40 w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-xs sm:text-sm text-muted-foreground mt-2">Carregando...</span>
              </div>
            ) : (
              <div 
                className="h-32 sm:h-40 w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setShowCamera(true)}
              >
                <Camera className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground mb-2 sm:mb-3" />
                <span className="text-muted-foreground text-xs sm:text-sm">Capture uma foto das ferramentas</span>
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
                className="w-full rounded-lg max-h-48 sm:max-h-64 object-cover"
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

                {recognizedTools.length > 0 ? (
                  <>
                    <div className="text-sm font-medium">
                      Ferramentas reconhecidas ({recognizedTools.length})
                    </div>
                    <ScrollArea className="h-[160px] sm:h-[200px]">
                      <div className="space-y-2 pr-4">
                        {recognizedTools.map((tool) => (
                          <div
                            key={tool.id}
                            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                              selectedRecognizedIds.has(tool.id)
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50"
                            }`}
                            onClick={() => toggleToolSelection(tool.id)}
                          >
                            <Checkbox
                              checked={selectedRecognizedIds.has(tool.id)}
                              onCheckedChange={() => toggleToolSelection(tool.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium line-clamp-2 text-xs sm:text-sm">
                                {tool.name}
                              </p>
                              {tool.kit && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  Kit: {tool.kit.name}
                                </Badge>
                              )}
                            </div>
                            {selectedRecognizedIds.has(tool.id) && (
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
                        disabled={selectedRecognizedIds.size === 0}
                        className="flex-1"
                      >
                        Adicionar ({selectedRecognizedIds.size})
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nenhuma ferramenta foi identificada
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
