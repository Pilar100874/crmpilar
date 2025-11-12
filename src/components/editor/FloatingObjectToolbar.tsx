import { useCanvas } from "@/contexts/CanvasContext";
import { toast } from "@/lib/toast-config";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  FlipHorizontal, 
  FlipVertical, 
  RotateCcw, 
  RotateCw,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Wand2,
  Sun,
  Contrast,
  Droplet,
  Paintbrush,
  Image as ImageIcon,
  Copy,
  Scissors,
  Type,
  Square as SquareIcon,
  Maximize,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  AlignStartVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  SeparatorHorizontal,
  SeparatorVertical,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ArrowDownToLine,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { filters as fabricFilters, Gradient, FabricImage } from "fabric";
import { applyOffsetWrap, applyOffsetWrapLeft, applyOffsetWrapWithCutLine, applyPattern } from "@/lib/utils";

export const FloatingObjectToolbar = () => {
  const { fabricCanvas, selectedObjectType } = useCanvas();
  const [activeObject, setActiveObject] = useState<any>(null);
  const [isMultipleSelection, setIsMultipleSelection] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [opacity, setOpacity] = useState(100);
  const [fillColor, setFillColor] = useState("#000000");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowOffsetX, setShadowOffsetX] = useState(0);
  const [shadowOffsetY, setShadowOffsetY] = useState(0);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [cutLinePosition, setCutLinePosition] = useState(50);
  const [fontQuery, setFontQuery] = useState("");
  const [patternRepeatX, setPatternRepeatX] = useState(2);
  const [patternRepeatY, setPatternRepeatY] = useState(2);

  // Font lists - web-safe + popular Google fonts
  const webSafeFonts = [
    "Arial","Helvetica","Times New Roman","Georgia","Verdana","Trebuchet MS","Courier New",
    "Impact","Tahoma","Palatino","Garamond","Bookman","Comic Sans MS","System UI","Segoe UI"
  ];
  const googleFonts = [
    "Open Sans","Roboto","Poppins","Montserrat","Lato","Inter","Oswald","Raleway","Playfair Display",
    "Merriweather","Source Sans Pro","Nunito","Rubik","Work Sans","Quicksand","Noto Sans","DM Sans",
    "Fira Sans","Karla","Mulish","Titillium Web","Hind","Cabin","Asap","Manrope","Barlow","Josefin Sans",
    "Varela Round","Bebas Neue","Abril Fatface","Cairo","Teko","Kanit","Urbanist","Archivo","Sora",
    "Space Grotesk","PT Sans","PT Serif","Crimson Text","Spectral","Comfortaa","Zilla Slab","Alice",
    "Dancing Script","Great Vibes","Pacifico","Lobster","Indie Flower","Shadows Into Light","Amatic SC",
    "Exo","Exo 2"
  ];
  const allFonts = Array.from(new Set([...webSafeFonts, ...googleFonts]));

  const toGoogleFontURL = (name: string) =>
    `https://fonts.googleapis.com/css2?family=${name.replace(/\s+/g, "+")}:wght@300;400;600;700&display=swap`;

  const loadFont = async (name: string) => {
    const id = `gf-${name.replace(/\s+/g, "-").toLowerCase()}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = toGoogleFontURL(name);
      document.head.appendChild(link);
    }
    try {
      await (document as any).fonts.load(`1rem "${name}"`);
    } catch {
      // ignore load failure, fallback will apply if not available
    }
  };

  useEffect(() => {
    if (!fabricCanvas) return;

    const updateActiveObject = () => {
      const obj = fabricCanvas.getActiveObject();
      setActiveObject(obj);
      
      // Detecta seleção múltipla de forma robusta
      const selectedCount = fabricCanvas.getActiveObjects().length;
      const isMultiple = selectedCount > 1 || obj?.type === 'activeSelection';
      setIsMultipleSelection(isMultiple);
      
      // Debug logs
      console.log('Active object type:', obj?.type);
      console.log('Selected count:', selectedCount);
      console.log('Is multiple selection:', isMultiple);
      
      if (obj) {
        setOpacity(Math.round((obj.opacity || 1) * 100));
        if (obj.fill && typeof obj.fill === 'string') {
          setFillColor(obj.fill);
        }
        if (obj.stroke && typeof obj.stroke === 'string') {
          setStrokeColor(obj.stroke);
        }
        if (obj.strokeWidth !== undefined) {
          setStrokeWidth(obj.strokeWidth);
        }
        if ((obj as any).fontFamily) {
          setFontFamily((obj as any).fontFamily);
        }
        
        // Load shadow values
        if (obj.shadow) {
          setShadowBlur(obj.shadow.blur || 0);
          setShadowOffsetX(obj.shadow.offsetX || 0);
          setShadowOffsetY(obj.shadow.offsetY || 0);
        }
        
        // Load filter values for images
        if (obj.type === 'image' && (obj as any).filters) {
          (obj as any).filters.forEach((filter: any) => {
            if (filter.type === 'Brightness') {
              setBrightness(Math.round((filter.brightness || 0) * 100));
            }
            if (filter.type === 'Contrast') {
              setContrast(Math.round((filter.contrast || 0) * 100));
            }
            if (filter.type === 'Saturation') {
              setSaturation(Math.round((filter.saturation || 0) * 100));
            }
          });
        }
      }
    };

    fabricCanvas.on('selection:created', updateActiveObject);
    fabricCanvas.on('selection:updated', updateActiveObject);
    fabricCanvas.on('selection:cleared', () => {
      setActiveObject(null);
      setIsMultipleSelection(false);
      console.log('Selection cleared');
    });

    return () => {
      fabricCanvas.off('selection:created', updateActiveObject);
      fabricCanvas.off('selection:updated', updateActiveObject);
      fabricCanvas.off('selection:cleared');
    };
  }, [fabricCanvas]);

  if ((!activeObject && (fabricCanvas?.getActiveObjects().length || 0) < 1)) return null;

  const handleFlipH = () => {
    if (!activeObject) return;
    activeObject.set('flipX', !activeObject.flipX);
    fabricCanvas?.renderAll();
  };

  const handleFlipV = () => {
    if (!activeObject) return;
    activeObject.set('flipY', !activeObject.flipY);
    fabricCanvas?.renderAll();
  };

  const handleRotateLeft = () => {
    if (!activeObject) return;
    activeObject.rotate((activeObject.angle || 0) - 90);
    fabricCanvas?.renderAll();
  };

  const handleRotateRight = () => {
    if (!activeObject) return;
    activeObject.rotate((activeObject.angle || 0) + 90);
    fabricCanvas?.renderAll();
  };

  const handleOpacityChange = (value: number[]) => {
    if (!activeObject) return;
    const newOpacity = value[0] / 100;
    activeObject.set('opacity', newOpacity);
    setOpacity(value[0]);
    fabricCanvas?.renderAll();
  };

  const handleColorChange = (color: string) => {
    if (!activeObject) return;
    activeObject.set('fill', color);
    setFillColor(color);
    fabricCanvas?.renderAll();
  };

  const handleBold = () => {
    if (!activeObject) return;
    const currentWeight = activeObject.fontWeight || 'normal';
    activeObject.set('fontWeight', currentWeight === 'bold' ? 'normal' : 'bold');
    fabricCanvas?.renderAll();
  };

  const handleItalic = () => {
    if (!activeObject) return;
    const currentStyle = activeObject.fontStyle || 'normal';
    activeObject.set('fontStyle', currentStyle === 'italic' ? 'normal' : 'italic');
    fabricCanvas?.renderAll();
  };

  const handleUnderline = () => {
    if (!activeObject) return;
    activeObject.set('underline', !activeObject.underline);
    fabricCanvas?.renderAll();
  };

  const handleAlign = (align: string) => {
    if (!activeObject) return;
    activeObject.set('textAlign', align);
    fabricCanvas?.renderAll();
  };

  const applyFilters = () => {
    if (!activeObject || activeObject.type !== 'image') return;

    const filters: any[] = [];

    if (brightness !== 0) {
      filters.push(new fabricFilters.Brightness({ brightness: brightness / 100 }));
    }
    if (contrast !== 0) {
      filters.push(new fabricFilters.Contrast({ contrast: contrast / 100 }));
    }
    if (saturation !== 0) {
      filters.push(new fabricFilters.Saturation({ saturation: saturation / 100 }));
    }

    (activeObject as any).filters = filters;
    (activeObject as any).applyFilters();
    fabricCanvas?.renderAll();
  };

  const handleBrightnessChange = (value: number[]) => {
    setBrightness(value[0]);
    setTimeout(() => applyFilters(), 0);
  };

  const handleContrastChange = (value: number[]) => {
    setContrast(value[0]);
    setTimeout(() => applyFilters(), 0);
  };

  const handleSaturationChange = (value: number[]) => {
    setSaturation(value[0]);
    setTimeout(() => applyFilters(), 0);
  };

  const applyPresetFilter = (filterType: 'grayscale' | 'sepia' | 'invert') => {
    if (!activeObject || activeObject.type !== 'image') return;

    const filters: any[] = [];

    if (filterType === 'grayscale') {
      filters.push(new fabricFilters.Grayscale());
    } else if (filterType === 'sepia') {
      filters.push(new fabricFilters.Sepia());
    } else if (filterType === 'invert') {
      filters.push(new fabricFilters.Invert());
    }

    (activeObject as any).filters = filters;
    (activeObject as any).applyFilters();
    fabricCanvas?.renderAll();
  };

  const handleShadowBlurChange = (value: number[]) => {
    if (!activeObject) return;
    setShadowBlur(value[0]);
    updateShadow(value[0], shadowOffsetX, shadowOffsetY);
  };

  const handleShadowOffsetXChange = (value: number[]) => {
    if (!activeObject) return;
    setShadowOffsetX(value[0]);
    updateShadow(shadowBlur, value[0], shadowOffsetY);
  };

  const handleShadowOffsetYChange = (value: number[]) => {
    if (!activeObject) return;
    setShadowOffsetY(value[0]);
    updateShadow(shadowBlur, shadowOffsetX, value[0]);
  };

  const updateShadow = (blur: number, offsetX: number, offsetY: number) => {
    if (!activeObject) return;
    
    if (blur === 0 && offsetX === 0 && offsetY === 0) {
      activeObject.set('shadow', null);
    } else {
      activeObject.set('shadow', {
        color: 'rgba(0,0,0,0.3)',
        blur: blur,
        offsetX: offsetX,
        offsetY: offsetY,
      });
    }
    fabricCanvas?.renderAll();
  };

  const fillCanvas = () => {
    if (!activeObject || !fabricCanvas) return;
    const canvasWidth = fabricCanvas.width || 800;
    const canvasHeight = fabricCanvas.height || 600;
    
    const objWidth = (activeObject.width || 1) * (activeObject.scaleX || 1);
    const objHeight = (activeObject.height || 1) * (activeObject.scaleY || 1);
    
    const scaleX = canvasWidth / objWidth;
    const scaleY = canvasHeight / objHeight;
    const scale = Math.max(scaleX, scaleY);
    
    activeObject.set({
      scaleX: (activeObject.scaleX || 1) * scale,
      scaleY: (activeObject.scaleY || 1) * scale,
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: 'center',
      originY: 'center'
    });
    
    fabricCanvas.renderAll();
  };

  const mirrorImage = async () => {
    if (!activeObject || !fabricCanvas) return;
    if (activeObject.type !== 'image') {
      toast.error('Selecione uma imagem para espelhar');
      return;
    }
    
    toast.loading('Espelhando imagem à direita...');
    try {
      const imgElement = (activeObject as any).getElement() as HTMLImageElement;
      const currentLeft = activeObject.left || 0;
      const currentTop = activeObject.top || 0;
      const currentScaleX = activeObject.scaleX || 1;
      const currentScaleY = activeObject.scaleY || 1;
      const currentAngle = activeObject.angle || 0;

      const dataUrl = await applyOffsetWrap(imgElement);
      FabricImage.fromURL(dataUrl).then((newImg) => {
        newImg.set({
          left: currentLeft,
          top: currentTop,
          scaleX: currentScaleX,
          scaleY: currentScaleY,
          angle: currentAngle,
        });
        fabricCanvas.remove(activeObject);
        fabricCanvas.add(newImg);
        fabricCanvas.setActiveObject(newImg);
        fabricCanvas.renderAll();
        toast.dismiss();
        toast.success('Imagem espelhada à direita com sucesso!');
      });
    } catch (error) {
      console.error('Error mirroring image:', error);
      toast.dismiss();
      toast.error('Erro ao espelhar imagem');
    }
  };

  const mirrorImageLeft = async () => {
    if (!activeObject || !fabricCanvas) return;
    if (activeObject.type !== 'image') {
      toast.error('Selecione uma imagem para espelhar');
      return;
    }
    
    toast.loading('Espelhando imagem à esquerda...');
    try {
      const imgElement = (activeObject as any).getElement() as HTMLImageElement;
      const currentLeft = activeObject.left || 0;
      const currentTop = activeObject.top || 0;
      const currentScaleX = activeObject.scaleX || 1;
      const currentScaleY = activeObject.scaleY || 1;
      const currentAngle = activeObject.angle || 0;

      const dataUrl = await applyOffsetWrapLeft(imgElement);
      FabricImage.fromURL(dataUrl).then((newImg) => {
        newImg.set({
          left: currentLeft,
          top: currentTop,
          scaleX: currentScaleX,
          scaleY: currentScaleY,
          angle: currentAngle,
        });
        fabricCanvas.remove(activeObject);
        fabricCanvas.add(newImg);
        fabricCanvas.setActiveObject(newImg);
        fabricCanvas.renderAll();
        toast.dismiss();
        toast.success('Imagem espelhada à esquerda com sucesso!');
      });
    } catch (error) {
      console.error('Error mirroring image left:', error);
      toast.dismiss();
      toast.error('Erro ao espelhar imagem');
    }
  };

  const handleStrokeColorChange = (color: string) => {
    if (!activeObject) return;
    setStrokeColor(color);
    activeObject.set('stroke', color);
    if (activeObject.strokeWidth === 0) {
      activeObject.set('strokeWidth', 2);
      setStrokeWidth(2);
    }
    fabricCanvas?.renderAll();
  };

  const handleStrokeWidthChange = (value: number[]) => {
    if (!activeObject) return;
    setStrokeWidth(value[0]);
    activeObject.set('strokeWidth', value[0]);
    fabricCanvas?.renderAll();
  };

  const handleFontChange = async (font: string) => {
    if (!activeObject) return;
    setFontFamily(font);
    await loadFont(font);
    activeObject.set('fontFamily', font);
    fabricCanvas?.renderAll();
  };

  const applyGradient = (type: 'horizontal' | 'vertical') => {
    if (!activeObject) return;
    
    const width = activeObject.width || 100;
    const height = activeObject.height || 100;
    
    const gradient = new Gradient({
      type: 'linear',
      coords: type === 'horizontal' 
        ? { x1: 0, y1: 0, x2: width, y2: 0 }
        : { x1: 0, y1: 0, x2: 0, y2: height },
      colorStops: [
        { offset: 0, color: fillColor },
        { offset: 1, color: '#ffffff' }
      ]
    });
    
    activeObject.set('fill', gradient);
    fabricCanvas?.renderAll();
  };

  const applyPatternToImage = async () => {
    if (!activeObject || !fabricCanvas) return;
    if (activeObject.type !== 'image') {
      toast.error('Selecione uma imagem para aplicar padrão');
      return;
    }
    
    toast.loading('Aplicando padrão de repetição...');
    try {
      const imgElement = (activeObject as any).getElement() as HTMLImageElement;
      const currentLeft = activeObject.left || 0;
      const currentTop = activeObject.top || 0;
      const currentScaleX = activeObject.scaleX || 1;
      const currentScaleY = activeObject.scaleY || 1;
      const currentAngle = activeObject.angle || 0;

      const dataUrl = await applyPattern(imgElement, patternRepeatX, patternRepeatY);

      FabricImage.fromURL(dataUrl).then((newImg) => {
        newImg.set({
          left: currentLeft,
          top: currentTop,
          scaleX: currentScaleX,
          scaleY: currentScaleY,
          angle: currentAngle,
        });
        fabricCanvas.remove(activeObject);
        fabricCanvas.add(newImg);
        fabricCanvas.setActiveObject(newImg);
        fabricCanvas.renderAll();
        toast.dismiss();
        toast.success('Padrão aplicado com sucesso!');
      });
    } catch (error) {
      console.error('Error applying pattern:', error);
      toast.dismiss();
      toast.error('Erro ao aplicar padrão');
    }
  };

  const applyCutLineMirror = async () => {
    if (!activeObject || !fabricCanvas) return;
    if (activeObject.type !== 'image') {
      toast.error('Selecione uma imagem para aplicar espelhamento');
      return;
    }
    
    toast.loading('Aplicando espelhamento com linha de corte...');
    try {
      const imgElement = (activeObject as any).getElement() as HTMLImageElement;
      const currentLeft = activeObject.left || 0;
      const currentTop = activeObject.top || 0;
      const currentScaleX = activeObject.scaleX || 1;
      const currentScaleY = activeObject.scaleY || 1;
      const currentAngle = activeObject.angle || 0;

      const fraction = Math.min(0.9, Math.max(0.1, cutLinePosition / 100));
      const dataUrl = await applyOffsetWrapWithCutLine(imgElement, fraction);

      FabricImage.fromURL(dataUrl).then((newImg) => {
        newImg.set({
          left: currentLeft,
          top: currentTop,
          scaleX: currentScaleX,
          scaleY: currentScaleY,
          angle: currentAngle,
        });
        fabricCanvas.remove(activeObject);
        fabricCanvas.add(newImg);
        fabricCanvas.setActiveObject(newImg);
        fabricCanvas.renderAll();
        toast.dismiss();
        toast.success('Espelhamento com linha de corte aplicado!');
      });
    } catch (error) {
      console.error('Error applying cut line mirror:', error);
      toast.dismiss();
      toast.error('Erro ao aplicar espelhamento com linha');
    }
  };
  
  const alignObjects = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!activeObject || !fabricCanvas) return;
    
    const selection = activeObject;
    if (selection.type !== 'activeSelection') return;
    
    const objects = (selection as any)._objects;
    if (!objects || objects.length < 2) return;
    
    // Calculate bounds
    let minLeft = Infinity, maxRight = -Infinity;
    let minTop = Infinity, maxBottom = -Infinity;
    
    objects.forEach((obj: any) => {
      const left = obj.left;
      const top = obj.top;
      const width = obj.width * obj.scaleX;
      const height = obj.height * obj.scaleY;
      
      minLeft = Math.min(minLeft, left);
      maxRight = Math.max(maxRight, left + width);
      minTop = Math.min(minTop, top);
      maxBottom = Math.max(maxBottom, top + height);
    });
    
    const centerH = (minLeft + maxRight) / 2;
    const centerV = (minTop + maxBottom) / 2;
    
    objects.forEach((obj: any) => {
      const width = obj.width * obj.scaleX;
      const height = obj.height * obj.scaleY;
      
      switch (alignment) {
        case 'left':
          obj.set({ left: minLeft });
          break;
        case 'center':
          obj.set({ left: centerH - width / 2 });
          break;
        case 'right':
          obj.set({ left: maxRight - width });
          break;
        case 'top':
          obj.set({ top: minTop });
          break;
        case 'middle':
          obj.set({ top: centerV - height / 2 });
          break;
        case 'bottom':
          obj.set({ top: maxBottom - height });
          break;
      }
      obj.setCoords();
    });
    
    fabricCanvas.renderAll();
    toast.success(`Objetos alinhados: ${alignment === 'left' || alignment === 'center' || alignment === 'right' ? 'horizontal' : 'vertical'}`);
  };

  const distributeObjects = (direction: 'horizontal' | 'vertical') => {
    if (!activeObject || !fabricCanvas) return;
    
    const selection = activeObject;
    if (selection.type !== 'activeSelection') return;
    
    const objects = (selection as any)._objects;
    if (!objects || objects.length < 3) {
      toast.error('Selecione pelo menos 3 objetos para distribuir');
      return;
    }

    // Sort objects by position
    const sortedObjects = [...objects].sort((a: any, b: any) => {
      if (direction === 'horizontal') {
        return a.left - b.left;
      } else {
        return a.top - b.top;
      }
    });

    const first = sortedObjects[0];
    const last = sortedObjects[sortedObjects.length - 1];

    if (direction === 'horizontal') {
      const totalWidth = last.left + (last.width * last.scaleX) - first.left;
      const totalObjectsWidth = sortedObjects.reduce((sum: number, obj: any) => 
        sum + (obj.width * obj.scaleX), 0);
      const spacing = (totalWidth - totalObjectsWidth) / (sortedObjects.length - 1);

      let currentLeft = first.left;
      sortedObjects.forEach((obj: any, index: number) => {
        if (index > 0) {
          obj.set({ left: currentLeft });
          obj.setCoords();
        }
        currentLeft += (obj.width * obj.scaleX) + spacing;
      });
    } else {
      const totalHeight = last.top + (last.height * last.scaleY) - first.top;
      const totalObjectsHeight = sortedObjects.reduce((sum: number, obj: any) => 
        sum + (obj.height * obj.scaleY), 0);
      const spacing = (totalHeight - totalObjectsHeight) / (sortedObjects.length - 1);

      let currentTop = first.top;
      sortedObjects.forEach((obj: any, index: number) => {
        if (index > 0) {
          obj.set({ top: currentTop });
          obj.setCoords();
        }
        currentTop += (obj.height * obj.scaleY) + spacing;
      });
    }

    fabricCanvas.renderAll();
    toast.success(`Objetos distribuídos ${direction === 'horizontal' ? 'horizontalmente' : 'verticalmente'}`);
  };

  const stretchToEdge = (direction: 'left' | 'right' | 'top' | 'bottom') => {
    if (!activeObject || !fabricCanvas) return;
    
    const canvasWidth = fabricCanvas.width || 800;
    const canvasHeight = fabricCanvas.height || 600;
    
    const currentLeft = activeObject.left || 0;
    const currentTop = activeObject.top || 0;
    const currentWidth = (activeObject.width || 100) * (activeObject.scaleX || 1);
    const currentHeight = (activeObject.height || 100) * (activeObject.scaleY || 1);
    const currentRight = currentLeft + currentWidth;
    const currentBottom = currentTop + currentHeight;
    
    switch (direction) {
      case 'left':
        // Estica para a esquerda, mantendo a borda direita fixa
        const newWidthLeft = currentRight;
        activeObject.set({
          left: 0,
          scaleX: newWidthLeft / (activeObject.width || 100)
        });
        break;
      case 'right':
        // Estica para a direita, mantendo a borda esquerda fixa
        const newWidthRight = canvasWidth - currentLeft;
        activeObject.set({
          scaleX: newWidthRight / (activeObject.width || 100)
        });
        break;
      case 'top':
        // Estica para cima, mantendo a borda inferior fixa
        const newHeightTop = currentBottom;
        activeObject.set({
          top: 0,
          scaleY: newHeightTop / (activeObject.height || 100)
        });
        break;
      case 'bottom':
        // Estica para baixo, mantendo a borda superior fixa
        const newHeightBottom = canvasHeight - currentTop;
        activeObject.set({
          scaleY: newHeightBottom / (activeObject.height || 100)
        });
        break;
    }
    
    activeObject.setCoords();
    fabricCanvas.renderAll();
    toast.success(`Objeto esticado até a borda ${direction === 'left' ? 'esquerda' : direction === 'right' ? 'direita' : direction === 'top' ? 'superior' : 'inferior'}`);
  };

  const renderMultipleSelectionControls = () => (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" className="h-8 px-3">
            <AlignHorizontalJustifyCenter className="h-4 w-4 mr-2" />
            Alinhamento
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" side="top">
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-2 block">Alinhamento Horizontal</Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => alignObjects('left')} className="flex-1" title="Alinhar à esquerda">
                  <AlignStartHorizontal className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => alignObjects('center')} className="flex-1" title="Alinhar ao centro">
                  <AlignHorizontalJustifyCenter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => alignObjects('right')} className="flex-1" title="Alinhar à direita">
                  <AlignEndHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Alinhamento Vertical</Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => alignObjects('top')} className="flex-1" title="Alinhar ao topo">
                  <AlignStartVertical className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => alignObjects('middle')} className="flex-1" title="Alinhar ao meio">
                  <AlignVerticalJustifyCenter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => alignObjects('bottom')} className="flex-1" title="Alinhar à base">
                  <AlignEndVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="border-t pt-3">
              <Label className="text-xs mb-2 block">Distribuir Objetos</Label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => distributeObjects('horizontal')} 
                  className="flex-1"
                  title="Distribuir horizontalmente"
                >
                  <SeparatorHorizontal className="h-4 w-4 mr-2" />
                  Horizontal
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => distributeObjects('vertical')} 
                  className="flex-1"
                  title="Distribuir verticalmente"
                >
                  <SeparatorVertical className="h-4 w-4 mr-2" />
                  Vertical
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <div className="h-6 w-px bg-border mx-1" />
    </>
  );

  const renderImageControls = () => (
    <>
      <Button variant="ghost" size="sm" onClick={handleFlipH} className="h-8 w-8 p-0">
        <FlipHorizontal className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleFlipV} className="h-8 w-8 p-0">
        <FlipVertical className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleRotateLeft} className="h-8 w-8 p-0">
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleRotateRight} className="h-8 w-8 p-0">
        <RotateCw className="h-4 w-4" />
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      
      {/* Adjustments */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Sun className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="top">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Brilho</Label>
              <Slider value={[brightness]} onValueChange={handleBrightnessChange} min={-100} max={100} step={1} />
              <span className="text-xs text-muted-foreground">{brightness}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contraste</Label>
              <Slider value={[contrast]} onValueChange={handleContrastChange} min={-100} max={100} step={1} />
              <span className="text-xs text-muted-foreground">{contrast}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Saturação</Label>
              <Slider value={[saturation]} onValueChange={handleSaturationChange} min={-100} max={100} step={1} />
              <span className="text-xs text-muted-foreground">{saturation}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Filters */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Wand2 className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" side="top">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={() => applyPresetFilter('grayscale')} className="w-full justify-start text-xs">
              Preto e Branco
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyPresetFilter('sepia')} className="w-full justify-start text-xs">
              Sépia
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyPresetFilter('invert')} className="w-full justify-start text-xs">
              Inverter
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Shadow */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Droplet className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="top">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Desfoque</Label>
              <Slider value={[shadowBlur]} onValueChange={handleShadowBlurChange} min={0} max={50} step={1} />
              <span className="text-xs text-muted-foreground">{shadowBlur}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deslocamento X</Label>
              <Slider value={[shadowOffsetX]} onValueChange={handleShadowOffsetXChange} min={-50} max={50} step={1} />
              <span className="text-xs text-muted-foreground">{shadowOffsetX}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deslocamento Y</Label>
              <Slider value={[shadowOffsetY]} onValueChange={handleShadowOffsetYChange} min={-50} max={50} step={1} />
              <span className="text-xs text-muted-foreground">{shadowOffsetY}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Advanced */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ImageIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="top">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={fillCanvas} className="w-full justify-start text-xs">
              Preencher Canvas
            </Button>
            
            {/* Pattern inside menu */}
            <div className="pt-2 border-t">
              <Label className="text-xs px-2 py-1 block">Criar Padrão de Repetição</Label>
              <div className="p-2 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Repetições Horizontais</Label>
                  <Slider
                    value={[patternRepeatX]}
                    onValueChange={(value) => setPatternRepeatX(value[0])}
                    min={1}
                    max={5}
                    step={1}
                  />
                  <span className="text-xs text-muted-foreground">{patternRepeatX}x</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Repetições Verticais</Label>
                  <Slider
                    value={[patternRepeatY]}
                    onValueChange={(value) => setPatternRepeatY(value[0])}
                    min={1}
                    max={5}
                    step={1}
                  />
                  <span className="text-xs text-muted-foreground">{patternRepeatY}x</span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={applyPatternToImage}
                  className="w-full text-xs"
                >
                  Aplicar Padrão
                </Button>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={mirrorImage} className="w-full justify-start text-xs">
              Espelhar Imagem à Direita
            </Button>
            
            <Button variant="ghost" size="sm" onClick={mirrorImageLeft} className="w-full justify-start text-xs">
              Espelhar Imagem à Esquerda
            </Button>
            
            {/* Cut Line Mirror inside menu */}
            <div className="pt-2 border-t">
              <Label className="text-xs px-2 py-1 block">Espelhar com Linha de Corte</Label>
              <div className="p-2 space-y-3">
                <div className="space-y-2">
                  <Slider
                    value={[cutLinePosition]}
                    onValueChange={(value) => setCutLinePosition(value[0])}
                    min={10}
                    max={90}
                    step={1}
                  />
                  <span className="text-xs text-muted-foreground">{cutLinePosition}%</span>
                </div>
                
                {/* Preview */}
                {activeObject?.type === 'image' && (
                  <div className="bg-muted/30 rounded p-2 border border-border">
                    <div className="text-xs text-muted-foreground mb-2">Preview:</div>
                    <div className="flex gap-0 items-center justify-center h-20 bg-background/50 rounded border border-border overflow-hidden">
                      {/* Parte até a linha de corte */}
                      <div 
                        className="h-full relative overflow-hidden flex-shrink-0"
                        style={{ width: '50%' }}
                      >
                        <div 
                          className="h-full"
                          style={{ 
                            width: `${100 / (cutLinePosition / 100)}%`,
                            overflow: 'hidden'
                          }}
                        >
                          <img 
                            src={(activeObject as any).getSrc?.() || (activeObject as any).getElement()?.src} 
                            alt="Parte cortada"
                            className="h-full w-full object-cover object-left"
                          />
                        </div>
                      </div>
                      
                      {/* Linha de corte */}
                      <div className="w-0.5 h-full bg-primary z-10 flex-shrink-0" />
                      
                      {/* Parte espelhada */}
                      <div 
                        className="h-full relative overflow-hidden flex-shrink-0"
                        style={{ width: '50%' }}
                      >
                        <div 
                          className="h-full"
                          style={{ 
                            width: `${100 / (cutLinePosition / 100)}%`,
                            overflow: 'hidden',
                            transform: 'scaleX(-1)'
                          }}
                        >
                          <img 
                            src={(activeObject as any).getSrc?.() || (activeObject as any).getElement()?.src} 
                            alt="Parte espelhada"
                            className="h-full w-full object-cover object-left"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-center text-muted-foreground mt-1">
                      Corte em {cutLinePosition}% - Resultado: 2x a parte cortada
                    </div>
                  </div>
                )}
                
                <Button onClick={applyCutLineMirror} size="sm" className="w-full text-xs">
                  Aplicar Espelhamento
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <div className="h-6 w-px bg-border mx-1" />
    </>
  );

  const renderTextControls = () => (
    <>
      <Button 
        variant={activeObject?.fontWeight === 'bold' ? 'secondary' : 'ghost'} 
        size="sm" 
        onClick={handleBold} 
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button 
        variant={activeObject?.fontStyle === 'italic' ? 'secondary' : 'ghost'} 
        size="sm" 
        onClick={handleItalic} 
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button 
        variant={activeObject?.underline ? 'secondary' : 'ghost'} 
        size="sm" 
        onClick={handleUnderline} 
        className="h-8 w-8 p-0"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      <Button variant="ghost" size="sm" onClick={() => handleAlign('left')} className="h-8 w-8 p-0">
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleAlign('center')} className="h-8 w-8 p-0">
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleAlign('right')} className="h-8 w-8 p-0">
        <AlignRight className="h-4 w-4" />
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      
      {/* Font Selector */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Type className="h-4 w-4 mr-1" />
            {fontFamily}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" side="top">
          <div className="space-y-2">
            <Input
              placeholder="Pesquisar fonte..."
              value={fontQuery}
              onChange={(e) => setFontQuery(e.target.value)}
              className="h-8 text-xs"
            />
            <ScrollArea className="h-56">
              <div className="space-y-1">
                {allFonts
                  .filter((f) => f.toLowerCase().includes(fontQuery.toLowerCase()))
                  .map((f) => (
                    <Button
                      key={f}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      style={{ fontFamily: f }}
                      onClick={() => handleFontChange(f)}
                    >
                      {f}
                    </Button>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {/* Shadow for text */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Sombra">
            <Droplet className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="top">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Desfoque</Label>
              <Slider value={[shadowBlur]} onValueChange={handleShadowBlurChange} min={0} max={50} step={1} />
              <span className="text-xs text-muted-foreground">{shadowBlur}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deslocamento X</Label>
              <Slider value={[shadowOffsetX]} onValueChange={handleShadowOffsetXChange} min={-50} max={50} step={1} />
              <span className="text-xs text-muted-foreground">{shadowOffsetX}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deslocamento Y</Label>
              <Slider value={[shadowOffsetY]} onValueChange={handleShadowOffsetYChange} min={-50} max={50} step={1} />
              <span className="text-xs text-muted-foreground">{shadowOffsetY}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );

  const renderColorControl = () => (
    <>
      {/* Fill Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Cor de Preenchimento">
            <Palette className="h-4 w-4" style={{ color: fillColor }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="top">
          <div className="space-y-3">
            <Label className="text-xs">Preenchimento</Label>
            <Input
              type="color"
              value={fillColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-8 w-full"
            />
            <div className="grid grid-cols-6 gap-1">
              {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded border border-border"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                />
              ))}
            </div>
            
            <div className="pt-2 border-t space-y-2">
              <Label className="text-xs">Degradê</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => applyGradient('horizontal')} className="flex-1 text-xs">
                  Horizontal
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyGradient('vertical')} className="flex-1 text-xs">
                  Vertical
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Stroke Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Cor da Borda">
            <SquareIcon className="h-4 w-4" style={{ color: strokeColor }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="top">
          <div className="space-y-3">
            <Label className="text-xs">Borda</Label>
            <Input
              type="color"
              value={strokeColor}
              onChange={(e) => handleStrokeColorChange(e.target.value)}
              className="h-8 w-full"
            />
            <div className="grid grid-cols-6 gap-1">
              {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded border border-border"
                  style={{ backgroundColor: color }}
                  onClick={() => handleStrokeColorChange(color)}
                />
              ))}
            </div>
            
            <div className="space-y-1 pt-2 border-t">
              <Label className="text-xs">Espessura</Label>
              <Slider
                value={[strokeWidth]}
                onValueChange={handleStrokeWidthChange}
                min={0}
                max={20}
                step={1}
              />
              <span className="text-xs text-muted-foreground">{strokeWidth}px</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );

  const isTextObject = selectedObjectType === 'textbox' || selectedObjectType === 'text' || selectedObjectType === 'i-text';
  const isImageObject = selectedObjectType === 'image';

  // Debug log
  console.log('FloatingToolbar render - isMultipleSelection:', isMultipleSelection, 'selectedObjectType:', selectedObjectType);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 lg:bottom-6 z-40 
                    mb-14 lg:mb-0 max-w-[95vw] lg:max-w-none">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 bg-background/95 backdrop-blur-md 
                        border border-border rounded-full px-3 py-2 shadow-lg min-w-max">
          {/* Menu de Alinhamento - aparece quando múltiplos objetos estão selecionados */}
          {isMultipleSelection && (
            <>
              {renderMultipleSelectionControls()}
            </>
          )}
          
          {/* Controles específicos quando apenas 1 objeto está selecionado */}
          {!isMultipleSelection && isImageObject && renderImageControls()}
          {!isMultipleSelection && isTextObject && renderTextControls()}
          {!isMultipleSelection && renderColorControl()}
          
          {/* Botões de esticar para bordas */}
          {!isMultipleSelection && (
            <>
              <div className="h-6 w-px bg-border mx-1" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-3" title="Esticar até borda">
                    <Maximize className="h-4 w-4 mr-1" />
                    <span className="text-xs hidden sm:inline">Esticar</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" side="top">
                  <div className="grid grid-cols-2 gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => stretchToEdge('left')} 
                      className="flex items-center gap-2 justify-start"
                      title="Esticar até borda esquerda"
                    >
                      <ArrowLeftToLine className="h-4 w-4" />
                      <span className="text-xs">Esquerda</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => stretchToEdge('right')} 
                      className="flex items-center gap-2 justify-start"
                      title="Esticar até borda direita"
                    >
                      <ArrowRightToLine className="h-4 w-4" />
                      <span className="text-xs">Direita</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => stretchToEdge('top')} 
                      className="flex items-center gap-2 justify-start"
                      title="Esticar até borda superior"
                    >
                      <ArrowUpToLine className="h-4 w-4" />
                      <span className="text-xs">Cima</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => stretchToEdge('bottom')} 
                      className="flex items-center gap-2 justify-start"
                      title="Esticar até borda inferior"
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      <span className="text-xs">Baixo</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
          
          <div className="h-6 w-px bg-border mx-1" />
          
          <div className="flex items-center gap-2 min-w-[120px]">
            <span className="text-xs text-muted-foreground hidden sm:inline">Opacidade</span>
            <Slider
              value={[opacity]}
              onValueChange={handleOpacityChange}
              min={0}
              max={100}
              step={1}
              className="w-16 sm:w-20"
            />
            <span className="text-xs text-muted-foreground w-8">{opacity}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
