import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Drawer, 
  DrawerContent, 
  DrawerDescription, 
  DrawerHeader, 
  DrawerTitle 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { useCanvas } from "@/contexts/CanvasContext";
import { FabricImage } from "fabric";
import { useIsMobile } from "@/hooks/use-mobile";

interface AIImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: string;
}

const AIImageDialog = ({ open, onOpenChange, provider = 'lovable-ai' }: AIImageDialogProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { fabricCanvas } = useCanvas();
  const isMobile = useIsMobile();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Digite uma descrição para a imagem");
      return;
    }

    if (!fabricCanvas) {
      toast.error("Canvas não está pronto");
      return;
    }

    setIsGenerating(true);

    try {
      const functionName = provider === 'pollinations' ? 'pollinations-image' : 'generate-image';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { prompt }
      });

      if (error) {
        console.error("Erro ao gerar imagem:", error);
        throw error;
      }

      if (!data?.imageUrl) {
        throw new Error("Nenhuma imagem foi gerada");
      }

      // Adicionar a imagem ao canvas
      FabricImage.fromURL(data.imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
        img.scale(0.5);
        img.set({
          left: 100,
          top: 100,
        });
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        
        const providerName = provider === 'pollinations' ? 'Pollinations AI' : 'Lovable AI';
        toast.success(`Imagem gerada com ${providerName}!`);
        onOpenChange(false);
        setPrompt("");
      }).catch(() => {
        toast.error("Erro ao adicionar imagem ao canvas");
      });

    } catch (error: any) {
      console.error("Erro:", error);
      const errMsg = error?.message || '';
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('Rate limit')) {
        toast.error("Limite de requisições excedido. Tente novamente mais tarde.");
      } else if (errMsg.includes('402') || errMsg.includes('billing') || errMsg.includes('insufficient') || errMsg.includes('Credits') || errMsg.includes('exclusively available')) {
        toast.error("Créditos insuficientes. Adicione saldo no provedor.");
      } else {
        toast.error(errMsg.substring(0, 150) || "Erro ao gerar imagem");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const content = (
    <div className="space-y-4">
      <Textarea
        placeholder="Ex: Um copo de café com arte latte em forma de coração, fundo minimalista"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="min-h-[100px]"
        disabled={isGenerating}
      />

      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="flex-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Imagem
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isGenerating}
        >
          Cancelar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        💡 Dica: Seja específico na descrição para melhores resultados!
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 justify-center">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Gerar Imagem com IA
            </DrawerTitle>
            <DrawerDescription className="text-center">
              Descreva a imagem que você quer criar. A IA vai gerar uma imagem única para você! 🎨
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Gerar Imagem com IA
          </DialogTitle>
          <DialogDescription>
            Descreva a imagem que você quer criar. A IA vai gerar uma imagem única para você! 🎨
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIImageDialog;
