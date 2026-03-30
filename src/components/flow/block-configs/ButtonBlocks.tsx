import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ConfigSection, ConfigInput, ConfigTextarea, ConfigSelect, ConfigSwitch, ConfigInfo } from "./ConfigField";
import { FormattingToolbar } from "./FormattingToolbar";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: any;
  openVariablePicker?: (ref: any) => void;
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
}

// Remove unused function
// insertFormatting is no longer needed as it's built into RichTextEditor

// Botões de Resposta Rápida
export const ReplyButtonsConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => {
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
      <ConfigSection title="Mensagem">
        <div className="space-y-2">
          <Label className="text-foreground text-sm font-medium flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full"></span>
            Texto da Mensagem
          </Label>
          <RichTextEditor
            value={config.text || ""}
            onChange={(text) => handleConfigChange("text", text)}
            placeholder="Digite a mensagem antes dos botões..."
            multiline={true}
            nodes={nodes}
            edges={edges}
            selectedNode={selectedNode}
          />
        </div>
      </ConfigSection>

      <ConfigSection title="Mídia (Opcional)">
        <ConfigSwitch
          label="Adicionar Mídia (GIF, Imagem, Vídeo)"
          checked={config.hasMedia || false}
          onChange={(checked) => handleConfigChange("hasMedia", checked)}
        />

        {config.hasMedia && (
          <div className="space-y-3 pl-4 border-l-2 border-cyan-500/30">
            <ConfigSelect
              label="Tipo de Mídia"
              value={config.mediaType || "image"}
              onChange={(v) => handleConfigChange("mediaType", v)}
              options={[
                { value: "image", label: "Imagem" },
                { value: "gif", label: "GIF" },
                { value: "video", label: "Vídeo" }
              ]}
            />
            <ConfigInput
              label="URL da Mídia"
              value={config.mediaUrl || ""}
              onChange={(url) => handleConfigChange("mediaUrl", url)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>
        )}
      </ConfigSection>

      <ConfigSection title="Botões de Resposta">
        <div className="space-y-3">
          {(config.buttons || []).map((button: any, index: number) => (
            <div key={index} className="p-3 border border-cyan-500/30 rounded-lg bg-foreground/50 space-y-2 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">Botão {index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeButton(index)}
                  className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Input
                value={button.text || ""}
                onChange={(e) => updateButton(index, "text", e.target.value)}
                placeholder="Texto do botão"
                className="bg-foreground/90/80 border-slate-700/50 text-white placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner font-medium"
              />

              <Input
                value={button.value || ""}
                onChange={(e) => updateButton(index, "value", e.target.value)}
                placeholder="Valor armazenado (opcional)"
                className="bg-foreground/90/80 border-slate-700/50 text-white placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner font-medium"
              />

              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <Input
                  value={button.imageUrl || ""}
                  onChange={(e) => updateButton(index, "imageUrl", e.target.value)}
                  placeholder="URL da imagem do botão (opcional)"
                  className="bg-foreground/90/80 border-slate-700/50 text-white placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner font-medium text-xs"
                />
              </div>
            </div>
          ))}

          {(!config.buttons || config.buttons.length === 0) && (
            <ConfigInfo variant="info">
              Nenhum botão adicionado. Clique em "Adicionar Botão" para criar.
            </ConfigInfo>
          )}

          <Button 
            onClick={addButton}
            variant="outline"
            className="w-full border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Botão
          </Button>
        </div>
      </ConfigSection>

      <ConfigSection title="Opções Avançadas">
        <ConfigInput
          label="Variável para Salvar Resposta"
          value={config.variable || ""}
          onChange={(v) => handleConfigChange("variable", v)}
          placeholder="button_response"
          info="A escolha do usuário será salva nesta variável"
          prefix="@"
        />

        <ConfigSwitch
          label="Escolha Múltipla"
          checked={config.multipleChoice || false}
          onChange={(checked) => handleConfigChange("multipleChoice", checked)}
          info="Permitir selecionar vários botões"
        />

        {config.multipleChoice && (
          <div className="pl-4 border-l-2 border-cyan-500/30 space-y-2">
            <ConfigInput
              label="Texto do Botão de Confirmação"
              value={config.confirmButtonText || "Confirmar"}
              onChange={(v) => handleConfigChange("confirmButtonText", v)}
              placeholder="Confirmar"
            />
          </div>
        )}
      </ConfigSection>
    </div>
  );
};

// Lista de Botões (Menu estilo WhatsApp)
export const ListButtonsConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => {
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
      <ConfigSection title="Mensagem">
        <div className="space-y-2">
          <Label className="text-foreground text-sm font-medium flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full"></span>
            Texto da Mensagem
          </Label>
          <RichTextEditor
            value={config.text || ""}
            onChange={(text) => handleConfigChange("text", text)}
            placeholder="Mensagem antes do menu..."
            multiline={true}
            nodes={nodes}
            edges={edges}
            selectedNode={selectedNode}
          />
        </div>
      </ConfigSection>

      <ConfigSection title="Configuração do Menu">
        <ConfigInput
          label="Texto do Botão do Menu"
          value={config.buttonText || "Ver opções"}
          onChange={(v) => handleConfigChange("buttonText", v)}
          placeholder="Ver opções"
        />
      </ConfigSection>

      <ConfigSection title="Seções do Menu">
        <div className="space-y-3">
          {(config.sections || []).map((section: any, sectionIndex: number) => (
            <div key={sectionIndex} className="p-3 border border-cyan-500/30 rounded-lg bg-foreground/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Seção {sectionIndex + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSection(sectionIndex)}
                  className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Input
                value={section.title || ""}
                onChange={(e) => updateSection(sectionIndex, "title", e.target.value)}
                placeholder="Título da seção"
                className="bg-foreground/90/80 border-slate-700/50 text-white placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner font-medium"
              />

              <div className="pl-3 border-l-2 border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Itens</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addItem(sectionIndex)}
                    className="h-7 text-xs border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/10"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Item
                  </Button>
                </div>

                {(section.items || []).map((item: any, itemIndex: number) => (
                  <div key={itemIndex} className="space-y-1 p-2 bg-foreground/80/50 rounded border border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-medium">Item {itemIndex + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => removeItem(sectionIndex, itemIndex)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      value={item.title || ""}
                      onChange={(e) => updateItem(sectionIndex, itemIndex, "title", e.target.value)}
                      placeholder="Título"
                      className="text-xs bg-foreground/90/80 border-slate-700/50 text-white placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
                    />
                    <Input
                      value={item.description || ""}
                      onChange={(e) => updateItem(sectionIndex, itemIndex, "description", e.target.value)}
                      placeholder="Descrição (opcional)"
                      className="text-xs bg-foreground/90/80 border-slate-700/50 text-white placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(!config.sections || config.sections.length === 0) && (
            <ConfigInfo variant="info">
              Nenhuma seção adicionada. Clique em "Adicionar Seção" para criar.
            </ConfigInfo>
          )}

          <Button 
            onClick={addSection}
            variant="outline"
            className="w-full border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Seção
          </Button>
        </div>
      </ConfigSection>

      <ConfigSection title="Salvar Resposta">
        <ConfigInput
          label="Variável para Salvar Escolha"
          value={config.variable || ""}
          onChange={(v) => handleConfigChange("variable", v)}
          placeholder="menu_choice"
          info="A escolha do usuário será salva nesta variável"
          prefix="@"
        />
      </ConfigSection>
    </div>
  );
};
