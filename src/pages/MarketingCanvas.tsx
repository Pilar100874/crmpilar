import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CanvasProvider, useCanvas } from "@/contexts/CanvasContext";
import CanvasWorkspace from "@/components/canvas/CanvasWorkspace";
import DesktopSidebar from "@/components/editor/DesktopSidebar";
import { supabase } from "@/integrations/supabase/client";
import { exportCanvasToPNG, exportCanvasToJSON } from "@/lib/canvasExport";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
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
import InstagramGridPanel from "@/components/editor/panels/InstagramGridPanel";
import { FloatingObjectToolbar } from "@/components/editor/FloatingObjectToolbar";
import { ObjectActionsMenu } from "@/components/editor/ObjectActionsMenu";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { TemplateSelectionDialog } from "@/components/editor/TemplateSelectionDialog";
import { PlatformSelectionDialog, PlatformPreset, GridLayoutConfig, CarouselConfig } from "@/components/editor/PlatformSelectionDialog";
import { FabricImage, Rect, Line, Textbox } from "fabric";
import { Download, Grid, GalleryHorizontal } from "lucide-react";

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
  onClose?: () => void;
}

const CanvasStudioV2 = ({ onBack, selectedSize = "medio", onClose: externalOnClose }: CanvasStudioV2Props) => {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState('design');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(null);
  const [userSelectedPanel, setUserSelectedPanel] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const hasGalleryImage = !!sessionStorage.getItem('marketingCanvasInitialImage');
  const [showPlatformDialog, setShowPlatformDialog] = useState(!hasGalleryImage);
  const [platformPreset, setPlatformPreset] = useState<PlatformPreset | null>(null);
  const [productData, setProductData] = useState<any>(null);
  const [projectName, setProjectName] = useState("Novo Design");
  const isMobile = useIsMobile();
  const galleryImageLoadedRef = useRef(false);

  const removeGridOverlay = () => {
    const fabricCanvas = (window as any).fabricCanvas;
    if (!fabricCanvas) return;
    const overlayObjects = fabricCanvas.getObjects().filter((obj: any) =>
      obj.name?.startsWith('grid-line-') || obj.name?.startsWith('grid-num-') ||
      obj.name?.startsWith('carousel-line-') || obj.name?.startsWith('carousel-num-')
    );
    overlayObjects.forEach((obj: any) => fabricCanvas.remove(obj));
    // Remove listener
    const keepFn = (window as any).__gridKeepOnTopFn;
    if (keepFn) {
      fabricCanvas.off('object:added', keepFn);
      (window as any).__gridKeepOnTopFn = undefined;
    }
    fabricCanvas.renderAll();
  };

  const handlePlatformSelect = (preset: PlatformPreset) => {
    // Remove old overlays when switching platform/type
    removeGridOverlay();

    setPlatformPreset(preset);
    setShowPlatformDialog(false);
    toast.success(`Canvas configurado para ${preset.label}`);

    // If grid preset, apply grid lines after canvas is ready
    if (preset.gridLayout) {
      setTimeout(() => applyGridOverlay(preset.gridLayout!, preset.width, preset.height), 800);
    }
    // If carousel preset, apply carousel lines
    if (preset.carouselConfig) {
      setTimeout(() => applyCarouselOverlay(preset.carouselConfig!, preset.width, preset.height), 800);
    }
  };

  const bringGridToFront = (fabricCanvas: any) => {
    const gridObjects = fabricCanvas.getObjects().filter((obj: any) =>
      obj.name?.startsWith('grid-line-') || obj.name?.startsWith('grid-num-')
    );
    gridObjects.forEach((obj: any) => fabricCanvas.bringObjectToFront(obj));
  };

  const applyGridOverlay = (layout: GridLayoutConfig, totalW: number, totalH: number) => {
    const fabricCanvas = (window as any).fabricCanvas;
    if (!fabricCanvas) return;

    const { cols, rows } = layout;
    const cw = fabricCanvas.width || totalW;
    const ch = fabricCanvas.height || totalH;

    // Draw vertical dashed lines
    for (let i = 1; i < cols; i++) {
      const x = (cw / cols) * i;
      const line = new Line([x, 0, x, ch], {
        stroke: 'rgba(255,255,255,0.8)',
        strokeWidth: 2,
        strokeDashArray: [8, 6],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: `grid-line-v-${i}`,
      });
      fabricCanvas.add(line);
    }

    // Draw horizontal dashed lines
    for (let i = 1; i < rows; i++) {
      const y = (ch / rows) * i;
      const line = new Line([0, y, cw, y], {
        stroke: 'rgba(255,255,255,0.8)',
        strokeWidth: 2,
        strokeDashArray: [8, 6],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: `grid-line-h-${i}`,
      });
      fabricCanvas.add(line);
    }

    // Add cell numbers
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const postNum = (rows - 1 - r) * cols + (cols - 1 - c) + 1;
        const cellW = cw / cols;
        const cellH = ch / rows;
        const text = new Textbox(`${postNum}º`, {
          left: c * cellW + cellW / 2,
          top: r * cellH + cellH / 2,
          originX: 'center',
          originY: 'center',
          fontSize: Math.min(cellW, cellH) * 0.12,
          fill: 'rgba(255,255,255,0.9)',
          fontWeight: 'bold',
          backgroundColor: 'rgba(0,0,0,0.5)',
          textAlign: 'center',
          selectable: false,
          evented: false,
          excludeFromExport: true,
          name: `grid-num-${r}-${c}`,
          editable: false,
          width: 60,
        });
        fabricCanvas.add(text);
      }
    }

    // Ensure grid is always on top
    bringGridToFront(fabricCanvas);

    // Listen for object additions to keep grid on top
    const keepGridOnTop = () => bringGridToFront(fabricCanvas);
    fabricCanvas.off('object:added', keepGridOnTop);
    fabricCanvas.on('object:added', keepGridOnTop);
    (window as any).__gridKeepOnTopFn = keepGridOnTop;

    fabricCanvas.renderAll();
  };

  const exportGridPieces = () => {
    if (!platformPreset?.gridLayout) return;
    const fabricCanvas = (window as any).fabricCanvas;
    if (!fabricCanvas) return;

    const { cols, rows } = platformPreset.gridLayout;
    
    // Temporarily hide grid overlay objects
    const gridObjects = fabricCanvas.getObjects().filter((obj: any) => 
      obj.name?.startsWith('grid-line-') || obj.name?.startsWith('grid-num-')
    );
    gridObjects.forEach((obj: any) => obj.set('visible', false));
    fabricCanvas.renderAll();

    const cw = fabricCanvas.width || 1080;
    const ch = fabricCanvas.height || 1080;
    const cellW = cw / cols;
    const cellH = ch / rows;

    // Export full canvas at 2x quality
    const multiplier = 2;
    const fullDataUrl = fabricCanvas.toDataURL({
      format: 'jpeg',
      quality: 0.95,
      multiplier,
    });

    // Restore grid overlays
    gridObjects.forEach((obj: any) => obj.set('visible', true));
    fabricCanvas.renderAll();

    const img = new Image();
    img.onload = () => {
      const pieces: string[] = [];
      const pCellW = (img.width / cols);
      const pCellH = (img.height / rows);

      // Bottom-right to top-left (Instagram posting order)
      for (let r = rows - 1; r >= 0; r--) {
        for (let c = cols - 1; c >= 0; c--) {
          const pieceCanvas = document.createElement('canvas');
          pieceCanvas.width = pCellW;
          pieceCanvas.height = pCellH;
          const ctx = pieceCanvas.getContext('2d')!;
          ctx.drawImage(img, c * pCellW, r * pCellH, pCellW, pCellH, 0, 0, pCellW, pCellH);
          pieces.push(pieceCanvas.toDataURL('image/jpeg', 0.95));
        }
      }

      // Download all pieces
      pieces.forEach((piece, idx) => {
        const link = document.createElement('a');
        link.href = piece;
        link.download = `instagram_grid_${String(idx + 1).padStart(2, '0')}.jpg`;
        link.click();
      });

      toast.success(`${pieces.length} posts do grid exportados! Poste na ordem: 1, 2, 3...`);
    };
    img.src = fullDataUrl;
  };

  const applyCarouselOverlay = (config: CarouselConfig, totalW: number, totalH: number) => {
    const fabricCanvas = (window as any).fabricCanvas;
    if (!fabricCanvas) return;

    const { slides } = config;
    const cw = fabricCanvas.width || totalW;
    const ch = fabricCanvas.height || totalH;
    const slideW = cw / slides;

    // Draw vertical dashed lines between slides
    for (let i = 1; i < slides; i++) {
      const x = slideW * i;
      const line = new Line([x, 0, x, ch], {
        stroke: 'rgba(255,255,255,0.8)',
        strokeWidth: 2,
        strokeDashArray: [10, 6],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: `carousel-line-${i}`,
      });
      fabricCanvas.add(line);
    }

    // Add slide numbers
    for (let i = 0; i < slides; i++) {
      const text = new Textbox(`${i + 1}`, {
        left: i * slideW + slideW / 2,
        top: ch / 2,
        originX: 'center',
        originY: 'center',
        fontSize: Math.min(slideW, ch) * 0.1,
        fill: 'rgba(255,255,255,0.9)',
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.5)',
        textAlign: 'center',
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: `carousel-num-${i}`,
        editable: false,
        width: 50,
      });
      fabricCanvas.add(text);
    }

    // Keep overlay on top
    const bringOverlayToFront = () => {
      const overlays = fabricCanvas.getObjects().filter((obj: any) =>
        obj.name?.startsWith('carousel-line-') || obj.name?.startsWith('carousel-num-')
      );
      overlays.forEach((obj: any) => fabricCanvas.bringObjectToFront(obj));
    };
    bringOverlayToFront();

    fabricCanvas.off('object:added', bringOverlayToFront);
    fabricCanvas.on('object:added', bringOverlayToFront);
    (window as any).__gridKeepOnTopFn = bringOverlayToFront;

    fabricCanvas.renderAll();
  };

  const exportCarouselSlides = () => {
    if (!platformPreset?.carouselConfig) return;
    const fabricCanvas = (window as any).fabricCanvas;
    if (!fabricCanvas) return;

    const { slides } = platformPreset.carouselConfig;

    // Temporarily hide overlay objects
    const overlayObjects = fabricCanvas.getObjects().filter((obj: any) =>
      obj.name?.startsWith('carousel-line-') || obj.name?.startsWith('carousel-num-')
    );
    overlayObjects.forEach((obj: any) => obj.set('visible', false));
    fabricCanvas.renderAll();

    const multiplier = 2;
    const fullDataUrl = fabricCanvas.toDataURL({
      format: 'jpeg',
      quality: 0.95,
      multiplier,
    });

    // Restore overlays
    overlayObjects.forEach((obj: any) => obj.set('visible', true));
    fabricCanvas.renderAll();

    const img = new Image();
    img.onload = () => {
      const slideW = img.width / slides;
      const slideH = img.height;

      for (let i = 0; i < slides; i++) {
        const slideCanvas = document.createElement('canvas');
        slideCanvas.width = slideW;
        slideCanvas.height = slideH;
        const ctx = slideCanvas.getContext('2d')!;
        ctx.drawImage(img, i * slideW, 0, slideW, slideH, 0, 0, slideW, slideH);
        
        const link = document.createElement('a');
        link.href = slideCanvas.toDataURL('image/jpeg', 0.95);
        link.download = `instagram_carrossel_${String(i + 1).padStart(2, '0')}.jpg`;
        link.click();
      }

      toast.success(`${slides} slides do carrossel exportados!`);
    };
    img.src = fullDataUrl;
  };

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

  useEffect(() => {
    if (showPlatformDialog || galleryImageLoadedRef.current) return;

    const raw = sessionStorage.getItem('marketingCanvasInitialImage');
    if (!raw) return;

    let payload: { url: string; resourceName?: string } | null = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem('marketingCanvasInitialImage');
      return;
    }

    if (!payload?.url) {
      sessionStorage.removeItem('marketingCanvasInitialImage');
      return;
    }

    let cancelled = false;

    const injectImage = async (attempt = 0) => {
      if (cancelled) return;

      const fabricCanvas = (window as any).fabricCanvas;
      if (!fabricCanvas) {
        if (attempt < 40) setTimeout(() => injectImage(attempt + 1), 250);
        return;
      }

      try {
        const img = await FabricImage.fromURL(payload!.url, { crossOrigin: 'anonymous' });
        const canvasW = fabricCanvas.width || 1080;
        const canvasH = fabricCanvas.height || 1080;
        const imgW = img.width || canvasW * 0.7;
        const imgH = img.height || canvasH * 0.7;
        const scale = Math.min((canvasW * 0.8) / imgW, (canvasH * 0.8) / imgH, 1);

        img.set({
          left: canvasW / 2,
          top: canvasH / 2,
          originX: 'center',
          originY: 'center',
          name: payload?.resourceName || 'galeria-image',
        });
        img.scale(scale);

        fabricCanvas.add(img);
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();

        galleryImageLoadedRef.current = true;
        sessionStorage.removeItem('marketingCanvasInitialImage');
        toast.success('Imagem aberta no editor de design');
      } catch (error) {
        console.error('Erro ao abrir imagem da galeria no editor:', error);
        sessionStorage.removeItem('marketingCanvasInitialImage');
        toast.error('Não foi possível abrir a imagem no editor');
      }
    };

    injectImage();

    return () => {
      cancelled = true;
    };
  }, [showPlatformDialog]);

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
        
        const pngDataUrl = fabricCanvas.toDataURL({ 
          format: 'jpeg', 
          quality: 0.6, 
          multiplier: scale,
          enableRetinaScaling: false,
        });
        const productData = sessionStorage.getItem('productForDesign');
        const product = productData ? JSON.parse(productData) : null;
        const projectName = product ? `${product.name} - ${new Date().toLocaleDateString()}` : `Design - ${new Date().toLocaleDateString()}`;
        
        const savedProject = saveProject(
          projectName, 
          jsonData, 
          pngDataUrl,
          platformPreset?.platform,
          platformPreset?.label,
          platformPreset ? { width: platformPreset.width, height: platformPreset.height } : undefined
        );
        toast.success('Projeto salvo com sucesso!');
      } catch (error: any) {
        console.error('Error saving project:', error);
        toast.error(error.message || 'Erro ao salvar projeto');
      }
    }
    
    handleConfirmExit();
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
        case 'instagram-grid':
          return <InstagramGridPanel />;
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
      if (activePanel === 'effects') {
        return <ImageEffectsPanel />;
      }
      return <PropertiesPanel />;
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
      case 'instagram-grid':
        return <InstagramGridPanel />;
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

  const handleClose = () => {
    console.log('handleClose chamado, externalOnClose:', !!externalOnClose);
    if (hasCanvasContent()) {
      console.log('Abrindo dialog de confirmação');
      setPendingNavigation(() => () => {
        if (externalOnClose) {
          externalOnClose();
        } else {
          navigate('/marketing');
        }
      });
      setShowExitDialog(true);
    } else {
      console.log('Fechando canvas');
      if (externalOnClose) {
        externalOnClose();
      } else {
        navigate('/marketing');
      }
    }
  };

  return (
    <CanvasProvider onSelectionChange={(objType) => {
        setSelectedObjectType(objType);
        if (objType && !userSelectedPanel) {
          setIsPanelOpen(true);
        }
      }}>
        <div className="workflow-shell fixed inset-0 z-50 flex flex-col overflow-hidden bg-background">
          {/* Toolbar */}
            <EditorToolbarV2 
              projectName={projectName}
              onProjectNameChange={setProjectName}
              currentPlatform={platformPreset}
              onChangePlatform={() => setShowPlatformDialog(true)}
              onClose={handleClose}
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

          <div className="flex-1 relative overflow-hidden bg-muted/30" data-canvas-area>
            <LoadingOverlay />
            <CanvasWorkspace 
              selectedSize={selectedSize} 
              platformPreset={platformPreset}
            />
            <FloatingObjectToolbar />
            <ObjectActionsMenu />

            {/* Grid export floating button */}
            {platformPreset?.gridLayout && (
              <Button
                onClick={exportGridPieces}
                className="absolute bottom-4 right-4 z-20 gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg"
                size="lg"
              >
                <Download className="h-4 w-4" />
                Exportar Grid ({platformPreset.gridLayout.cols * platformPreset.gridLayout.rows} posts)
              </Button>
            )}

            {/* Carousel export floating button */}
            {platformPreset?.carouselConfig && (
              <Button
                onClick={exportCarouselSlides}
                className="absolute bottom-4 right-4 z-20 gap-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white shadow-lg"
                size="lg"
              >
                <Download className="h-4 w-4" />
                Exportar Carrossel ({platformPreset.carouselConfig.slides} slides)
              </Button>
            )}
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
              <AlertDialogAction onClick={handleSaveAndExit} className="bg-primary hover:bg-primary/90">
                Salvar e sair
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
        
        <PlatformSelectionDialog
          open={showPlatformDialog}
          onSelect={handlePlatformSelect}
          onClose={() => setShowPlatformDialog(false)}
        />
        </div>
    </div>
  </CanvasProvider>
  );
};

export default function MarketingCanvas({ onClose }: { onClose?: () => void }) {
  return (
    <CanvasStudioV2 selectedSize="medio" onClose={onClose} />
  );
}
