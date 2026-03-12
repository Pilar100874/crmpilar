import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, Palette } from 'lucide-react';
import { CanvasProvider, useCanvas } from '@/contexts/CanvasContext';
import CanvasWorkspace from '@/components/canvas/CanvasWorkspace';
import DesktopSidebar from '@/components/editor/DesktopSidebar';
import { FloatingObjectToolbar } from '@/components/editor/FloatingObjectToolbar';
import { ObjectActionsMenu } from '@/components/editor/ObjectActionsMenu';
import ProjectsPanel from '@/components/editor/panels/ProjectsPanel';
import ImagesPanel from '@/components/editor/panels/ImagesPanel';
import TextPanel from '@/components/editor/panels/TextPanel';
import ShapesPanel from '@/components/editor/panels/ShapesPanel';
import ElementsPanel from '@/components/editor/panels/ElementsPanel';
import AIPanel from '@/components/editor/panels/AIPanel';
import TemplatesPanel from '@/components/editor/panels/TemplatesPanel';
import TextTemplatesPanel from '@/components/editor/panels/TextTemplatesPanel';
import FontPanel from '@/components/editor/panels/FontPanel';
import ColorPanel from '@/components/editor/panels/ColorPanel';
import ImageEffectsPanel from '@/components/editor/panels/ImageEffectsPanel';
import LayersPanel from '@/components/editor/LayersPanel';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import BarcodePanel from '@/components/editor/panels/BarcodePanel';
import { toast } from '@/lib/toast-config';

interface CanvasComposerDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (imageDataUrl: string, canvasJson: string) => void;
  initialCanvasJson?: string;
}

const CanvasComposerInner: React.FC<{
  onClose: () => void;
  onConfirm: (imageDataUrl: string, canvasJson: string) => void;
  initialCanvasJson?: string;
}> = ({ onClose, onConfirm, initialCanvasJson }) => {
  const { fabricCanvas } = useCanvas();
  const [activePanel, setActivePanel] = useState('design');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [userSelectedPanel, setUserSelectedPanel] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Listen to canvas selection
  useEffect(() => {
    if (!fabricCanvas) return;
    const handleSelection = () => {
      const active = fabricCanvas.getActiveObject();
      const objType = active ? (active as any).type : null;
      setSelectedObjectType(objType);
      if (objType && !userSelectedPanel) setIsPanelOpen(true);
    };
    const handleCleared = () => setSelectedObjectType(null);

    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);
    fabricCanvas.on('selection:cleared', handleCleared);
    return () => {
      fabricCanvas.off('selection:created', handleSelection);
      fabricCanvas.off('selection:updated', handleSelection);
      fabricCanvas.off('selection:cleared', handleCleared);
    };
  }, [fabricCanvas, userSelectedPanel]);

  // Load initial canvas JSON if re-editing
  useEffect(() => {
    if (!fabricCanvas || !initialCanvasJson || loadedRef.current) return;
    loadedRef.current = true;
    try {
      const json = JSON.parse(initialCanvasJson);
      fabricCanvas.loadFromJSON(json).then(() => {
        fabricCanvas.renderAll();
      });
    } catch (e) {
      console.error('Erro ao carregar canvas:', e);
    }
  }, [fabricCanvas, initialCanvasJson]);

  const handleConfirm = useCallback(async () => {
    if (!fabricCanvas) return;
    try {
      const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
      const json = JSON.stringify(fabricCanvas.toJSON());
      onConfirm(dataUrl, json);
    } catch (e) {
      console.error('Erro ao exportar canvas:', e);
      toast.error('Erro ao exportar o canvas');
    }
  }, [fabricCanvas, onConfirm]);

  const handlePanelChange = (panel: string) => {
    if (panel === activePanel && isPanelOpen && userSelectedPanel) {
      setIsPanelOpen(false);
      setUserSelectedPanel(false);
    } else {
      setActivePanel(panel);
      setIsPanelOpen(true);
      setUserSelectedPanel(true);
    }
  };

  const renderPanel = () => {
    if (userSelectedPanel) {
      switch (activePanel) {
        case 'design': return <ProjectsPanel />;
        case 'templates': return <TemplatesPanel />;
        case 'text-templates': return <TextTemplatesPanel />;
        case 'images': return <ImagesPanel />;
        case 'text': return <TextPanel />;
        case 'shapes': return <ShapesPanel />;
        case 'elements': return <ElementsPanel />;
        case 'barcode': return <BarcodePanel />;
        case 'ai': return <AIPanel />;
        case 'layers': return <LayersPanel />;
        case 'properties': return <PropertiesPanel />;
        case 'fonts': return <FontPanel />;
        case 'colors': return <ColorPanel />;
        case 'effects': return <ImageEffectsPanel />;
        default: return <ProjectsPanel />;
      }
    }

    if (selectedObjectType === 'textbox' || selectedObjectType === 'text' || selectedObjectType === 'i-text') {
      return <FontPanel />;
    }
    if (selectedObjectType === 'image') {
      return activePanel === 'effects' ? <ImageEffectsPanel /> : <PropertiesPanel />;
    }
    if (selectedObjectType) {
      return <ColorPanel />;
    }

    switch (activePanel) {
      case 'design': return <ProjectsPanel />;
      case 'templates': return <TemplatesPanel />;
      case 'text-templates': return <TextTemplatesPanel />;
      case 'images': return <ImagesPanel />;
      case 'text': return <TextPanel />;
      case 'shapes': return <ShapesPanel />;
      case 'elements': return <ElementsPanel />;
      case 'barcode': return <BarcodePanel />;
      case 'ai': return <AIPanel />;
      case 'layers': return <LayersPanel />;
      case 'properties': return <PropertiesPanel />;
      default: return <ProjectsPanel />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          Criar Composição para Vídeo
        </h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} className="gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" /> Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} className="gap-1.5 text-xs">
            <Check className="h-3.5 w-3.5" /> Usar no Vídeo
          </Button>
        </div>
      </div>

      {/* Canvas area with full tooling */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar icons */}
        <DesktopSidebar
          activePanel={activePanel}
          onPanelChange={handlePanelChange}
        />

        {/* Panel content */}
        {isPanelOpen && (
          <div className="w-72 border-r bg-card overflow-y-auto shrink-0">
            {renderPanel()}
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-muted/30">
          <CanvasWorkspace selectedSize="medio" />
          <FloatingObjectToolbar />
          <ObjectActionsMenu />
        </div>
      </div>
    </div>
  );
};

const CanvasComposerDialog: React.FC<CanvasComposerDialogProps> = ({
  open,
  onClose,
  onConfirm,
  initialCanvasJson,
}) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden [&>button]:hidden">
        {open && (
          <CanvasProvider>
            <CanvasComposerInner
              onClose={onClose}
              onConfirm={onConfirm}
              initialCanvasJson={initialCanvasJson}
            />
          </CanvasProvider>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CanvasComposerDialog;
