import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CanvasProvider, useCanvas } from "@/contexts/CanvasContext";
import CanvasWorkspace from "@/components/canvas/CanvasWorkspace";
import DesktopSidebar from "@/components/editor/DesktopSidebar";
import { supabase } from "@/integrations/supabase/client";
import { exportCanvasToPNG, exportCanvasToJSON } from "@/lib/canvasExport";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { addToCart } from "@/lib/cart";
import { saveProject } from "@/lib/projectStorage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EditorHeaderV2 from "@/components/editor/EditorHeaderV2";
import BottomTabBar from "@/components/editor/BottomTabBar";
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

  // Load product data and show template selection
  useEffect(() => {
    const productJson = sessionStorage.getItem('productForDesign');
    if (productJson) {
      const product = JSON.parse(productJson);
      setProductData(product);
      
      // Load both template URLs from database
      const loadTemplates = async () => {
      // For now, skip template loading as products table doesn't exist
      // This can be enabled later when the products table is created
      /*
      const { data } = await supabase
        .from('products')
        .select('gabarito_canvas_url, gabarito_canvas_retangular_url')
        .eq('id', product.id)
        .single();
      
      if (data) {
        const hasTemplates = data.gabarito_canvas_url || data.gabarito_canvas_retangular_url;
        if (hasTemplates) {
          setProductData({ ...product, ...data });
          setShowTemplateDialog(true);
        }
      }
      */
      };
      
      loadTemplates();
    }
  }, []);

  // Prevent accidental browser close
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

  // Handle navigation with confirmation
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
        // Load mask image twice: one as guide, one for pixel processing
        const guide = await FabricImage.fromURL(templateUrl, { crossOrigin: 'anonymous' });
        const maskImg = await FabricImage.fromURL(templateUrl, { crossOrigin: 'anonymous' });

        const maskWidth = guide.width || 800;
        const maskHeight = guide.height || 600;
        fabricCanvas.setDimensions({ width: maskWidth, height: maskHeight });

        // 1) Visual guide (semi-transparent)
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

        // 2) Build alpha mask from luminance (treat near-white as outside)
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
            // inside = darker than threshold -> opaque; outside = near-white -> transparent
            d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
            d[i + 3] = luminance < 245 ? 255 : 0; // threshold tweakable
          }
          actx.putImageData(imgData, 0, 0);
          const maskDataUrl = alphaCanvas.toDataURL('image/png');
          sessionStorage.setItem('currentMaskDataUrl', maskDataUrl);
          (window as any).__maskDataUrl = maskDataUrl;
        }

        // 3) Apply mask using Fabric's native clipPath to avoid flickering and sync with zoom/pan
        // Clean previous after:render mask if any
        const prev = (window as any).__applyPixelMaskFn;
        if (prev) fabricCanvas.off('after:render', prev);
        (window as any).__applyPixelMaskFn = undefined;

        // Create a Fabric image from the alpha canvas to use as clipPath
        const clipImg = new FabricImage(alphaCanvas as unknown as HTMLImageElement, {
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
          excludeFromExport: false,
        });
        // Ensure it matches the canvas size
        clipImg.scaleX = (fabricCanvas.width || maskWidth) / maskWidth;
        clipImg.scaleY = (fabricCanvas.height || maskHeight) / maskHeight;
        
        // Attach as canvas clipPath (will respect zoom/pan without extra work)
        fabricCanvas.clipPath = clipImg;

        // Initial render to apply mask right away
        fabricCanvas.renderAll();

        // Keep UX clamp to canvas bounds
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
    // Return to product page
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
        // Usar qualidade menor para economizar espaço
        const pngDataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 0.5, multiplier: 0.5 });
        const productData = sessionStorage.getItem('productForDesign');
        const product = productData ? JSON.parse(productData) : null;
        const projectName = product ? `${product.name} - ${new Date().toLocaleDateString()}` : `Design - ${new Date().toLocaleDateString()}`;
        
        console.log('Saving project:', projectName);
        const savedProject = saveProject(projectName, jsonData, pngDataUrl);
        console.log('Project saved successfully:', savedProject);
        toast.success('Projeto salvo com sucesso!');
      } catch (error: any) {
        console.error('Error saving project:', error);
        toast.error(error.message || 'Erro ao salvar projeto');
      }
    }
    
    // SEMPRE fechar o diálogo e sair, mesmo se houver erro ao salvar
    handleConfirmExit();
  };

  const handleAddToCartClick = () => {
    // Se está editando um item do carrinho, pedir confirmação
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
      // Exportar o canvas para PNG (funciona mesmo sem imagens)
      const pngBlob = await exportCanvasToPNG(fabricCanvas, 300);
      const pngFile = new File([pngBlob], `design-${Date.now()}.png`, { type: 'image/png' });

      console.log('Uploading design to storage...', pngFile.size, 'bytes');

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ar-previews')
        .upload(`designs/${Date.now()}-${pngFile.name}`, pngFile, {
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('ar-previews')
        .getPublicUrl(uploadData.path);

      console.log('Public URL:', publicUrl);

      const designJson = exportCanvasToJSON(fabricCanvas);
      console.log('Design JSON exported');

      // Save to projects
      try {
        const pngDataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 0.8 });
        const projectName = `${product.name} - ${new Date().toLocaleDateString()}`;
        saveProject(projectName, designJson, pngDataUrl);
        console.log('Project saved to local storage');
      } catch (error) {
        console.error('Error saving to projects:', error);
      }

      const editingId = sessionStorage.getItem('editingCartItemId');
      
      if (editingId) {
        // Atualizar item existente
        console.log('Updating existing cart item:', editingId);
        const { updateCartItem } = await import('@/lib/cart');
        updateCartItem(editingId, {
          designPngUrl: publicUrl,
          designJson: designJson,
        });
        sessionStorage.removeItem('editingCartItemId');
        toast.success('Design atualizado no carrinho!');
      } else {
        // Adicionar novo item
        console.log('Adding new item to cart');
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
        console.log('Item added to cart');
        toast.success('Produto adicionado ao carrinho!');
      }

      console.log('Navigating to cart...');
      navigate('/cart');
    } catch (error: any) {
      console.error('Error saving design:', error);
      toast.error(`Erro ao salvar design: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const renderPanel = () => {
    // Se usuário clicou manualmente em um menu, mostrar esse menu
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

    // Se tem um objeto selecionado, mostrar painel específico dele
    if (selectedObjectType === 'textbox' || selectedObjectType === 'text' || selectedObjectType === 'i-text') {
      return <FontPanel />;
    }
    if (selectedObjectType === 'image') {
      return <ImageEffectsPanel />;
    }
    if (selectedObjectType && selectedObjectType !== 'textbox' && selectedObjectType !== 'text' && selectedObjectType !== 'i-text' && selectedObjectType !== 'image') {
      return <ColorPanel />;
    }

    // Caso contrário, mostrar painel normal baseado no menu
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
      setUserSelectedPanel(true); // Marca que usuário selecionou manualmente
    }
  };

  return (
    <CanvasProvider onSelectionChange={(objType) => {
      setSelectedObjectType(objType);
      if (objType && !userSelectedPanel) {
        // Só abre automaticamente se usuário não selecionou manualmente um painel
        setIsPanelOpen(true);
      }
    }}>
      <div className="h-screen flex flex-col bg-background">
        <EditorHeaderV2 onBack={() => {
          const backAction = onBack || (() => navigate('/'));
          if (hasCanvasContent()) {
            handleNavigateAway(backAction);
          } else {
            backAction();
          }
        }} />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden relative pb-14 lg:pb-0">
          {/* Desktop Sidebar with tool icons - only on large screens */}
          <div className="hidden lg:block">
            <DesktopSidebar 
              activePanel={activePanel} 
              onPanelChange={handlePanelChange}
            />
          </div>

          {/* Desktop Panel - only on large screens */}
          {!isMobile && isPanelOpen && (
            <div className="hidden lg:block w-80 border-r bg-card overflow-y-auto">
              {renderPanel()}
            </div>
          )}

          {/* Canvas area - takes full available space */}
          <div className="flex-1 relative overflow-hidden bg-muted/30">
            <LoadingOverlay />
            <CanvasWorkspace selectedSize={selectedSize} />
            <FloatingObjectToolbar />
            <ObjectActionsMenu />
            
            {/* Floating Add to Cart Button - Bottom Right */}
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
        </div>

        {/* Bottom Tab Bar (mobile and tablet) */}
        <div className="lg:hidden">
          <BottomTabBar 
            activePanel={activePanel} 
            onPanelChange={handlePanelChange}
          />
        </div>

        {/* Mobile and Tablet Panel Drawer */}
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

        {/* Exit Confirmation Dialog */}
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

        {/* Save Modification Confirmation Dialog */}
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

        {/* Template Selection Dialog */}
        <TemplateSelectionDialog
          open={showTemplateDialog}
          onSelect={handleTemplateSelect}
          onCancel={handleTemplateCancel}
          gabaritoCanvasUrl={productData?.gabarito_canvas_url || null}
          gabaritoCanvasRetangularUrl={productData?.gabarito_canvas_retangular_url || null}
        />
      </div>
    </CanvasProvider>
  );
};

export default CanvasStudioV2;
