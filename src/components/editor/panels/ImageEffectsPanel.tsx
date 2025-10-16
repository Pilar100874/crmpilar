import { useEffect, useState } from "react";
import { useCanvas } from "@/contexts/CanvasContext";
import { FabricObject, FabricImage, filters, Rect, Line } from "fabric";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Wand2, FlipHorizontal, FlipVertical, RotateCw, RotateCcw, Maximize2, Copy, Scissors, Grid3x3, SplitSquareVertical, X } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ImageEffectsPanel = () => {
  const { fabricCanvas } = useCanvas();
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [blur, setBlur] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [hue, setHue] = useState(0);
  const [noise, setNoise] = useState(0);
  const [pixelate, setPixelate] = useState(0);
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowOffsetX, setShadowOffsetX] = useState(0);
  const [shadowOffsetY, setShadowOffsetY] = useState(0);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [showMirrorDialog, setShowMirrorDialog] = useState(false);
  const [cutLinePosition, setCutLinePosition] = useState(0.5);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mirrorPreview, setMirrorPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePreview || !showMirrorDialog) {
      setMirrorPreview(null);
      return;
    }

    // Cria preview do espelhamento
    const img = new Image();
    img.src = imagePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * 2;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const cutX = img.width * cutLinePosition;
        
        // Desenha parte esquerda (original)
        ctx.drawImage(
          img,
          0, 0, cutX, img.height,
          0, 0, cutX, img.height
        );
        
        // Desenha parte direita espelhada
        ctx.save();
        ctx.translate(cutX * 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(
          img,
          0, 0, cutX, img.height,
          0, 0, cutX, img.height
        );
        ctx.restore();
        
        setMirrorPreview(canvas.toDataURL());
      }
    };
  }, [imagePreview, cutLinePosition, showMirrorDialog]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleSelection = () => {
      const activeObject = fabricCanvas.getActiveObject();
      setSelectedObject(activeObject || null);

      if (activeObject && (activeObject as any).type === 'image') {
        setOpacity(activeObject.get('opacity') || 1);
        setShadowBlur(activeObject.get('shadow')?.blur || 0);
        setShadowOffsetX(activeObject.get('shadow')?.offsetX || 0);
        setShadowOffsetY(activeObject.get('shadow')?.offsetY || 0);
        setShadowColor(activeObject.get('shadow')?.color || '#000000');
        setBrightness(0);
        setContrast(0);
        setSaturation(0);
        setBlur(0);
        setHue(0);
        setNoise(0);
        setPixelate(0);
      }
    };

    const events = ['selection:created', 'selection:updated', 'selection:changed'] as const;
    events.forEach((eventName) => fabricCanvas.on(eventName as any, handleSelection));
    fabricCanvas.on('selection:cleared', () => setSelectedObject(null));

    handleSelection();

    return () => {
      events.forEach((eventName) => fabricCanvas.off(eventName as any, handleSelection));
      fabricCanvas.off('selection:cleared', () => setSelectedObject(null));
    };
  }, [fabricCanvas]);

  const applyFilters = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (!current || (current as any).type !== 'image') return;

    const img = current as FabricImage;
    img.filters = [];

    if (brightness !== 0) {
      img.filters.push(new filters.Brightness({ brightness: brightness / 100 }));
    }
    if (contrast !== 0) {
      img.filters.push(new filters.Contrast({ contrast: contrast / 100 }));
    }
    if (saturation !== 0) {
      img.filters.push(new filters.Saturation({ saturation: saturation / 100 }));
    }
    if (blur > 0) {
      img.filters.push(new filters.Blur({ blur: blur / 100 }));
    }
    if (hue !== 0) {
      img.filters.push(new filters.HueRotation({ rotation: hue / 100 }));
    }
    if (noise > 0) {
      img.filters.push(new filters.Noise({ noise: noise }));
    }
    if (pixelate > 0) {
      img.filters.push(new filters.Pixelate({ blocksize: pixelate }));
    }

    img.applyFilters();
    fabricCanvas.renderAll();
  };

  const handleBrightnessChange = (value: number[]) => {
    setBrightness(value[0]);
    applyFilters();
  };

  const handleContrastChange = (value: number[]) => {
    setContrast(value[0]);
    applyFilters();
  };

  const handleSaturationChange = (value: number[]) => {
    setSaturation(value[0]);
    applyFilters();
  };

  const handleBlurChange = (value: number[]) => {
    setBlur(value[0]);
    applyFilters();
  };

  const handleOpacityChange = (value: number[]) => {
    setOpacity(value[0]);
    if (fabricCanvas) {
      const current = fabricCanvas.getActiveObject();
      if (current) {
        current.set('opacity', value[0]);
        fabricCanvas.renderAll();
      }
    }
  };

  const handleHueChange = (value: number[]) => {
    setHue(value[0]);
    applyFilters();
  };

  const handleNoiseChange = (value: number[]) => {
    setNoise(value[0]);
    applyFilters();
  };

  const handlePixelateChange = (value: number[]) => {
    setPixelate(value[0]);
    applyFilters();
  };

  const handleFlipHorizontal = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (current) {
      current.set('flipX', !current.flipX);
      fabricCanvas.renderAll();
    }
  };

  const handleFlipVertical = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (current) {
      current.set('flipY', !current.flipY);
      fabricCanvas.renderAll();
    }
  };

  const handleRotateLeft = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (current) {
      current.rotate((current.angle || 0) - 90);
      fabricCanvas.renderAll();
    }
  };

  const handleRotateRight = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (current) {
      current.rotate((current.angle || 0) + 90);
      fabricCanvas.renderAll();
    }
  };

  const applyGrayscale = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (!current || (current as any).type !== 'image') return;
    const img = current as FabricImage;
    img.filters = img.filters || [];
    img.filters.push(new filters.Grayscale());
    img.applyFilters();
    fabricCanvas.renderAll();
  };

  const applySepia = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (!current || (current as any).type !== 'image') return;
    const img = current as FabricImage;
    img.filters = img.filters || [];
    img.filters.push(new filters.Sepia());
    img.applyFilters();
    fabricCanvas.renderAll();
  };

  const applyInvert = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (!current || (current as any).type !== 'image') return;
    const img = current as FabricImage;
    img.filters = img.filters || [];
    img.filters.push(new filters.Invert());
    img.applyFilters();
    fabricCanvas.renderAll();
  };

  const removeAllFilters = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (!current || (current as any).type !== 'image') return;
    const img = current as FabricImage;
    img.filters = [];
    img.applyFilters();
    fabricCanvas.renderAll();
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setBlur(0);
    setHue(0);
    setNoise(0);
    setPixelate(0);
  };

  const handleShadowBlurChange = (value: number[]) => {
    setShadowBlur(value[0]);
    updateShadow();
  };

  const handleShadowOffsetXChange = (value: number[]) => {
    setShadowOffsetX(value[0]);
    updateShadow();
  };

  const handleShadowOffsetYChange = (value: number[]) => {
    setShadowOffsetY(value[0]);
    updateShadow();
  };

  const handleShadowColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShadowColor(e.target.value);
    updateShadow();
  };

  const updateShadow = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (current) {
      current.set('shadow', {
        color: shadowColor,
        blur: shadowBlur,
        offsetX: shadowOffsetX,
        offsetY: shadowOffsetY,
      });
      fabricCanvas.renderAll();
    }
  };

  const fillCanvas = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (!current || (current as any).type !== 'image') return;

    const canvasWidth = fabricCanvas.width || 800;
    const canvasHeight = fabricCanvas.height || 600;

    const scaleX = canvasWidth / (current.width || 1);
    const scaleY = canvasHeight / (current.height || 1);
    const scale = Math.max(scaleX, scaleY);

    current.set({
      scaleX: scale,
      scaleY: scale,
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: 'center',
      originY: 'center',
    });

    fabricCanvas.renderAll();
    toast.success("Imagem ajustada para preencher o canvas");
  };

  const mirrorImage = async () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (!current || (current as any).type !== 'image') return;

    const img = current as FabricImage;
    
    // Cria uma cópia espelhada horizontalmente
    const cloned = await img.clone();
    cloned.set({
      left: (img.left || 0) + (img.getScaledWidth() || 0),
      flipX: !img.flipX,
    });
    fabricCanvas.add(cloned);
    fabricCanvas.renderAll();
    toast.success("Espelhamento criado");
  };

  const toggleCutLineMode = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (!current || (current as any).type !== 'image') {
      toast.error("Selecione uma imagem primeiro");
      return;
    }

    const img = current as FabricImage;
    
    // Converte a imagem para base64 para preview
    const imgElement = (img as any)._element;
    if (imgElement) {
      const canvas = document.createElement('canvas');
      canvas.width = imgElement.width || imgElement.naturalWidth;
      canvas.height = imgElement.height || imgElement.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgElement, 0, 0);
        setImagePreview(canvas.toDataURL());
        setShowMirrorDialog(true);
        setCutLinePosition(0.5);
      }
    }
  };

  const handleCutLinePositionChange = (value: number[]) => {
    setCutLinePosition(value[0]);
  };

  const applyMirrorByCutLine = () => {
    if (!fabricCanvas) return;
    
    const current = fabricCanvas.getActiveObject();
    if (!current || (current as any).type !== 'image') {
      toast.error("Selecione uma imagem");
      return;
    }

    const img = current as FabricImage;
    const imgLeft = img.left || 0;
    const imgTop = img.top || 0;
    const imgWidth = img.getScaledWidth() || 100;
    const imgHeight = img.getScaledHeight() || 100;

    // Calcula a posição de corte
    const cutX = imgWidth * cutLinePosition;

    // Cria duas partes da imagem original
    const leftWidth = cutX;
    const rightWidth = imgWidth - cutX;

    // Cria cópia espelhada da parte direita
    img.clone().then((cloned: FabricImage) => {
      cloned.set({
        left: imgLeft + leftWidth + rightWidth,
        top: imgTop,
        flipX: true,
        scaleX: img.scaleX,
        scaleY: img.scaleY,
      });
      
      fabricCanvas.add(cloned);
      fabricCanvas.renderAll();
      
      setShowMirrorDialog(false);
      setImagePreview(null);
      toast.success("Espelhamento aplicado");
    });
  };

  const addCutLines = () => {
    if (!fabricCanvas) return;
    const canvasWidth = fabricCanvas.width || 800;
    const canvasHeight = fabricCanvas.height || 600;
    const margin = 20; // 20px de margem

    // Remove linhas de corte existentes
    const objects = fabricCanvas.getObjects();
    objects.forEach((obj: any) => {
      if (obj.name === 'cutLine') {
        fabricCanvas.remove(obj);
      }
    });

    // Cria o retângulo de linha de corte
    const cutRect = new Rect({
      left: margin,
      top: margin,
      width: canvasWidth - (margin * 2),
      height: canvasHeight - (margin * 2),
      fill: 'transparent',
      stroke: '#ff0000',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      name: 'cutLine',
    } as any);

    // Adiciona linhas de canto
    const cornerSize = 30;
    const corners = [
      // Canto superior esquerdo
      { x1: margin, y1: margin, x2: margin + cornerSize, y2: margin },
      { x1: margin, y1: margin, x2: margin, y2: margin + cornerSize },
      // Canto superior direito
      { x1: canvasWidth - margin - cornerSize, y1: margin, x2: canvasWidth - margin, y2: margin },
      { x1: canvasWidth - margin, y1: margin, x2: canvasWidth - margin, y2: margin + cornerSize },
      // Canto inferior esquerdo
      { x1: margin, y1: canvasHeight - margin - cornerSize, x2: margin, y2: canvasHeight - margin },
      { x1: margin, y1: canvasHeight - margin, x2: margin + cornerSize, y2: canvasHeight - margin },
      // Canto inferior direito
      { x1: canvasWidth - margin, y1: canvasHeight - margin - cornerSize, x2: canvasWidth - margin, y2: canvasHeight - margin },
      { x1: canvasWidth - margin - cornerSize, y1: canvasHeight - margin, x2: canvasWidth - margin, y2: canvasHeight - margin },
    ];

    fabricCanvas.add(cutRect);

    corners.forEach(corner => {
      const line = new Line([corner.x1, corner.y1, corner.x2, corner.y2], {
        stroke: '#ff0000',
        strokeWidth: 3,
        selectable: false,
        evented: false,
        name: 'cutLine',
      } as any);
      fabricCanvas.add(line);
    });

    fabricCanvas.renderAll();
    toast.success("Linhas de corte adicionadas");
  };

  const removeCutLines = () => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    objects.forEach((obj: any) => {
      if (obj.name === 'cutLine') {
        fabricCanvas.remove(obj);
      }
    });
    fabricCanvas.renderAll();
    toast.success("Linhas de corte removidas");
  };

  const spreadByCutLines = () => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject();
    if (!current || (current as any).type !== 'image') return;

    const canvasWidth = fabricCanvas.width || 800;
    const canvasHeight = fabricCanvas.height || 600;
    const margin = 20;

    // Calcula as dimensões da área de corte
    const cutWidth = canvasWidth - (margin * 2);
    const cutHeight = canvasHeight - (margin * 2);

    // Cria padrão espelhado da imagem
    const img = current as FabricImage;
    const imgWidth = img.getScaledWidth() || 100;
    const imgHeight = img.getScaledHeight() || 100;

    const cols = Math.ceil(cutWidth / imgWidth) + 1;
    const rows = Math.ceil(cutHeight / imgHeight) + 1;

    const startX = margin;
    const startY = margin;

    // Remove seleção atual
    fabricCanvas.discardActiveObject();

    let cloneCount = 0;
    const totalClones = rows * cols;

    // Cria o padrão espelhado
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        img.clone().then((cloned: FabricImage) => {
          // Espelha alternadamente horizontal e vertical
          const flipX = col % 2 !== 0;
          const flipY = row % 2 !== 0;

          cloned.set({
            left: startX + (col * imgWidth),
            top: startY + (row * imgHeight),
            flipX: flipX,
            flipY: flipY,
            selectable: true,
          });
          
          fabricCanvas.add(cloned);
          cloneCount++;
          
          if (cloneCount === totalClones) {
            fabricCanvas.renderAll();
            toast.success("Espelhamento por linha de corte criado");
          }
        });
      }
    }

    // Remove a imagem original
    fabricCanvas.remove(current);
  };

  const active = fabricCanvas?.getActiveObject() as FabricObject | null;
  const isImage = active && (active as any).type === 'image';

  if (!isImage) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Efeitos de Imagem
          </CardTitle>
        </CardHeader>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <Wand2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Selecione uma imagem para aplicar efeitos
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-background/30 backdrop-blur-sm">
      <CardHeader className="pb-2 px-2 sm:px-3 pt-2 sm:pt-3">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
          <Wand2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          Efeitos de Imagem
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1">
        <div className="px-2 sm:px-3 pb-2 sm:pb-3">
          <Accordion type="multiple" className="w-full space-y-0.5 sm:space-y-1">
            
            {/* Transformações */}
            <AccordionItem value="transform" className="border-b border-border/50">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">Transformações</AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button variant="outline" size="sm" onClick={handleFlipHorizontal} className="w-full h-8 text-xs">
                      <FlipHorizontal className="h-3 w-3 mr-1" />
                      Horizontal
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleFlipVertical} className="w-full h-8 text-xs">
                      <FlipVertical className="h-3 w-3 mr-1" />
                      Vertical
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRotateLeft} className="w-full h-8 text-xs">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      90° Esq.
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRotateRight} className="w-full h-8 text-xs">
                      <RotateCw className="h-3 w-3 mr-1" />
                      90° Dir.
                    </Button>
                  </div>

                  <Separator className="my-2" />

                  <div className="space-y-1.5">
                    <Button variant="outline" size="sm" onClick={fillCanvas} className="w-full h-8 text-xs">
                      <Maximize2 className="h-3 w-3 mr-1" />
                      Preencher Canvas
                    </Button>
                    <Button variant="outline" size="sm" onClick={mirrorImage} className="w-full h-8 text-xs">
                      <Copy className="h-3 w-3 mr-1" />
                      Espelhamento Completo
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleCutLineMode} 
                      className="w-full h-8 text-xs"
                    >
                      <SplitSquareVertical className="h-3 w-3 mr-1" />
                      Espelhamento com Marcação
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Ajustes */}
            <AccordionItem value="adjustments" className="border-b border-border/50">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">Ajustes</AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Opacidade: {Math.round(opacity * 100)}%</Label>
                    <Slider value={[opacity]} onValueChange={handleOpacityChange} min={0} max={1} step={0.01} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Brilho: {brightness}</Label>
                    <Slider value={[brightness]} onValueChange={handleBrightnessChange} min={-100} max={100} step={1} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Contraste: {contrast}</Label>
                    <Slider value={[contrast]} onValueChange={handleContrastChange} min={-100} max={100} step={1} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Saturação: {saturation}</Label>
                    <Slider value={[saturation]} onValueChange={handleSaturationChange} min={-100} max={100} step={1} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Matiz: {hue}</Label>
                    <Slider value={[hue]} onValueChange={handleHueChange} min={-100} max={100} step={1} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Efeitos */}
            <AccordionItem value="effects" className="border-b border-border/50">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">Efeitos</AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Desfoque: {blur}</Label>
                    <Slider value={[blur]} onValueChange={handleBlurChange} min={0} max={100} step={1} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Ruído: {noise}</Label>
                    <Slider value={[noise]} onValueChange={handleNoiseChange} min={0} max={100} step={1} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Pixelizar: {pixelate}</Label>
                    <Slider value={[pixelate]} onValueChange={handlePixelateChange} min={0} max={20} step={1} />
                  </div>

                  <Separator className="my-2" />

                  <div className="grid grid-cols-2 gap-1.5">
                    <Button variant="outline" size="sm" onClick={applyGrayscale} className="w-full h-8 text-xs">
                      Escala Cinza
                    </Button>
                    <Button variant="outline" size="sm" onClick={applySepia} className="w-full h-8 text-xs">
                      Sépia
                    </Button>
                    <Button variant="outline" size="sm" onClick={applyInvert} className="w-full h-8 text-xs">
                      Inverter
                    </Button>
                    <Button variant="destructive" size="sm" onClick={removeAllFilters} className="w-full h-8 text-xs">
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Sombra */}
            <AccordionItem value="shadow" className="border-b border-border/50">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">Sombra</AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Desfoque: {shadowBlur}</Label>
                    <Slider value={[shadowBlur]} onValueChange={handleShadowBlurChange} min={0} max={50} step={1} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Deslocamento X: {shadowOffsetX}</Label>
                    <Slider value={[shadowOffsetX]} onValueChange={handleShadowOffsetXChange} min={-50} max={50} step={1} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Deslocamento Y: {shadowOffsetY}</Label>
                    <Slider value={[shadowOffsetY]} onValueChange={handleShadowOffsetYChange} min={-50} max={50} step={1} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Cor da Sombra</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={shadowColor}
                        onChange={handleShadowColorChange}
                        className="w-full h-8 rounded border cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Linha de Corte */}
            <AccordionItem value="cutlines" className="border-b border-border/50">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">Linha de Corte</AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="space-y-1.5">
                  <Button variant="outline" size="sm" onClick={addCutLines} className="w-full h-8 text-xs">
                    <Scissors className="h-3 w-3 mr-1" />
                    Adicionar Linhas de Corte
                  </Button>
                  <Button variant="outline" size="sm" onClick={spreadByCutLines} className="w-full h-8 text-xs">
                    <Grid3x3 className="h-3 w-3 mr-1" />
                    Espalhamento por Linha de Corte
                  </Button>
                  <Button variant="destructive" size="sm" onClick={removeCutLines} className="w-full h-8 text-xs">
                    Remover Linhas de Corte
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Adiciona linhas de corte com margem de 20px para impressão
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>
      </ScrollArea>

      {/* Dialog de Espelhamento com Marcação */}
      <Dialog open={showMirrorDialog} onOpenChange={setShowMirrorDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Definir Linha de Corte para Espelhamento
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* Imagem Original com Linha de Corte */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Imagem Original com Linha de Corte</Label>
              <div className="border rounded-lg overflow-hidden bg-muted/30 relative aspect-video">
                {imagePreview && (
                  <>
                    <img 
                      src={imagePreview} 
                      alt="Original" 
                      className="w-full h-full object-contain"
                    />
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                      style={{ left: `${cutLinePosition * 100}%` }}
                    />
                    <div 
                      className="absolute top-4 text-red-500 text-sm font-medium"
                      style={{ left: `${cutLinePosition * 100}%`, transform: 'translateX(-50%)' }}
                    >
                      Linha de Corte
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Preview do Resultado */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preview do Resultado</Label>
              <div className="border rounded-lg overflow-hidden bg-muted/30 relative aspect-video">
                {mirrorPreview ? (
                  <>
                    <img 
                      src={mirrorPreview} 
                      alt="Preview" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-4 left-4 bg-cyan-500 text-white text-xs px-2 py-1 rounded">
                      Preview do Resultado
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Aguardando...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Slider de Posição */}
          <div className="space-y-3 mt-2">
            <Label className="text-sm font-medium">
              Posição da Linha de Corte: {Math.round(cutLinePosition * 100)}%
            </Label>
            <Slider 
              value={[cutLinePosition]} 
              onValueChange={handleCutLinePositionChange} 
              min={0.1} 
              max={0.9} 
              step={0.01}
              className="[&_[role=slider]]:bg-green-500 [&_[role=slider]]:border-green-600"
            />
            <p className="text-xs text-muted-foreground">
              A imagem será cortada nesta posição e espelhada para criar um padrão contínuo
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowMirrorDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                applyMirrorByCutLine();
                setShowMirrorDialog(false);
              }}
            >
              Aplicar Espelhamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ImageEffectsPanel;
