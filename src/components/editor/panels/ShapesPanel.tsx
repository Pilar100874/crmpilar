import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCanvas } from "@/contexts/CanvasContext";
import { Rect, Circle, Triangle, Line, Polygon, Path } from "fabric";
import { toast } from "sonner";

const ShapesPanel = () => {
  const { fabricCanvas } = useCanvas();

  const addBasicShape = (type: string) => {
    if (!fabricCanvas) return;

    const commonProps = {
      left: 100,
      top: 100,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
    };

    let shape;
    switch (type) {
      case 'rectangle':
        shape = new Rect({ ...commonProps, width: 150, height: 100 });
        break;
      case 'square':
        shape = new Rect({ ...commonProps, width: 120, height: 120 });
        break;
      case 'circle':
        shape = new Circle({ ...commonProps, radius: 60 });
        break;
      case 'triangle':
        shape = new Triangle({ ...commonProps, width: 120, height: 120 });
        break;
      case 'line':
        shape = new Line([50, 50, 200, 50], {
          stroke: '#3b82f6',
          strokeWidth: 4,
          left: 100,
          top: 100,
        });
        break;
      case 'star':
        const starPoints = [];
        const outerRadius = 50;
        const innerRadius = 25;
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (Math.PI / 5) * i;
          starPoints.push({
            x: radius * Math.sin(angle),
            y: -radius * Math.cos(angle),
          });
        }
        shape = new Polygon(starPoints, { ...commonProps });
        break;
      case 'hexagon':
        const hexPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          hexPoints.push({
            x: 50 * Math.cos(angle),
            y: 50 * Math.sin(angle),
          });
        }
        shape = new Polygon(hexPoints, { ...commonProps });
        break;
      case 'pentagon':
        const pentPoints = [];
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
          pentPoints.push({
            x: 50 * Math.cos(angle),
            y: 50 * Math.sin(angle),
          });
        }
        shape = new Polygon(pentPoints, { ...commonProps });
        break;
      case 'octagon':
        const octPoints = [];
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI / 4) * i;
          octPoints.push({
            x: 50 * Math.cos(angle),
            y: 50 * Math.sin(angle),
          });
        }
        shape = new Polygon(octPoints, { ...commonProps });
        break;
      case 'arrow':
        const arrowPoints = [
          { x: 0, y: -30 },
          { x: 40, y: -30 },
          { x: 40, y: -50 },
          { x: 80, y: 0 },
          { x: 40, y: 50 },
          { x: 40, y: 30 },
          { x: 0, y: 30 },
        ];
        shape = new Polygon(arrowPoints, { ...commonProps });
        break;
      case 'diamond':
        const diamondPoints = [
          { x: 0, y: -60 },
          { x: 40, y: 0 },
          { x: 0, y: 60 },
          { x: -40, y: 0 },
        ];
        shape = new Polygon(diamondPoints, { ...commonProps });
        break;
    }

    if (shape) {
      fabricCanvas.add(shape);
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      toast.success("Forma adicionada!");
    }
  };

  const shapes = [
    // Formas Básicas
    { name: 'Retângulo', path: 'M4,4 H20 V16 H4 Z', color: '#3b82f6', type: 'rectangle' },
    { name: 'Quadrado', path: 'M4,4 H20 V20 H4 Z', color: '#8b5cf6', type: 'square' },
    { name: 'Círculo', path: 'M12,2 A10,10 0 1,1 12,22 A10,10 0 1,1 12,2', color: '#ec4899', type: 'circle' },
    { name: 'Triângulo', path: 'M12,2 L22,20 L2,20 Z', color: '#f59e0b', type: 'triangle' },
    { name: 'Linha', path: 'M2,12 L22,12', color: '#64748b', type: 'line' },
    { name: 'Estrela', path: 'M12,2 L15,8 L22,9 L17,14 L18,21 L12,18 L6,21 L7,14 L2,9 L9,8 Z', color: '#fbbf24', type: 'star' },
    
    // Polígonos
    { name: 'Hexágono', path: 'M12,2 L22,7 L22,17 L12,22 L2,17 L2,7 Z', color: '#8b5cf6', type: 'hexagon' },
    { name: 'Pentágono', path: 'M12,2 L22,9 L18,20 L6,20 L2,9 Z', color: '#ec4899', type: 'pentagon' },
    { name: 'Octógono', path: 'M8,2 L16,2 L22,8 L22,16 L16,22 L8,22 L2,16 L2,8 Z', color: '#f59e0b', type: 'octagon' },
    { name: 'Diamante', path: 'M12,2 L22,12 L12,22 L2,12 Z', color: '#06b6d4', type: 'diamond' },
    { name: 'Losango', path: 'M12,4 L20,12 L12,20 L4,12 Z', color: '#22c55e', type: 'basic' },
    { name: 'Seta', path: 'M2,12 L14,12 L14,8 L22,12 L14,16 L14,12', color: '#ef4444', type: 'arrow' },
    
    // Formas Decorativas
    { name: 'Coração', path: 'M12,21.35 L10.55,20.03 C5.4,15.36 2,12.27 2,8.5 C2,5.41 4.42,3 7.5,3 C9.24,3 10.91,3.81 12,5.08 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.41 22,8.5 C22,12.27 18.6,15.36 13.45,20.03 L12,21.35 Z', color: '#ef4444', type: 'basic' },
    { name: 'Estrela 6P', path: 'M12,2 L14,8 L20,8 L15,12 L17,18 L12,14 L7,18 L9,12 L4,8 L10,8 Z', color: '#f59e0b', type: 'basic' },
    { name: 'Balão', path: 'M12,2 A7,7 0 0,0 5,9 C5,11.38 6.19,13.47 8,14.74 V17 A1,1 0 0,0 9,18 H15 A1,1 0 0,0 16,17 V14.74 C17.81,13.47 19,11.38 19,9 A7,7 0 0,0 12,2 M9,21 A1,1 0 0,0 10,22 H14 A1,1 0 0,0 15,21 V20 H9 V21 Z', color: '#ec4899', type: 'basic' },
    { name: 'Coroa', path: 'M5,16 L3,5 L8.5,10 L12,4 L15.5,10 L21,5 L19,16 H5 M19,19 A1,1 0 0,1 18,20 H6 A1,1 0 0,1 5,19 V18 H19 V19 Z', color: '#f59e0b', type: 'basic' },
    
    // Natureza
    { name: 'Folha', path: 'M17,8 C8,10 5.9,16.17 3.82,21.34 L5.71,22 L6.66,19.7 C7.14,19.87 7.64,20 8,20 C19,20 22,3 22,3 C21,5 14,5.25 9,6.25 C4,7.25 2,11.5 2,13.5 C2,15.5 3.75,17.25 3.75,17.25 C7,8 17,8 17,8 Z', color: '#22c55e', type: 'basic' },
    { name: 'Flor', path: 'M12,2 C12,2 17,4 17,9 C17,11 15,13 12,13 C9,13 7,11 7,9 C7,4 12,2 12,2 M12,13 C12,13 17,15 17,20 C17,22 15,24 12,24 C9,24 7,22 7,20 C7,15 12,13 12,13 M2,12 C2,12 4,7 9,7 C11,7 13,9 13,12 C13,15 11,17 9,17 C4,17 2,12 2,12 M22,12 C22,12 20,7 15,7 C13,7 11,9 11,12 C11,15 13,17 15,17 C20,17 22,12 22,12', color: '#ec4899', type: 'basic' },
    { name: 'Sol', path: 'M12,7 A5,5 0 0,1 17,12 A5,5 0 0,1 12,17 A5,5 0 0,1 7,12 A5,5 0 0,1 12,7 M12,2 L14.39,5.42 C13.65,5.15 12.84,5 12,5 C11.16,5 10.35,5.15 9.61,5.42 L12,2 M3.34,7 L7.5,6.65 C6.9,7.16 6.36,7.78 5.94,8.5 C5.5,9.24 5.25,10 5.11,10.79 L3.34,7 M3.36,17 L5.12,13.23 C5.26,14 5.53,14.78 5.95,15.5 C6.37,16.24 6.91,16.86 7.5,17.37 L3.36,17 M20.65,7 L18.88,10.79 C18.74,10 18.47,9.23 18.05,8.5 C17.63,7.78 17.1,7.15 16.5,6.64 L20.65,7 M20.64,17 L16.5,17.36 C17.09,16.85 17.62,16.22 18.04,15.5 C18.46,14.77 18.73,14 18.87,13.21 L20.64,17 M12,22 L9.59,18.56 C10.33,18.83 11.14,19 12,19 C12.82,19 13.63,18.83 14.37,18.56 L12,22 Z', color: '#f59e0b', type: 'basic' },
    { name: 'Nuvem', path: 'M19.35,10.03 C18.67,6.59 15.64,4 12,4 C9.11,4 6.6,5.64 5.35,8.03 C2.34,8.36 0,10.9 0,14 A6,6 0 0,0 6,20 H19 A5,5 0 0,0 24,15 C24,12.36 21.95,10.22 19.35,10.03 Z', color: '#94a3b8', type: 'basic' },
    
    // Líquidos & Ondas
    { name: 'Gota', path: 'M12,2 C12,2 7,8 7,13 A5,5 0 0,0 12,18 A5,5 0 0,0 17,13 C17,8 12,2 12,2 Z', color: '#0284c7', type: 'basic' },
    { name: 'Onda', path: 'M0,12 Q6,8 12,12 T24,12 L24,24 L0,24 Z', color: '#0ea5e9', type: 'basic' },
    { name: 'Respingo', path: 'M12,2 L13,6 L17,5 L14,9 L18,11 L13,12 L15,16 L12,13 L9,16 L11,12 L6,11 L10,9 L7,5 L11,6 Z', color: '#06b6d4', type: 'basic' },
    
    // Setas Diversas
    { name: 'Seta Cima', path: 'M12,2 L22,12 L17,12 L17,22 L7,22 L7,12 L2,12 Z', color: '#3b82f6', type: 'basic' },
    { name: 'Seta Baixo', path: 'M12,22 L22,12 L17,12 L17,2 L7,2 L7,12 L2,12 Z', color: '#8b5cf6', type: 'basic' },
    { name: 'Seta Dupla', path: 'M2,12 L7,7 L7,10 L17,10 L17,7 L22,12 L17,17 L17,14 L7,14 L7,17 Z', color: '#ec4899', type: 'basic' },
    { name: 'Seta Curva', path: 'M6,6 L18,6 L18,14 L22,14 L15,21 L8,14 L12,14 L12,10 L6,10 Z', color: '#f59e0b', type: 'basic' },
    
    // Banners & Ribbons
    { name: 'Banner', path: 'M2,6 L22,6 L22,18 L12,14 L2,18 Z', color: '#ef4444', type: 'basic' },
    { name: 'Ribbon', path: 'M2,4 L22,4 L20,12 L22,20 L2,20 L4,12 Z', color: '#a855f7', type: 'basic' },
    { name: 'Tag', path: 'M2,6 L16,6 L22,12 L16,18 L2,18 Z', color: '#22c55e', type: 'basic' },
    
    // Símbolos
    { name: 'Plus', path: 'M10,2 H14 V10 H22 V14 H14 V22 H10 V14 H2 V10 H10 Z', color: '#22c55e', type: 'basic' },
    { name: 'X', path: 'M6,6 L10,10 L6,14 L10,18 L14,14 L18,18 L22,14 L18,10 L22,6 L18,2 L14,6 L10,2 Z M8,8 L12,12 L16,8 L18,10 L14,14 L18,18 L16,16 L12,12 L8,16 L6,14 L10,10 L6,6 Z', color: '#ef4444', type: 'basic' },
    { name: 'Check', path: 'M9,20 L2,13 L5,10 L9,14 L19,4 L22,7 Z', color: '#22c55e', type: 'basic' },
    { name: 'Menos', path: 'M2,10 H22 V14 H2 Z', color: '#64748b', type: 'basic' },
  ];

  const addShape = (pathData: string, color: string, name: string, type?: string) => {
    if (!fabricCanvas) return;

    // Se for uma forma básica com type, usar função específica
    if (type && type !== 'basic') {
      addBasicShape(type);
      return;
    }

    // Caso contrário, criar a forma usando Path
    const path = new Path(pathData, {
      fill: color,
      left: 100,
      top: 100,
      scaleX: 3,
      scaleY: 3,
    });

    fabricCanvas.add(path);
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    toast.success(`${name} adicionado!`);
  };

  return (
    <div className="w-full bg-background flex flex-col">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Formas</h3>
        <p className="text-xs text-muted-foreground">Formas e símbolos vetoriais</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-3">
          <div className="grid grid-cols-3 gap-2">
            {shapes.map((shape) => (
              <Button
                key={shape.name}
                variant="outline"
                className="h-16 flex flex-col gap-1 p-1.5"
                onClick={() => addShape(shape.path, shape.color, shape.name, shape.type)}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" className="flex-shrink-0">
                  <path d={shape.path} fill={shape.color} />
                </svg>
                <span className="text-[9px] leading-tight truncate w-full">{shape.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ShapesPanel;
