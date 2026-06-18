import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Info, Plus, GripVertical, Trash2 } from "lucide-react";
import { Bold, Italic } from "lucide-react";
import { EmojiInput, EmojiTextarea } from "./EmojiFields";


interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const ListButtonsConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const sections = config.sections || [];

  const addSection = () => {
    handleConfigChange("sections", [
      ...sections,
      { id: Date.now(), title: "", items: [] }
    ]);
  };

  const addItem = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].items = [
      ...(newSections[sectionIndex].items || []),
      { id: Date.now(), label: "" }
    ];
    handleConfigChange("sections", newSections);
  };

  const updateSection = (index: number, field: string, value: any) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    handleConfigChange("sections", newSections);
  };

  const removeSection = (index: number) => {
    const newSections = sections.filter((_: any, i: number) => i !== index);
    handleConfigChange("sections", newSections);
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].items = newSections[sectionIndex].items.filter(
      (_: any, i: number) => i !== itemIndex
    );
    handleConfigChange("sections", newSections);
  };

  const updateItem = (sectionIndex: number, itemIndex: number, field: string, value: any) => {
    const newSections = [...sections];
    newSections[sectionIndex].items[itemIndex] = {
      ...newSections[sectionIndex].items[itemIndex],
      [field]: value
    };
    handleConfigChange("sections", newSections);
  };

  const totalItems = sections.reduce((sum: number, section: any) => sum + (section.items?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Cabeçalho (opcional)</Label>
        <Textarea
          value={config.header || ""}
          onChange={(e) => handleConfigChange("header", e.target.value)}
          placeholder="Cabeçalho"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Descrição (máx. 1024 caracteres) *</Label>
        <Textarea
          value={config.text || ""}
          onChange={(e) => handleConfigChange("text", e.target.value)}
          placeholder="Texto do corpo"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Rodapé (opcional)</Label>
        <Textarea
          value={config.footer || ""}
          onChange={(e) => handleConfigChange("footer", e.target.value)}
          placeholder="Rodapé"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Título da Lista / CTA *</Label>
        <Input
          value={config.listHeader || ""}
          onChange={(e) => handleConfigChange("listHeader", e.target.value)}
          placeholder="Menu"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Seções e Itens</Label>
          <span className="text-sm text-muted-foreground">{totalItems}/10 itens</span>
        </div>
        
        {sections.map((section: any, sIndex: number) => (
          <div key={section.id} className="space-y-3 border rounded-lg p-3 bg-muted/50">
            {/* Section Header */}
            <div className="flex items-center gap-2">
              <Input
                value={section.title || ""}
                onChange={(e) => updateSection(sIndex, "title", e.target.value)}
                placeholder={`Título da Seção ${sIndex + 1} (opcional)`}
                className="flex-1"
              />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => removeSection(sIndex)}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Section Items */}
            <div className="space-y-2 ml-4">
              {(section.items || []).map((item: any, iIndex: number) => (
                <div key={item.id} className="space-y-2 border rounded p-2 bg-background">
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-2" />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={item.label || ""}
                        onChange={(e) => updateItem(sIndex, iIndex, "label", e.target.value)}
                        placeholder="Nome do item (máx 24 caracteres) *"
                        maxLength={24}
                      />
                      <Input
                        value={item.description || ""}
                        onChange={(e) => updateItem(sIndex, iIndex, "description", e.target.value)}
                        placeholder="Descrição (máx 72 caracteres, opcional)"
                        maxLength={72}
                      />
                      <Input
                        value={item.value || ""}
                        onChange={(e) => updateItem(sIndex, iIndex, "value", e.target.value)}
                        placeholder="Valor a salvar (opcional)"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeItem(sIndex, iIndex)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add Item to Section */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addItem(sIndex)}
                disabled={totalItems >= 10}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar item
              </Button>
            </div>
          </div>
        ))}

        {/* Add New Section */}
        <Button 
          variant="default" 
          onClick={addSection}
          disabled={totalItems >= 10}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar nova seção
        </Button>

        {totalItems >= 10 && (
          <p className="text-sm text-amber-600 flex items-center gap-1">
            <Info className="h-4 w-4" />
            Máximo de 10 itens atingido
          </p>
        )}
      </div>
    </div>
  );
};
