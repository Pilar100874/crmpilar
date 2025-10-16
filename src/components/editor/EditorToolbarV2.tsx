import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Share2, ZoomIn, ZoomOut, Save, Copy, Home } from "lucide-react";
import { useCanvas } from "@/contexts/CanvasContext";
import { toast } from "sonner";
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

interface EditorToolbarV2Props {
  onBack?: () => void;
}

const EditorToolbarV2 = ({ onBack }: EditorToolbarV2Props) => {
  const navigate = useNavigate();
  const { fabricCanvas } = useCanvas();
  const [projectName, setProjectName] = useState("Design sem título");
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

  return (
    <>
      <div className="h-16 border-b bg-white flex items-center justify-between px-6 gap-6 shrink-0">
        {/* Left section - Title */}
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900">EDITOR DE DESIGN</h1>
          <p className="text-xs text-slate-500">Crie e edite seus designs personalizados</p>
        </div>

        {/* Center section - Icon buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onBack ? onBack() : navigate('/')}
            className="h-10 w-10 rounded-full bg-white border-slate-300 hover:bg-slate-50"
            title="Voltar"
          >
            <Home className="h-4 w-4 text-slate-700" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            className="h-10 w-10 rounded-full bg-white border-slate-300 hover:bg-slate-50"
            title="Diminuir zoom"
          >
            <ZoomOut className="h-4 w-4 text-slate-700" />
          </Button>

          <div className="flex items-center justify-center min-w-[60px] h-10 px-3 rounded-full border border-slate-300 bg-white">
            <span className="text-sm font-medium text-slate-900">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            className="h-10 w-10 rounded-full bg-white border-slate-300 hover:bg-slate-50"
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4 text-slate-700" />
          </Button>
        </div>

        {/* Right section - Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAs}
            className="bg-white border-slate-300 text-slate-900 hover:bg-slate-50 h-9"
          >
            <Copy className="h-4 w-4 mr-2" />
            Salvar Como
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={shareDesign}
            className="bg-white border-slate-300 text-slate-900 hover:bg-slate-50 h-9"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={downloadDesign}
            className="bg-white border-slate-300 text-slate-900 hover:bg-slate-50 h-9"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

          <Button
            size="sm"
            onClick={saveDesign}
            className="bg-cyan-500 hover:bg-cyan-600 text-white h-9"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <Dialog open={showSaveAsDialog} onOpenChange={setShowSaveAsDialog}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Salvar Como</DialogTitle>
            <DialogDescription className="text-slate-500">
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
              className="bg-white border-slate-200 text-slate-900"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveAsDialog(false)} className="bg-white text-slate-900">
              Cancelar
            </Button>
            <Button onClick={confirmSaveAs} disabled={!newProjectName.trim()} className="bg-cyan-500 hover:bg-cyan-600">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditorToolbarV2;
