import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { CanvasProvider, useCanvas } from '@/contexts/CanvasContext';
import CanvasWorkspace from '@/components/canvas/CanvasWorkspace';
import DesktopSidebar from '@/components/editor/DesktopSidebar';
import EditorToolbarV2 from '@/components/editor/EditorToolbarV2';
import { FloatingObjectToolbar } from '@/components/editor/FloatingObjectToolbar';
import { exportCanvasToPNG, exportCanvasToJSON } from '@/lib/canvasExport';
import { toast } from '@/lib/toast-config';
import { Canvas as FabricCanvas } from 'fabric';

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
  const { fabricCanvas, setFabricCanvas } = useCanvas();
  const [activePanel, setActivePanel] = useState('design');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(null);
  const loadedRef = useRef(false);

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

  const handleSelectionChange = useCallback((objType: string | null) => {
    setSelectedObjectType(objType);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-card/80 shrink-0">
        <EditorToolbarV2
          activePanel={activePanel}
          onPanelChange={(panel) => { setActivePanel(panel); setIsPanelOpen(true); }}
          isPanelOpen={isPanelOpen}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} className="gap-1">
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} className="gap-1">
            <Check className="h-4 w-4" /> Usar no Vídeo
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex overflow-hidden">
        {isPanelOpen && (
          <div className="w-64 border-r shrink-0 overflow-auto bg-card">
            <DesktopSidebar
              activePanel={activePanel}
              onPanelChange={setActivePanel}
              isPanelOpen={isPanelOpen}
              setIsPanelOpen={setIsPanelOpen}
            />
          </div>
        )}
        <div className="flex-1 relative">
          <CanvasProvider onSelectionChange={handleSelectionChange}>
            <CanvasWorkspace />
            <FloatingObjectToolbar />
          </CanvasProvider>
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
          <CanvasComposerInner
            onClose={onClose}
            onConfirm={onConfirm}
            initialCanvasJson={initialCanvasJson}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CanvasComposerDialog;
