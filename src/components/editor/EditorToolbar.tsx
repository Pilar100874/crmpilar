import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Box, Save, Download, Share2, Copy } from "lucide-react";
import { useCanvas } from "@/contexts/CanvasContext";
import { toast } from "@/lib/toast-config";
import { useState } from "react";
import { saveProject } from "@/lib/projectStorage";
import Preview3DDialog from "./Preview3DDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EditorToolbar = () => {
  const { fabricCanvas } = useCanvas();
  const [projectName, setProjectName] = useState("Design sem título");
  const [show3DPreview, setShow3DPreview] = useState(false);
  const [designDataUrl, setDesignDataUrl] = useState<string>("");
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

  const saveDesign = () => {
    if (!fabricCanvas) {
      toast.error("Canvas não está pronto");
      return;
    }
    
    try {
      const json = JSON.stringify(fabricCanvas.toJSON());
      const thumbnail = fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.3,
        multiplier: 0.2,
      });
      
      const savedProject = saveProject(projectName, json, thumbnail);
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

  const confirmSaveAs = () => {
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
      const thumbnail = fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.3,
        multiplier: 0.2,
      });
      
      const savedProject = saveProject(newProjectName, json, thumbnail);
      console.log('Projeto salvo como:', savedProject);
      setProjectName(newProjectName);
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

  const open3DPreview = () => {
    if (!fabricCanvas) return;
    
    try {
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });
      setDesignDataUrl(dataURL);
      setShow3DPreview(true);
      toast.success("Carregando preview 3D...");
    } catch (error) {
      console.error("Erro ao gerar preview 3D:", error);
      toast.error("Erro ao gerar preview 3D");
    }
  };

  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-card/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg">
        {/* Project name */}
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-48 h-8 text-sm"
          placeholder="Nome do projeto"
        />

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium px-2 min-w-[3rem] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={saveDesign}
            className="h-8 w-8"
            title="Salvar"
          >
            <Save className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSaveAs}
            className="h-8 w-8"
            title="Salvar Como"
          >
            <Copy className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={shareDesign}
            className="h-8 w-8"
            title="Compartilhar"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost"
            size="icon"
            onClick={open3DPreview}
            className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            title="Preview 3D/AR"
          >
            <Box className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost"
            size="icon"
            onClick={downloadDesign}
            className="h-8 w-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showSaveAsDialog} onOpenChange={setShowSaveAsDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Salvar Como</DialogTitle>
            <DialogDescription>
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
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveAsDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmSaveAs} disabled={!newProjectName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Preview3DDialog
        open={show3DPreview}
        onOpenChange={setShow3DPreview}
        designDataUrl={designDataUrl}
        cupSize="medio"
      />
    </>
  );
};

export default EditorToolbar;
