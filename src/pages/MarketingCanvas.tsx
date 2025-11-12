import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CanvasProvider, useCanvas } from "@/contexts/CanvasContext";
import CanvasWorkspace from "@/components/canvas/CanvasWorkspace";
import DesktopSidebar from "@/components/editor/DesktopSidebar";
import { supabase } from "@/integrations/supabase/client";
import { exportCanvasToPNG, exportCanvasToJSON } from "@/lib/canvasExport";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { addToCart } from "@/lib/cart";
import { saveProject } from "@/lib/projectStorage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import BottomTabBar from "@/components/editor/BottomTabBar";
import EditorToolbarV2 from "@/components/editor/EditorToolbarV2";
import ProjectsPanel from "@/components/editor/panels/ProjectsPanel";
import ImagesPanel from "@/components/editor/panels/ImagesPanel";
import TextPanel from "@/components/editor/panels/TextPanel";
import ShapesPanel from "@/components/editor/panels/ShapesPanel";
import ElementsPanel from "@/components/editor/panels/ElementsPanel";
import AIPanel from "@/components/editor/panels/AIPanel";
import TemplatesPanel from "@/components/editor/panels/TemplatesPanel";
import TextTemplatesPanel from "@/components/editor/panels/TextTemplatesPanel";
import FontPanel from "@/components/editor/panels/FontPanel";
import ColorPanel from "@/components/editor/panels/ColorPanel";
import ImageEffectsPanel from "@/components/editor/panels/ImageEffectsPanel";
import LayersPanel from "@/components/editor/LayersPanel";
import PropertiesPanel from "@/components/editor/PropertiesPanel";
import BarcodePanel from "@/components/editor/panels/BarcodePanel";
import { FloatingObjectToolbar } from "@/components/editor/FloatingObjectToolbar";
import { ObjectActionsMenu } from "@/components/editor/ObjectActionsMenu";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { TemplateSelectionDialog } from "@/components/editor/TemplateSelectionDialog";
import { FabricImage, Rect } from "fabric";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";

// Loading overlay shown while the editor initializes
const LoadingOverlay = () => {
  const { isLoading, loadingProgress } = useCanvas();
  if (!isLoading) return null;
  return (
    <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-md mx-auto p-6 rounded-xl border bg-card shadow-lg">
        <div className="mb-3 text-sm text-muted-foreground">Carregando editor...</div>
        <Progress value={loadingProgress} className="w-full" />
        <div className="mt-2 text-xs text-muted-foreground">{Math.round(loadingProgress)}%</div>
      </div>
    </div>
  );
};

interface CanvasStudioV2Props {
  onBack?: () => void;
  selectedSize?: string;
}

