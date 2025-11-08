import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlignLeft, 
  Frame, 
  BarChart2, 
  Donut, 
  LineChart,
  Grid3x3,
  Sigma,
  Braces,
  ListOrdered,
  CircleGauge,
  BarChartBig
} from "lucide-react";

interface ComponentItem {
  id: string;
  name: string;
  icon: any;
  type: string;
  category: "basic" | "data" | "charts" | "aggregates";
}

const components: ComponentItem[] = [
  // Basic
  { id: "text", name: "Texto", icon: AlignLeft, type: "text", category: "basic" },
  { id: "image", name: "Imagem", icon: Frame, type: "image", category: "basic" },
  
  // Data
  { id: "field", name: "Campo de Dados", icon: Braces, type: "field", category: "data" },
  { id: "table", name: "Tabela", icon: Grid3x3, type: "table", category: "data" },
  
  // Charts
  { id: "bar-chart", name: "Gráfico de Barras", icon: BarChart2, type: "chart-bar", category: "charts" },
  { id: "line-chart", name: "Gráfico de Linha", icon: LineChart, type: "chart-line", category: "charts" },
  { id: "pie-chart", name: "Gráfico Pizza", icon: Donut, type: "chart-pie", category: "charts" },
  { id: "gauge", name: "Indicador", icon: CircleGauge, type: "gauge", category: "charts" },
  
  // Aggregates
  { id: "sum", name: "Soma", icon: Sigma, type: "aggregate-sum", category: "aggregates" },
  { id: "avg", name: "Média", icon: BarChartBig, type: "aggregate-avg", category: "aggregates" },
  { id: "count", name: "Contagem", icon: ListOrdered, type: "aggregate-count", category: "aggregates" },
];

interface ComponentLibraryProps {
  onDragStart: (component: ComponentItem) => void;
}

export function ComponentLibrary({ onDragStart }: ComponentLibraryProps) {
  const handleDragStart = (e: React.DragEvent, component: ComponentItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify(component));
  };

  const categories = [
    { id: "basic", name: "Básicos" },
    { id: "data", name: "Dados" },
    { id: "charts", name: "Gráficos" },
    { id: "aggregates", name: "Agregações" },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Componentes</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="px-4 space-y-4 pb-4">
            {categories.map((category) => (
              <div key={category.id}>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                  {category.name}
                </h4>
                <div className="flex flex-col gap-2">
                  {components
                    .filter((c) => c.category === category.id)
                    .map((component) => {
                      const Icon = component.icon;
                      return (
                        <div
                          key={component.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, component)}
                          className="w-full flex items-center gap-3 p-3 border rounded-md cursor-move bg-card hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <Icon className="h-5 w-5 text-primary" />
                          <span className="text-sm leading-none flex-1 text-left">{component.name}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
