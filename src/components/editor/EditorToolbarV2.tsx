import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Share2, ZoomIn, ZoomOut, Save, Copy, Home, MonitorSmartphone, X } from "lucide-react";
import { useCanvas } from "@/contexts/CanvasContext";
import { toast } from "@/lib/toast-config";
import { useState } from "react";
import { saveProject } from "@/lib/projectStorage";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EditorToolbarV2Props {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  currentPlatform?: { platform: string; label: string; width: number; height: number } | null;
  onChangePlatform?: () => void;
  onClose?: () => void;
}

const EditorToolbarV2 = ({ projectName, onProjectNameChange, currentPlatform, onChangePlatform, onClose }: EditorToolbarV2Props) => {
  const navigate = useNavigate();
  const { fabricCanvas } = useCanvas();
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);

  const downloadDesign = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `${projectName}.png`;
    link.href = dataURL;
    link.click();
    toast.success("Download iniciado!");
  };

  const saveDesign = async () => {
    if (!fabricCanvas) {
      toast.error("Canvas não está pronto");
      return;
    }
    
    try {
      const json = JSON.stringify(fabricCanvas.toJSON());
      
      // Garantir que todas as imagens estão carregadas antes de gerar thumbnail
      const objects = fabricCanvas.getObjects();
      const imagePromises = objects
        .filter((obj: any) => obj.type === 'image')
        .map((img: any) => {
          return new Promise((resolve) => {
            const element = img.getElement();
            if (element && element.complete) {
              resolve(true);
            } else if (element) {
              element.onload = () => resolve(true);
              element.onerror = () => resolve(false);
            } else {
              resolve(false);
            }
          });
        });
      
      await Promise.all(imagePromises);
      fabricCanvas.renderAll();
      
      // Salvar thumbnail mantendo proporção e tamanho razoável
      const canvasWidth = fabricCanvas.width || 800;
      const canvasHeight = fabricCanvas.height || 600;
      const maxDimension = 400;
      const scale = Math.min(maxDimension / canvasWidth, maxDimension / canvasHeight);
      
      const thumbnail = fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.6,
        multiplier: scale,
        enableRetinaScaling: false,
      });
      
      const savedProject = saveProject(
        projectName, 
        json, 
        thumbnail,
        currentPlatform?.platform,
        currentPlatform?.label,
        currentPlatform ? { width: currentPlatform.width, height: currentPlatform.height } : undefined
      );
      console.log('Projeto salvo:', savedProject);
      toast.success(`Projeto "${projectName}" salvo!`);
      window.dispatchEvent(new CustomEvent('projectSaved'));
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      toast.error("Erro ao salvar projeto. Tente remover alguns projetos antigos.");
    }
  };

  const handleSaveAs = () => {
    setNewProjectName(`${projectName} (cópia)`);
    setShowSaveAsDialog(true);
  };

  const confirmSaveAs = async () => {
    if (!fabricCanvas) {
      toast.error("Canvas não está pronto");
      return;
    }
    
    if (!newProjectName.trim()) {
      toast.error("Digite um nome para o projeto");
      return;
    }
    
    try {
      const json = JSON.stringify(fabricCanvas.toJSON());
      
      // Garantir que todas as imagens estão carregadas antes de gerar thumbnail
      const objects = fabricCanvas.getObjects();
      const imagePromises = objects
        .filter((obj: any) => obj.type === 'image')
        .map((img: any) => {
          return new Promise((resolve) => {
            const element = img.getElement();
            if (element && element.complete) {
              resolve(true);
            } else if (element) {
              element.onload = () => resolve(true);
              element.onerror = () => resolve(false);
            } else {
              resolve(false);
            }
          });
        });
      
      await Promise.all(imagePromises);
      fabricCanvas.renderAll();
      
      // Salvar thumbnail mantendo proporção e tamanho razoável
      const canvasWidth = fabricCanvas.width || 800;
      const canvasHeight = fabricCanvas.height || 600;
      const maxDimension = 400;
      const scale = Math.min(maxDimension / canvasWidth, maxDimension / canvasHeight);
      
      const thumbnail = fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.6,
        multiplier: scale,
        enableRetinaScaling: false,
      });
      
      const savedProject = saveProject(
        newProjectName, 
        json, 
        thumbnail,
        currentPlatform?.platform,
        currentPlatform?.label,
        currentPlatform ? { width: currentPlatform.width, height: currentPlatform.height } : undefined
      );
      console.log('Projeto salvo como:', savedProject);
      onProjectNameChange(newProjectName);
      setShowSaveAsDialog(false);
      toast.success(`Projeto salvo como "${newProjectName}"!`);
      window.dispatchEvent(new CustomEvent('projectSaved'));
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      toast.error("Erro ao salvar projeto. Tente remover alguns projetos antigos.");
    }
  };

  const shareDesign = () => {
    if (!fabricCanvas) return;
    
    const thumbnail = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });
    
    fetch(thumbnail)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `${projectName}.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: projectName,
            text: `Confira meu design: ${projectName}`,
          })
          .then(() => toast.success("Compartilhado!"))
          .catch(() => toast.error("Erro ao compartilhar"));
        } else {
          const text = encodeURIComponent(`Confira: ${projectName}`);
          window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
        }
      });
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoomLevel + 0.1, 3);
    setZoomLevel(newZoom);
    
    const originalWidth = fabricCanvas.width! / zoomLevel;
    const originalHeight = fabricCanvas.height! / zoomLevel;
    
    fabricCanvas.setDimensions({
      width: originalWidth * newZoom,
      height: originalHeight * newZoom
    });
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoomLevel - 0.1, 0.1);
    setZoomLevel(newZoom);
    
    const originalWidth = fabricCanvas.width! / zoomLevel;
    const originalHeight = fabricCanvas.height! / zoomLevel;
    
    fabricCanvas.setDimensions({
      width: originalWidth * newZoom,
      height: originalHeight * newZoom
    });
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  return (
    <>
      <div className="min-h-16 border-b bg-card dark:bg-card flex flex-wrap items-center justify-between px-3 sm:px-6 gap-2 sm:gap-6 py-2 shrink-0">
        {/* Left section - Title */}
        <div className="hidden md:flex flex-col">
          <h1 className="text-lg font-bold text-foreground">EDITOR DE DESIGN</h1>
          <p className="text-xs text-muted-foreground">Crie e edite seus designs personalizados</p>
        </div>

        {/* Center section - Icon buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/')}
            className="h-10 w-10 rounded-full bg-card dark:bg-card border-border hover:bg-muted"
            title="Voltar"
          >
            <Home className="h-4 w-4 text-foreground" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            className="h-10 w-10 rounded-full bg-card dark:bg-card border-border hover:bg-muted"
            title="Diminuir zoom"
          >
            <ZoomOut className="h-4 w-4 text-foreground" />
          </Button>

          <div className="flex items-center justify-center min-w-[60px] h-10 px-3 rounded-full border border-border bg-white">
            <span className="text-sm font-medium text-foreground">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            className="h-10 w-10 rounded-full bg-card dark:bg-card border-border hover:bg-muted"
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4 text-foreground" />
          </Button>
        </div>

        {/* Right section - Action buttons */}
        <div className="flex items-center gap-2">
          {onChangePlatform && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onChangePlatform}
                  className="bg-card dark:bg-card border-border text-foreground hover:bg-muted h-9"
                >
                  <MonitorSmartphone className="h-4 w-4 mr-2" />
                  {currentPlatform?.label || 'Plataforma'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Alterar tamanho e plataforma</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAs}
            className="bg-card dark:bg-card border-border text-foreground hover:bg-muted h-9"
          >
            <Copy className="h-4 w-4 mr-2" />
            Salvar Como
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={shareDesign}
            className="bg-card dark:bg-card border-border text-foreground hover:bg-muted h-9"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={downloadDesign}
            className="bg-card dark:bg-card border-border text-foreground hover:bg-muted h-9"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

          <Button
            size="sm"
            onClick={saveDesign}
            className="h-9"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>

          {onClose && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onClose}
              className="h-9"
            >
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showSaveAsDialog} onOpenChange={setShowSaveAsDialog}>
        <DialogContent className="sm:max-w-[425px] bg-card dark:bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Salvar Como</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Crie uma cópia do projeto com um novo nome.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Nome do novo projeto"
              onKeyDown={(e) => e.key === 'Enter' && confirmSaveAs()}
              autoFocus
              className="bg-card dark:bg-card border-border text-foreground"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveAsDialog(false)} className="bg-card dark:bg-card text-foreground">
              Cancelar
            </Button>
            <Button onClick={confirmSaveAs} disabled={!newProjectName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditorToolbarV2;