const CanvasStudioV2 = ({ onBack, selectedSize = "medio" }: CanvasStudioV2Props) => {
  const navigate = useNavigate();
  const { openSubmenu } = useLayout();
  const [activePanel, setActivePanel] = useState('design');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(null);
  const [userSelectedPanel, setUserSelectedPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [productData, setProductData] = useState<any>(null);
  const isMobile = useIsMobile();
  const isEditingCartItem = sessionStorage.getItem('editingCartItemId') !== null;

  // Check if canvas has content (excluding masks/guides)
  const hasCanvasContent = () => {
    const fabricCanvas = (window as any).fabricCanvas;
    if (!fabricCanvas) return false;
    const objects = fabricCanvas.getObjects();
    // Filtrar apenas objetos que não são máscaras ou guias
    const editableObjects = objects.filter((obj: any) => 
      obj.selectable !== false && !obj.isCutMask && !obj.name?.includes('mask')
    );
    return editableObjects && editableObjects.length > 0;
  };

  // Functions from Desenho.tsx lines 86-476 (all the editor logic, event handlers, etc.)

  // Load product data and show template selection
  useEffect(() => {
    const productJson = sessionStorage.getItem('productForDesign');
    if (productJson) {
      const product = JSON.parse(productJson);
      setProductData(product);
      
      const loadTemplates = async () => {
      };
      
      loadTemplates();
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasCanvasContent()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleNavigateAway = (navFunction: () => void) => {
    if (hasCanvasContent()) {
      setPendingNavigation(() => navFunction);
      setShowExitDialog(true);
    } else {
      navFunction();
    }
  };

  const handleTemplateSelect = async (templateUrl: string) => {
    setShowTemplateDialog(false);

    const fabricCanvas = (window as any).fabricCanvas;
    if (fabricCanvas && templateUrl) {
      try {
        const guide = await FabricImage.fromURL(templateUrl, { crossOrigin: 'anonymous' });
        const maskImg = await FabricImage.fromURL(templateUrl, { crossOrigin: 'anonymous' });

        const maskWidth = guide.width || 800;
        const maskHeight = guide.height || 600;
        fabricCanvas.setDimensions({ width: maskWidth, height: maskHeight });

        guide.set({
          left: 0,
          top: 0,
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          hoverCursor: 'default',
          name: 'mask-guide',
          opacity: 0.18,
          excludeFromExport: true,
        });
        fabricCanvas.add(guide);
        fabricCanvas.sendObjectToBack(guide);

        const maskEl: HTMLImageElement = (maskImg as any).getElement ? (maskImg as any).getElement() : (maskImg as any)._element;
        const alphaCanvas = document.createElement('canvas');
        alphaCanvas.width = maskWidth;
        alphaCanvas.height = maskHeight;
        const actx = alphaCanvas.getContext('2d');
        if (actx) {
          actx.drawImage(maskEl, 0, 0, maskWidth, maskHeight);
          const imgData = actx.getImageData(0, 0, maskWidth, maskHeight);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2];
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
            d[i + 3] = luminance < 245 ? 255 : 0;
          }
          actx.putImageData(imgData, 0, 0);
          const maskDataUrl = alphaCanvas.toDataURL('image/png');
          sessionStorage.setItem('currentMaskDataUrl', maskDataUrl);
          (window as any).__maskDataUrl = maskDataUrl;
        }

        const prev = (window as any).__applyPixelMaskFn;
        if (prev) fabricCanvas.off('after:render', prev);
        (window as any).__applyPixelMaskFn = undefined;

        const clipImg = new FabricImage(alphaCanvas as unknown as HTMLImageElement, {
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
          excludeFromExport: false,
        });
        clipImg.scaleX = (fabricCanvas.width || maskWidth) / maskWidth;
        clipImg.scaleY = (fabricCanvas.height || maskHeight) / maskHeight;
        
        fabricCanvas.clipPath = clipImg;
        fabricCanvas.renderAll();

        const clampToCanvas = (e: any) => {
          const obj = e.target;
          if (!obj || obj.name === 'mask-guide') return;
          const bounds = obj.getBoundingRect(true);
          const cw = (fabricCanvas as any).width;
          const ch = (fabricCanvas as any).height;
          let left = obj.left;
          let top = obj.top;
          if (bounds.left < 0) left -= bounds.left;
          if (bounds.top < 0) top -= bounds.top;
          if (bounds.left + bounds.width > cw) left -= (bounds.left + bounds.width - cw);
          if (bounds.top + bounds.height > ch) top -= (bounds.top + bounds.height - ch);
          obj.set({ left, top });
        };
        fabricCanvas.off('object:moving', clampToCanvas);
        fabricCanvas.off('object:scaling', clampToCanvas);
        fabricCanvas.off('object:rotating', clampToCanvas);
        fabricCanvas.on('object:moving', clampToCanvas);
        fabricCanvas.on('object:scaling', clampToCanvas);
        fabricCanvas.on('object:rotating', clampToCanvas);

        toast.success('Recorte aplicado: fora do gabarito invisível.');
      } catch (error) {
        console.error('Error loading mask:', error);
        toast.error('Erro ao carregar gabarito');
      }
    }
  };

  const handleTemplateCancel = () => {
    setShowTemplateDialog(false);
    navigate(-1);
  };

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleSaveAndExit = async () => {
    const fabricCanvas = (window as any).fabricCanvas;
    
    if (fabricCanvas && hasCanvasContent()) {
      try {
        const jsonData = exportCanvasToJSON(fabricCanvas);
        const pngDataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 0.5, multiplier: 0.5 });
        const productData = sessionStorage.getItem('productForDesign');
        const product = productData ? JSON.parse(productData) : null;
        const projectName = product ? `${product.name} - ${new Date().toLocaleDateString()}` : `Design - ${new Date().toLocaleDateString()}`;
        
        const savedProject = saveProject(projectName, jsonData, pngDataUrl);
        toast.success('Projeto salvo com sucesso!');
      } catch (error: any) {
        console.error('Error saving project:', error);
        toast.error(error.message || 'Erro ao salvar projeto');
      }
    }
    
    handleConfirmExit();
  };

  const handleAddToCartClick = () => {
    if (isEditingCartItem) {
      setShowSaveConfirmDialog(true);
    } else {
      handleAddToCart();
    }
  };

  const handleAddToCart = async () => {
    const productData = sessionStorage.getItem('productForDesign');
    if (!productData) {
      toast.error('Dados do produto não encontrados');
      return;
    }

    const product = JSON.parse(productData);
    const fabricCanvas = (window as any).fabricCanvas;
    if (!fabricCanvas) {
      toast.error('Canvas não encontrado');
      return;
    }

    setSaving(true);
    try {
      const pngBlob = await exportCanvasToPNG(fabricCanvas, 300);
      const pngFile = new File([pngBlob], `design-${Date.now()}.png`, { type: 'image/png' });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ar-previews')
        .upload(`designs/${Date.now()}-${pngFile.name}`, pngFile, {
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ar-previews')
        .getPublicUrl(uploadData.path);

      const designJson = exportCanvasToJSON(fabricCanvas);

      try {
        const pngDataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 0.8 });
        const projectName = `${product.name} - ${new Date().toLocaleDateString()}`;
        saveProject(projectName, designJson, pngDataUrl);
      } catch (error) {
        console.error('Error saving to projects:', error);
      }

      const editingId = sessionStorage.getItem('editingCartItemId');
      
      if (editingId) {
        const { updateCartItem } = await import('@/lib/cart');
        updateCartItem(editingId, {
          designPngUrl: publicUrl,
          designJson: designJson,
        });
        sessionStorage.removeItem('editingCartItemId');
        toast.success('Design atualizado no carrinho!');
      } else {
        addToCart({
          productId: product.id,
          productName: product.name,
          productCode: product.codigo || product.code || 'N/A',
          quantity: product.quantity || 1,
          price: product.price,
          designPngUrl: publicUrl,
          designJson: designJson,
          grupo: product.grupo,
          subgrupo: product.subgrupo,
          tamanho: product.tamanho,
          material: product.material,
          papel: product.papel,
          coating: product.coating,
          cor: product.cor,
        });
        toast.success('Produto adicionado ao carrinho!');
      }

      navigate('/cart');
    } catch (error: any) {
      console.error('Error saving design:', error);
      toast.error(`Erro ao salvar design: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const renderPanel = () => {
    if (userSelectedPanel) {
      switch (activePanel) {
        case 'design':
          return <ProjectsPanel />;
        case 'templates':
          return <TemplatesPanel />;
        case 'text-templates':
          return <TextTemplatesPanel />;
        case 'images':
          return <ImagesPanel />;
        case 'text':
          return <TextPanel />;
        case 'shapes':
          return <ShapesPanel />;
        case 'elements':
          return <ElementsPanel />;
        case 'barcode':
          return <BarcodePanel />;
        case 'ai':
          return <AIPanel />;
        case 'layers':
          return <LayersPanel />;
        case 'properties':
          return <PropertiesPanel />;
        case 'fonts':
          return <FontPanel />;
        case 'colors':
          return <ColorPanel />;
        case 'effects':
          return <ImageEffectsPanel />;
        default:
          return <ProjectsPanel />;
      }
    }

    if (selectedObjectType === 'textbox' || selectedObjectType === 'text' || selectedObjectType === 'i-text') {
      return <FontPanel />;
    }
    if (selectedObjectType === 'image') {
      return <ImageEffectsPanel />;
    }
    if (selectedObjectType && selectedObjectType !== 'textbox' && selectedObjectType !== 'text' && selectedObjectType !== 'i-text' && selectedObjectType !== 'image') {
      return <ColorPanel />;
    }

    switch (activePanel) {
      case 'design':
        return <ProjectsPanel />;
      case 'templates':
        return <TemplatesPanel />;
      case 'text-templates':
        return <TextTemplatesPanel />;
      case 'images':
        return <ImagesPanel />;
      case 'text':
        return <TextPanel />;
      case 'shapes':
        return <ShapesPanel />;
      case 'elements':
        return <ElementsPanel />;
      case 'barcode':
        return <BarcodePanel />;
      case 'ai':
        return <AIPanel />;
      case 'layers':
        return <LayersPanel />;
      case 'properties':
        return <PropertiesPanel />;
      default:
        return <ProjectsPanel />;
    }
  };

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

  return (
    <CanvasProvider onSelectionChange={(objType) => {
        setSelectedObjectType(objType);
        if (objType && !userSelectedPanel) {
          setIsPanelOpen(true);
        }
      }}>
        <div className="h-screen flex flex-col overflow-hidden bg-background">
          {/* Header with submenu */}
          <div className="flex items-center gap-4 px-4 py-2 border-b bg-card">
            <SubMenuHeader 
              title="Marketing"
              onOpenSubmenu={() => openSubmenu("Desenho")}
            />
            <h1 className="text-sm font-semibold text-foreground">Canvas - Editor de Design</h1>
          </div>
          
          {/* Toolbar */}
          <EditorToolbarV2 
            onBack={onBack || (() => handleNavigateAway(() => navigate(-1)))}
          />
          
          <div className="h-full flex overflow-hidden relative pb-14 lg:pb-0">
            <div className="hidden lg:block">
            <DesktopSidebar 
              activePanel={activePanel} 
              onPanelChange={handlePanelChange}
            />
          </div>

          {!isMobile && isPanelOpen && (
            <div className="hidden lg:block w-80 border-r bg-card overflow-y-auto">
              {renderPanel()}
            </div>
          )}

          <div className="flex-1 relative overflow-hidden bg-muted/30">
            <LoadingOverlay />
            <CanvasWorkspace selectedSize={selectedSize} />
            <FloatingObjectToolbar />
            <ObjectActionsMenu />
            
            <div className="absolute bottom-4 right-4 z-10">
              <Button 
                onClick={handleAddToCartClick} 
                disabled={saving}
                size="sm"
                className="gap-2 shadow-lg"
              >
                <ShoppingCart className="h-4 w-4" />
                {saving ? 'Salvando...' : isEditingCartItem ? 'Salvar modificação' : 'Adicionar ao Carrinho'}
              </Button>
            </div>
          </div>

        <div className="lg:hidden">
          <BottomTabBar 
            activePanel={activePanel} 
            onPanelChange={handlePanelChange}
          />
        </div>

        <div className="lg:hidden">
          <Drawer open={isPanelOpen} onOpenChange={setIsPanelOpen}>
            <DrawerContent className="max-h-[80vh] border-t-2 border-border rounded-t-3xl">
              <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mt-3 mb-4" />
              <div className="overflow-y-auto px-4 pb-6">
                {renderPanel()}
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deseja salvar o design?</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem um design em andamento. Deseja salvá-lo antes de sair?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={() => setShowExitDialog(false)}>
                Cancelar
              </AlertDialogCancel>
              <Button variant="outline" onClick={handleConfirmExit}>
                Sair sem salvar
              </Button>
              <AlertDialogAction onClick={handleSaveAndExit}>
                Salvar e sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showSaveConfirmDialog} onOpenChange={setShowSaveConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar modificação</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja salvar as modificações feitas neste design?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={() => setShowSaveConfirmDialog(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowSaveConfirmDialog(false);
                handleAddToCart();
              }}>
                Salvar modificação
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <TemplateSelectionDialog
          open={showTemplateDialog}
          onSelect={handleTemplateSelect}
          onCancel={handleTemplateCancel}
          gabaritoCanvasUrl={productData?.gabarito_canvas_url || null}
          gabaritoCanvasRetangularUrl={productData?.gabarito_canvas_retangular_url || null}
          />
        </div>
    </div>
  </CanvasProvider>
  );
};

export default function MarketingCanvas() {
  return (
    <CanvasStudioV2 selectedSize="medio" />
  );
}
