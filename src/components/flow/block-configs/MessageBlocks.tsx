import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VariableTextarea } from "../VariableInput";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X, Bold, Italic, Code, Heading, List, ListOrdered, Link as LinkIcon, Quote, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs: any;
  openVariablePicker: (ref: any) => void;
}

export const SendMessageConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const messages = Array.isArray(config.messages) ? config.messages : [{ text: config.text || "" }];

  const addMessage = () => {
    handleConfigChange("messages", [...messages, { text: "" }]);
  };

  const updateMessage = (index: number, text: string) => {
    const updated = [...messages];
    updated[index] = { ...updated[index], text };
    handleConfigChange("messages", updated);
  };

  const removeMessage = (index: number) => {
    const updated = messages.filter((_, i) => i !== index);
    handleConfigChange("messages", updated);
  };

  const addMedia = () => {
    handleConfigChange("media", {
      type: config.media?.type || "image",
      url: config.media?.url || "",
      caption: config.media?.caption || ""
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <span className="text-lg">💬</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">MESSAGES</h3>
            <a href="https://docs.lovable.dev" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              How to use <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {messages.map((message, index) => (
        <Card key={index} className="p-4 space-y-3 bg-slate-900/50 border-slate-700">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-300">Escrever uma mensagem</Label>
            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMessage(index)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <VariableTextarea
              name={`text_${index}`}
              ref={(el) => (inputRefs.current[`text_${index}`] = el)}
              value={message.text || ""}
              onChange={(e) => updateMessage(index, e.target.value)}
              onVariableRequest={() => openVariablePicker(inputRefs.current[`text_${index}`])}
              placeholder="Clique para editar..."
              rows={4}
              className="resize-none bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
            />

            {/* Barra de ferramentas de formatação */}
            <div className="flex items-center justify-between border-t border-slate-700 pt-2">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50" title="Bold">
                  <Bold className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50" title="Italic">
                  <Italic className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50" title="Code">
                  <Code className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50" title="Heading">
                  <Heading className="w-3.5 h-3.5" />
                </Button>
                <div className="w-px h-4 bg-slate-700 mx-1" />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50" title="Ordered List">
                  <ListOrdered className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50" title="Bullet List">
                  <List className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50" title="Link">
                  <LinkIcon className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50" title="Quote">
                  <Quote className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => openVariablePicker(inputRefs.current[`text_${index}`])}
                className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Usar campo
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addMessage} className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
          <Plus className="w-4 h-4 mr-1" />
          Adicionar mensagem
        </Button>
        <Button variant="outline" size="sm" onClick={addMedia} className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
          <Plus className="w-4 h-4 mr-1" />
          Adicionar mídia
        </Button>
      </div>

      {config.media && (
        <Card className="p-4 space-y-3 bg-slate-900/50 border-slate-700">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-300">Mídia</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleConfigChange("media", null)}
              className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Select
            value={config.media.type || "image"}
            onValueChange={(v) => handleConfigChange("media", { ...config.media, type: v })}
          >
            <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="image">Imagem</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
              <SelectItem value="gif">GIF</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={config.media.url || ""}
            onChange={(e) => handleConfigChange("media", { ...config.media, url: e.target.value })}
            placeholder="URL da mídia"
            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
          />
          <Input
            value={config.media.caption || ""}
            onChange={(e) => handleConfigChange("media", { ...config.media, caption: e.target.value })}
            placeholder="Legenda (opcional)"
            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
          />
        </Card>
      )}
    </div>
  );
};

export const MediaConfig = ({ config, handleConfigChange }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label className="text-slate-300">Tipo de Mídia</Label>
      <Select
        value={config.mediaType || "image"}
        onValueChange={(v) => handleConfigChange("mediaType", v)}
      >
        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          <SelectItem value="image">Imagem</SelectItem>
          <SelectItem value="video">Vídeo</SelectItem>
          <SelectItem value="audio">Áudio</SelectItem>
          <SelectItem value="file">Arquivo</SelectItem>
          <SelectItem value="gif">GIF</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label className="text-slate-300">URL da Mídia *</Label>
      <Input
        value={config.url || ""}
        onChange={(e) => handleConfigChange("url", e.target.value)}
        placeholder="https://exemplo.com/imagem.jpg"
        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
      />
    </div>

    <div className="space-y-2">
      <Label className="text-slate-300">Legenda (opcional)</Label>
      <Textarea
        value={config.caption || ""}
        onChange={(e) => handleConfigChange("caption", e.target.value)}
        placeholder="Descrição da mídia..."
        rows={3}
        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
      />
    </div>
  </div>
);

export const GoodbyeConfig = ({ config, handleConfigChange }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Mensagem de Despedida</Label>
      <Textarea
        value={config.text || ""}
        onChange={(e) => handleConfigChange("text", e.target.value)}
        placeholder="Obrigado pela conversa! Até logo."
        rows={4}
      />
    </div>

    <div className="flex items-center justify-between">
      <Label>Permitir Reiniciar Conversa</Label>
      <Switch
        checked={config.allowRestart !== false}
        onCheckedChange={(checked) => handleConfigChange("allowRestart", checked)}
      />
    </div>

    <div className="flex items-center justify-between">
      <Label>Mostrar Botões Sociais</Label>
      <Switch
        checked={config.showSocialShare || false}
        onCheckedChange={(checked) => handleConfigChange("showSocialShare", checked)}
      />
    </div>

    {config.showSocialShare && (
      <div className="space-y-2 pl-4 border-l-2 border-muted">
        <Label className="text-xs">Redes Sociais</Label>
        {["Facebook", "Twitter", "LinkedIn", "WhatsApp"].map((social) => (
          <div key={social} className="flex items-center gap-2">
            <Switch
              checked={config.socialNetworks?.[social.toLowerCase()] !== false}
              onCheckedChange={(checked) => 
                handleConfigChange("socialNetworks", {
                  ...config.socialNetworks,
                  [social.toLowerCase()]: checked
                })
              }
            />
            <span className="text-sm">{social}</span>
          </div>
        ))}
      </div>
    )}

    <div className="flex items-center justify-between">
      <Label>Redirecionar após Despedida</Label>
      <Switch
        checked={config.enableRedirect || false}
        onCheckedChange={(checked) => handleConfigChange("enableRedirect", checked)}
      />
    </div>

    {config.enableRedirect && (
      <div className="space-y-2">
        <Label>URL de Redirecionamento</Label>
        <Input
          value={config.redirectUrl || ""}
          onChange={(e) => handleConfigChange("redirectUrl", e.target.value)}
          placeholder="https://seusite.com"
        />
        <div className="space-y-2">
          <Label>Mensagem de Redirecionamento</Label>
          <Input
            value={config.redirectMessage || ""}
            onChange={(e) => handleConfigChange("redirectMessage", e.target.value)}
            placeholder="Você será redirecionado em 3 segundos..."
          />
        </div>
        <div className="space-y-2">
          <Label>Delay (segundos)</Label>
          <Input
            type="number"
            value={config.redirectDelay || 3}
            onChange={(e) => handleConfigChange("redirectDelay", parseInt(e.target.value))}
            min={0}
            max={30}
          />
        </div>
      </div>
    )}
  </div>
);
