import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Share2, Menu, ZoomIn, ZoomOut, Box, Save, Copy } from "lucide-react";
import { useCanvas } from "@/contexts/CanvasContext";
import { toast } from "@/lib/toast-config";
import { useState } from "react";
import { saveProject, getProjects } from "@/lib/projectStorage";
import Preview3DDialog from "./Preview3DDialog";
import logo from "@/assets/logo_preto.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditorHeaderV2Props {
  onBack?: () => void;
}

const EditorHeaderV2 = ({ onBack }: EditorHeaderV2Props) => {
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
    const newZoom = Math.min(zoomLevel + 0.1, 3); // Max 300%
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
    const newZoom = Math.max(zoomLevel - 0.1, 0.1); // Min 10%
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
    <header className="h-14 border-b bg-card flex items-center justify-between px-3 md:px-4 gap-2 md:gap-4 shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        {onBack && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack} 
            className="shrink-0 h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Logo/Title */}
        <div className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="PilarCup" className="h-14 object-contain" />
        </div>

        {/* Project name */}
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="max-w-xs hidden md:block text-sm"
          placeholder="Nome do projeto"
        />
      </div>

      {/* Center section - Canvas controls */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomOut}
        >
          <ZoomOut className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
        <span className="text-[10px] md:text-xs font-medium px-1 md:px-2 min-w-[2.5rem] md:min-w-[3rem] text-center">
          {Math.round(zoomLevel * 100)}%
        </span>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomIn}
        >
          <ZoomIn className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 shrink-0">
        <Button 
          variant="outline" 
          size="sm"
          onClick={saveDesign}
          className="hidden md:flex"
        >
          <Save className="h-4 w-4 lg:mr-2" />
          <span className="hidden lg:inline">Salvar</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSaveAs}
          className="hidden md:flex"
        >
          <Copy className="h-4 w-4 lg:mr-2" />
          <span className="hidden lg:inline">Salvar Como</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={shareDesign}
          className="hidden md:flex"
        >
          <Share2 className="h-4 w-4 lg:mr-2" />
          <span className="hidden lg:inline">Compartilhar</span>
        </Button>
        
        <Button 
          size="sm"
          onClick={open3DPreview}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
        >
          <Box className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">3D/AR</span>
        </Button>
        
        <Button 
          size="sm"
          onClick={downloadDesign}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
        >
          <Download className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Download</span>
        </Button>

        {/* Mobile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover z-[100]">
            <DropdownMenuItem onClick={open3DPreview}>
              <Box className="h-4 w-4 mr-2" />
              Preview 3D/AR
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={saveDesign}>
              <Save className="h-4 w-4 mr-2" />
              Salvar projeto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSaveAs}>
              <Copy className="h-4 w-4 mr-2" />
              Salvar Como
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareDesign}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

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

export default EditorHeaderV2;
