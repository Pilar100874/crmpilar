import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VariableTextarea } from "../VariableInput";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs: any;
  openVariablePicker: (ref: any) => void;
}

// Botões de Resposta Rápida (seção 5 do manual)
export const ReplyButtonsConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const addButton = () => {
    const buttons = config.buttons || [];
    handleConfigChange("buttons", [...buttons, { text: "", value: "", imageUrl: "" }]);
  };

  const updateButton = (index: number, field: string, value: string) => {
    const buttons = [...(config.buttons || [])];
    buttons[index] = { ...buttons[index], [field]: value };
    handleConfigChange("buttons", buttons);
  };

  const removeButton = (index: number) => {
    const buttons = [...(config.buttons || [])];
    buttons.splice(index, 1);
    handleConfigChange("buttons", buttons);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Texto da Mensagem</Label>
        <VariableTextarea
          name="text"
          ref={(el) => (inputRefs.current['text'] = el)}
          value={config.text || ""}
          onChange={(e) => handleConfigChange("text", e.target.value)}
          onVariableRequest={() => openVariablePicker(inputRefs.current['text'])}
          placeholder="Digite a mensagem antes dos botões... (Ctrl+V para variáveis)"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          💡 Use {"{{"} variavel {"}"} para personalizar
        </p>
      </div>

      {/* Opção de adicionar mídia */}
      <div className="flex items-center justify-between">
        <Label>Adicionar Mídia (GIF, Imagem, Vídeo)</Label>
        <Switch
          checked={config.hasMedia || false}
          onCheckedChange={(checked) => handleConfigChange("hasMedia", checked)}
        />
      </div>

      {config.hasMedia && (
        <div className="space-y-2 pl-4 border-l-2 border-muted">
          <div className="space-y-2">
            <Label>Tipo de Mídia</Label>
            <Select
              value={config.mediaType || "image"}
              onValueChange={(v) => handleConfigChange("mediaType", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="gif">GIF</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>URL da Mídia</Label>
            <Input
              value={config.mediaUrl || ""}
              onChange={(e) => handleConfigChange("mediaUrl", e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Botões de Resposta</Label>
          <Button variant="outline" size="sm" onClick={addButton}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {(config.buttons || []).map((button: any, index: number) => (
            <Card key={index} className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Botão {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeButton(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <Input
                  value={button.text || ""}
                  onChange={(e) => updateButton(index, "text", e.target.value)}
                  placeholder="Texto do botão"
                />

                <Input
                  value={button.value || ""}
                  onChange={(e) => updateButton(index, "value", e.target.value)}
                  placeholder="Valor armazenado (opcional)"
                />

                {/* Opção de adicionar imagem ao botão (seção 8 do manual) */}
                <div className="flex items-center gap-2 text-xs">
                  <ImageIcon className="w-3 h-3" />
                  <Input
                    value={button.imageUrl || ""}
                    onChange={(e) => updateButton(index, "imageUrl", e.target.value)}
                    placeholder="URL da imagem do botão (opcional)"
                    className="text-xs"
                  />
                </div>
              </div>
            </Card>
          ))}

          {(!config.buttons || config.buttons.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum botão adicionado. Clique em "Adicionar" para criar.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Variável para Salvar Resposta (opcional)</Label>
        <Input
          value={config.variable || ""}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="button_response"
        />
        <p className="text-xs text-muted-foreground">
          A escolha do usuário será salva nesta variável
        </p>
      </div>

      {/* Escolha Múltipla (seção 10 do manual) */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Escolha Múltipla</Label>
          <p className="text-xs text-muted-foreground">
            Permitir selecionar vários botões
          </p>
        </div>
        <Switch
          checked={config.multipleChoice || false}
          onCheckedChange={(checked) => handleConfigChange("multipleChoice", checked)}
        />
      </div>

      {config.multipleChoice && (
        <div className="pl-4 border-l-2 border-muted">
          <div className="space-y-2">
            <Label>Texto do Botão de Confirmação</Label>
            <Input
              value={config.confirmButtonText || "Confirmar"}
              onChange={(e) => handleConfigChange("confirmButtonText", e.target.value)}
              placeholder="Confirmar"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Lista de Botões (Menu estilo WhatsApp)
export const ListButtonsConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const addSection = () => {
    const sections = config.sections || [];
    handleConfigChange("sections", [...sections, { title: "", items: [] }]);
  };

  const updateSection = (sectionIndex: number, field: string, value: any) => {
    const sections = [...(config.sections || [])];
    sections[sectionIndex] = { ...sections[sectionIndex], [field]: value };
    handleConfigChange("sections", sections);
  };

  const removeSection = (sectionIndex: number) => {
    const sections = [...(config.sections || [])];
    sections.splice(sectionIndex, 1);
    handleConfigChange("sections", sections);
  };

  const addItem = (sectionIndex: number) => {
    const sections = [...(config.sections || [])];
    const items = sections[sectionIndex].items || [];
    sections[sectionIndex].items = [...items, { title: "", description: "", value: "" }];
    handleConfigChange("sections", sections);
  };

  const updateItem = (sectionIndex: number, itemIndex: number, field: string, value: string) => {
    const sections = [...(config.sections || [])];
    const items = [...sections[sectionIndex].items];
    items[itemIndex] = { ...items[itemIndex], [field]: value };
    sections[sectionIndex].items = items;
    handleConfigChange("sections", sections);
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const sections = [...(config.sections || [])];
    const items = [...sections[sectionIndex].items];
    items.splice(itemIndex, 1);
    sections[sectionIndex].items = items;
    handleConfigChange("sections", sections);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Texto da Mensagem</Label>
        <VariableTextarea
          name="text"
          ref={(el) => (inputRefs.current['text'] = el)}
          value={config.text || ""}
          onChange={(e) => handleConfigChange("text", e.target.value)}
          onVariableRequest={() => openVariablePicker(inputRefs.current['text'])}
          placeholder="Mensagem antes do menu..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Texto do Botão do Menu</Label>
        <Input
          value={config.buttonText || "Ver opções"}
          onChange={(e) => handleConfigChange("buttonText", e.target.value)}
          placeholder="Ver opções"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Seções do Menu</Label>
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="w-4 h-4 mr-1" />
            Seção
          </Button>
        </div>

        {(config.sections || []).map((section: any, sectionIndex: number) => (
          <Card key={sectionIndex} className="p-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Seção {sectionIndex + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSection(sectionIndex)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Input
                value={section.title || ""}
                onChange={(e) => updateSection(sectionIndex, "title", e.target.value)}
                placeholder="Título da seção"
              />

              <div className="pl-3 border-l-2 border-muted space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Itens</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addItem(sectionIndex)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Item
                  </Button>
                </div>

                {(section.items || []).map((item: any, itemIndex: number) => (
                  <div key={itemIndex} className="space-y-1 p-2 bg-muted/30 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Item {itemIndex + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeItem(sectionIndex, itemIndex)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      value={item.title || ""}
                      onChange={(e) => updateItem(sectionIndex, itemIndex, "title", e.target.value)}
                      placeholder="Título"
                      className="text-xs"
                    />
                    <Input
                      value={item.description || ""}
                      onChange={(e) => updateItem(sectionIndex, itemIndex, "description", e.target.value)}
                      placeholder="Descrição (opcional)"
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Variável para Salvar Escolha</Label>
        <Input
          value={config.variable || ""}
          onChange={(e) => handleConfigChange("variable", e.target.value)}
          placeholder="menu_choice"
        />
      </div>
    </div>
  );
};
