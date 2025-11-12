import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCanvas } from "@/contexts/CanvasContext";
import { toast } from "@/lib/toast-config";
import { LayoutTemplate, Sparkles, Coffee } from "lucide-react";
import { Textbox, Rect, Circle } from "fabric";

const TemplatesPanel = () => {
  const { fabricCanvas } = useCanvas();

  const loadTemplate1 = () => {
    if (!fabricCanvas) {
      toast.error("Canvas não inicializado");
      return;
    }

    // Limpar canvas
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";

    // Template 1: Design moderno com gradiente
    const background = new Rect({
      left: 0,
      top: 0,
      width: fabricCanvas.width,
      height: fabricCanvas.height,
      fill: "#f0f9ff",
      selectable: false,
    });
    fabricCanvas.add(background);

    // Círculo decorativo superior
    const circle1 = new Circle({
      left: 150,
      top: 50,
      radius: 60,
      fill: "#3b82f6",
      opacity: 0.8,
    });
    fabricCanvas.add(circle1);

    // Círculo decorativo inferior
    const circle2 = new Circle({
      left: 250,
      top: 350,
      radius: 40,
      fill: "#8b5cf6",
      opacity: 0.7,
    });
    fabricCanvas.add(circle2);

    // Texto principal
    const mainText = new Textbox("MEU COPO", {
      left: 100,
      top: 180,
      width: 250,
      fontSize: 42,
      fontWeight: "bold",
      fill: "#1e293b",
      fontFamily: "Arial",
      textAlign: "center",
    });
    fabricCanvas.add(mainText);

    // Texto secundário
    const subText = new Textbox("Design Personalizado", {
      left: 100,
      top: 240,
      width: 250,
      fontSize: 18,
      fill: "#64748b",
      fontFamily: "Arial",
      textAlign: "center",
      fontStyle: "italic",
    });
    fabricCanvas.add(subText);

    fabricCanvas.renderAll();
    toast.success("Template 1 carregado!");
  };

  const loadTemplate2 = () => {
    if (!fabricCanvas) {
      toast.error("Canvas não inicializado");
      return;
    }

    // Limpar canvas
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";

    // Template 2: Design café/minimalista
    const background = new Rect({
      left: 0,
      top: 0,
      width: fabricCanvas.width,
      height: fabricCanvas.height,
      fill: "#fef3c7",
      selectable: false,
    });
    fabricCanvas.add(background);

    // Retângulo decorativo
    const decorRect = new Rect({
      left: 50,
      top: 100,
      width: 350,
      height: 250,
      fill: "#92400e",
      rx: 20,
      ry: 20,
    });
    fabricCanvas.add(decorRect);

    // Círculo interno (ícone de café estilizado)
    const coffeeCircle = new Circle({
      left: 175,
      top: 150,
      radius: 50,
      fill: "#fbbf24",
      stroke: "#78350f",
      strokeWidth: 3,
    });
    fabricCanvas.add(coffeeCircle);

    // Texto principal
    const mainText = new Textbox("CAFÉ", {
      left: 100,
      top: 260,
      width: 250,
      fontSize: 48,
      fontWeight: "bold",
      fill: "#fef3c7",
      fontFamily: "Arial",
      textAlign: "center",
      stroke: "#78350f",
      strokeWidth: 1,
    });
    fabricCanvas.add(mainText);

    // Texto secundário
    const subText = new Textbox("Premium Quality", {
      left: 100,
      top: 320,
      width: 250,
      fontSize: 16,
      fill: "#fef3c7",
      fontFamily: "Arial",
      textAlign: "center",
      letterSpacing: 2,
    });
    fabricCanvas.add(subText);

    fabricCanvas.renderAll();
    toast.success("Template 2 carregado!");
  };

  return (
    <div className="w-full bg-background">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Templates</h3>
        </div>
        <p className="text-xs text-muted-foreground">Designs prontos para usar</p>
      </div>

      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Template 1 */}
          <div className="border border-border rounded-md overflow-hidden hover:border-primary transition-colors">
            <div className="aspect-[16/10] bg-gradient-to-br from-blue-100 to-purple-100 p-2 flex items-center justify-center">
              <div className="text-center">
                <Sparkles className="h-7 w-7 mx-auto mb-1 text-blue-600" />
                <p className="font-bold text-sm text-gray-800">MEU COPO</p>
                <p className="text-[9px] text-gray-600 italic">Design Personalizado</p>
              </div>
            </div>
            <div className="p-2 bg-card">
              <h4 className="font-semibold text-[10px] mb-0.5 truncate">Moderno & Colorido</h4>
              <p className="text-[9px] text-muted-foreground mb-1.5 line-clamp-1">
                Design vibrante decorativo
              </p>
              <Button 
                onClick={loadTemplate1}
                className="w-full h-7 text-[10px]"
                size="sm"
              >
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                Usar
              </Button>
            </div>
          </div>

          {/* Template 2 */}
          <div className="border border-border rounded-md overflow-hidden hover:border-primary transition-colors">
            <div className="aspect-[16/10] bg-gradient-to-br from-amber-100 to-yellow-100 p-2 flex items-center justify-center">
              <div className="text-center">
                <Coffee className="h-7 w-7 mx-auto mb-1 text-amber-800" />
                <p className="font-bold text-sm text-amber-900">CAFÉ</p>
                <p className="text-[9px] text-amber-700">Premium Quality</p>
              </div>
            </div>
            <div className="p-2 bg-card">
              <h4 className="font-semibold text-[10px] mb-0.5 truncate">Café Minimalista</h4>
              <p className="text-[9px] text-muted-foreground mb-1.5 line-clamp-1">
                Estilo elegante cafeteria
              </p>
              <Button 
                onClick={loadTemplate2}
                className="w-full h-7 text-[10px]"
                size="sm"
                variant="secondary"
              >
                <Coffee className="h-2.5 w-2.5 mr-1" />
                Usar
              </Button>
            </div>
          </div>

        </div>
        
        <div className="bg-muted/50 rounded-md p-2 border border-border mt-2">
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            💡 <strong>Dica:</strong> Edite tudo após carregar!
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplatesPanel;
