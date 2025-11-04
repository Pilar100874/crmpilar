import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReportPropertiesPanelProps {
  element: any;
  onChange: (updates: any) => void;
  queryData: any[];
}

export function ReportPropertiesPanel({
  element,
  onChange,
  queryData,
}: ReportPropertiesPanelProps) {
  const updateProperty = (key: string, value: any) => {
    onChange({
      properties: {
        ...element.properties,
        [key]: value,
      },
    });
  };

  const renderTextProperties = () => (
    <>
      <div>
        <Label>Conteúdo</Label>
        <Textarea
          value={element.properties.content || ""}
          onChange={(e) => updateProperty("content", e.target.value)}
        />
      </div>
      <div>
        <Label>Tamanho da Fonte</Label>
        <Input
          type="number"
          value={element.properties.fontSize || 14}
          onChange={(e) => updateProperty("fontSize", parseInt(e.target.value))}
        />
      </div>
      <div>
        <Label>Família da Fonte</Label>
        <Select
          value={element.properties.fontFamily || "Arial"}
          onValueChange={(value) => updateProperty("fontFamily", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Cor</Label>
        <Input
          type="color"
          value={element.properties.color || "#000000"}
          onChange={(e) => updateProperty("color", e.target.value)}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={element.properties.bold || false}
          onCheckedChange={(checked) => updateProperty("bold", checked)}
        />
        <Label>Negrito</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={element.properties.italic || false}
          onCheckedChange={(checked) => updateProperty("italic", checked)}
        />
        <Label>Itálico</Label>
      </div>
    </>
  );

  const renderImageProperties = () => (
    <>
      <div>
        <Label>URL da Imagem</Label>
        <Input
          value={element.properties.url || ""}
          onChange={(e) => updateProperty("url", e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div>
        <Label>Ajuste</Label>
        <Select
          value={element.properties.fit || "contain"}
          onValueChange={(value) => updateProperty("fit", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Conter</SelectItem>
            <SelectItem value="cover">Cobrir</SelectItem>
            <SelectItem value="fill">Preencher</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  const renderChartProperties = () => {
    const fields = queryData.length > 0 ? Object.keys(queryData[0]) : [];

    return (
      <>
        <div>
          <Label>Tipo de Gráfico</Label>
          <Select
            value={element.properties.chartType || "bar"}
            onValueChange={(value) => updateProperty("chartType", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Barra</SelectItem>
              <SelectItem value="line">Linha</SelectItem>
              <SelectItem value="pie">Pizza</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Campo de Dados</Label>
          <Select
            value={element.properties.dataField || ""}
            onValueChange={(value) => updateProperty("dataField", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {fields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Campo de Rótulo</Label>
          <Select
            value={element.properties.labelField || ""}
            onValueChange={(value) => updateProperty("labelField", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {fields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </>
    );
  };

  const renderTableProperties = () => (
    <>
      <div>
        <Label>Largura da Borda</Label>
        <Input
          type="number"
          value={element.properties.borderWidth || 1}
          onChange={(e) => updateProperty("borderWidth", parseInt(e.target.value))}
        />
      </div>
      <div>
        <Label>Cor da Borda</Label>
        <Input
          type="color"
          value={element.properties.borderColor || "#000000"}
          onChange={(e) => updateProperty("borderColor", e.target.value)}
        />
      </div>
    </>
  );

  const renderShapeProperties = () => (
    <>
      <div>
        <Label>Tipo de Forma</Label>
        <Select
          value={element.properties.shapeType || "rectangle"}
          onValueChange={(value) => updateProperty("shapeType", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rectangle">Retângulo</SelectItem>
            <SelectItem value="circle">Círculo</SelectItem>
            <SelectItem value="ellipse">Elipse</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Cor de Preenchimento</Label>
        <Input
          type="color"
          value={element.properties.fillColor || "#ffffff"}
          onChange={(e) => updateProperty("fillColor", e.target.value)}
        />
      </div>
      <div>
        <Label>Cor da Borda</Label>
        <Input
          type="color"
          value={element.properties.borderColor || "#000000"}
          onChange={(e) => updateProperty("borderColor", e.target.value)}
        />
      </div>
      <div>
        <Label>Largura da Borda</Label>
        <Input
          type="number"
          value={element.properties.borderWidth || 1}
          onChange={(e) => updateProperty("borderWidth", parseInt(e.target.value))}
        />
      </div>
    </>
  );

  const renderLineProperties = () => (
    <>
      <div>
        <Label>Cor</Label>
        <Input
          type="color"
          value={element.properties.color || "#000000"}
          onChange={(e) => updateProperty("color", e.target.value)}
        />
      </div>
      <div>
        <Label>Largura</Label>
        <Input
          type="number"
          value={element.properties.width || 1}
          onChange={(e) => updateProperty("width", parseInt(e.target.value))}
        />
      </div>
    </>
  );

  const renderBarcodeProperties = () => (
    <>
      <div>
        <Label>Formato</Label>
        <Select
          value={element.properties.format || "CODE128"}
          onValueChange={(value) => updateProperty("format", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CODE128">CODE128</SelectItem>
            <SelectItem value="EAN13">EAN13</SelectItem>
            <SelectItem value="UPC">UPC</SelectItem>
            <SelectItem value="CODE39">CODE39</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Valor</Label>
        <Input
          value={element.properties.value || ""}
          onChange={(e) => updateProperty("value", e.target.value)}
          placeholder="123456789"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={element.properties.displayValue !== false}
          onCheckedChange={(checked) => updateProperty("displayValue", checked)}
        />
        <Label>Exibir Valor</Label>
      </div>
    </>
  );

  const renderProperties = () => {
    switch (element.type) {
      case "text":
        return renderTextProperties();
      case "image":
        return renderImageProperties();
      case "chart":
        return renderChartProperties();
      case "table":
        return renderTableProperties();
      case "shape":
        return renderShapeProperties();
      case "line":
        return renderLineProperties();
      case "barcode":
        return renderBarcodeProperties();
      default:
        return null;
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-4 pr-4">
        <div>
          <h4 className="font-medium mb-2">Posição e Tamanho</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">X</Label>
              <Input
                type="number"
                value={element.x}
                onChange={(e) => onChange({ x: parseInt(e.target.value) })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Y</Label>
              <Input
                type="number"
                value={element.y}
                onChange={(e) => onChange({ y: parseInt(e.target.value) })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Largura</Label>
              <Input
                type="number"
                value={element.width}
                onChange={(e) => onChange({ width: parseInt(e.target.value) })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Altura</Label>
              <Input
                type="number"
                value={element.height}
                onChange={(e) => onChange({ height: parseInt(e.target.value) })}
                className="h-8"
              />
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Propriedades do Elemento</h4>
          <div className="space-y-3">{renderProperties()}</div>
        </div>
      </div>
    </ScrollArea>
  );
}
