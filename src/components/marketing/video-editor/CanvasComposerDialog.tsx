import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, Type, Image, Palette, Square } from 'lucide-react';
import { CanvasProvider, useCanvas } from '@/contexts/CanvasContext';
import CanvasWorkspace from '@/components/canvas/CanvasWorkspace';
import DesktopSidebar from '@/components/editor/DesktopSidebar';
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card shrink-0">
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

      {/* Canvas area with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-14 border-r shrink-0 overflow-auto bg-card">
          <DesktopSidebar
            activePanel={activePanel}
            onPanelChange={setActivePanel}
          />
        </div>
        <div className="flex-1 relative">
          <CanvasWorkspace selectedSize="medio" />
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
