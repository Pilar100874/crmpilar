import { useEffect, useState } from "react";
import { useCanvas } from "@/contexts/CanvasContext";
import { FabricObject, Gradient } from "fabric";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const ColorPanel = () => {
  const { fabricCanvas } = useCanvas();
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [fillColor, setFillColor] = useState("#000000");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [gradientColor1, setGradientColor1] = useState("#ff6b6b");
  const [gradientColor2, setGradientColor2] = useState("#4ecdc4");

  useEffect(() => {
    if (!fabricCanvas) return;

    const normalizeColor = (value: any) => {
      if (!value) return '#000000';
      if (typeof value !== 'string') return '#000000';
      const color = value.trim();
      if (color.startsWith('#')) return color.length === 4 ? '#' + color.slice(1).split('').map((c) => c + c).join('') : color;
      const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (rgbMatch) {
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${toHex(Number(rgbMatch[1]))}${toHex(Number(rgbMatch[2]))}${toHex(Number(rgbMatch[3]))}`;
      }
      return '#000000';
    };

    const handleSelection = () => {
      const activeObject = fabricCanvas.getActiveObject();
      setSelectedObject(activeObject || null);

      if (activeObject) {
        const objType = (activeObject as any).type;
        if (objType !== 'textbox' && objType !== 'text' && objType !== 'i-text' && objType !== 'image') {
          const fill = activeObject.get('fill');
          setFillColor(normalizeColor(fill));
          const stroke = activeObject.get('stroke');
          setStrokeColor(normalizeColor(stroke));
          const width = activeObject.get('strokeWidth') || 0;
          setStrokeWidth(Number(width));
        }
      }
    };

    const events = ['selection:created', 'selection:updated', 'selection:changed', 'object:modified'] as const;
    events.forEach((eventName) => fabricCanvas.on(eventName as any, handleSelection));
    fabricCanvas.on('selection:cleared', () => setSelectedObject(null));

    handleSelection();

    return () => {
      events.forEach((eventName) => fabricCanvas.off(eventName as any, handleSelection));
      fabricCanvas.off('selection:cleared', () => setSelectedObject(null));
    };
  }, [fabricCanvas]);

  const handleFillChange = (color: string) => {
    setFillColor(color);
    if (fabricCanvas) {
      const current = fabricCanvas.getActiveObject() as any;
      if (current && current.type !== 'image') {
        current.set('fill', color);
        fabricCanvas.renderAll();
      }
    }
  };

  const handleStrokeChange = (color: string) => {
    setStrokeColor(color);
    if (fabricCanvas) {
      const current = fabricCanvas.getActiveObject() as any;
      if (current && current.type !== 'image') {
        current.set('stroke', color);
        fabricCanvas.renderAll();
      }
    }
  };

  const handleStrokeWidthChange = (value: number[]) => {
    setStrokeWidth(value[0]);
    if (fabricCanvas) {
      const current = fabricCanvas.getActiveObject() as any;
      if (current && current.type !== 'image') {
        current.set('strokeWidth', value[0]);
        fabricCanvas.renderAll();
      }
    }
  };

  const handleGradientApply = () => {
    if (fabricCanvas) {
      const current = fabricCanvas.getActiveObject() as any;
      if (current && current.type !== 'image') {
        const gradient = new Gradient({
          type: 'linear',
          coords: { x1: 0, y1: 0, x2: current.width || 100, y2: current.height || 100 },
          colorStops: [
            { offset: 0, color: gradientColor1 },
            { offset: 1, color: gradientColor2 },
          ],
        });
        current.set('fill', gradient);
        fabricCanvas.renderAll();
      }
    }
  };

  const active = fabricCanvas?.getActiveObject() as FabricObject | null;
  const objType = (active as any)?.type;
  const canEditColor = active && objType !== 'textbox' && objType !== 'text' && objType !== 'i-text' && objType !== 'image';

  if (!canEditColor) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Cores
          </CardTitle>
        </CardHeader>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Selecione uma forma para editar cores
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
          <Palette className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          Cores
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1">
        <div className="px-2 sm:px-3 pb-2 sm:pb-3">
          <Tabs defaultValue="colors">
            <TabsList className="grid w-full grid-cols-2 h-7">
              <TabsTrigger value="colors" className="text-[10px]"><Palette className="h-3 w-3 mr-1" />Cores</TabsTrigger>
              <TabsTrigger value="gradient" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Degradê</TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-2 mt-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Preenchimento</Label>
                <div className="flex items-center gap-1.5">
                  <Input type="color" value={fillColor} onChange={(e) => handleFillChange(e.target.value)} className="w-10 h-7 p-0.5" />
                  <Input type="text" value={fillColor} onChange={(e) => handleFillChange(e.target.value)} className="flex-1 h-7 text-[10px] font-mono" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Cor da Borda</Label>
                <div className="flex items-center gap-1.5">
                  <Input type="color" value={strokeColor} onChange={(e) => handleStrokeChange(e.target.value)} className="w-10 h-7 p-0.5" />
                  <Input type="text" value={strokeColor} onChange={(e) => handleStrokeChange(e.target.value)} className="flex-1 h-7 text-[10px] font-mono" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Espessura da Borda: {strokeWidth}px</Label>
                <Slider value={[strokeWidth]} onValueChange={handleStrokeWidthChange} min={0} max={50} step={1} />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Cores Rápidas</Label>
                <div className="grid grid-cols-8 gap-1">
                  {['#000000', '#ffffff', '#ef4444', '#f59e0b', '#eab308', '#10b981', '#3b82f6', '#8b5cf6'].map((color) => (
                    <button
                      key={color}
                      onClick={() => handleFillChange(color)}
                      className="w-full aspect-square rounded border hover:scale-110 transition-all"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gradient" className="space-y-2 mt-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Cor Inicial</Label>
                <Input type="color" value={gradientColor1} onChange={(e) => setGradientColor1(e.target.value)} className="w-full h-7" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Cor Final</Label>
                <Input type="color" value={gradientColor2} onChange={(e) => setGradientColor2(e.target.value)} className="w-full h-7" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Preview</Label>
                <div className="w-full h-16 rounded border" style={{ background: `linear-gradient(135deg, ${gradientColor1}, ${gradientColor2})` }} />
              </div>

              <Button onClick={handleGradientApply} size="sm" className="w-full h-7 text-xs"><Sparkles className="h-3 w-3 mr-1" />Aplicar Degradê</Button>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </Card>
  );
};

export default ColorPanel;
