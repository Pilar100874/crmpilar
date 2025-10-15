import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VariableTextarea } from "../VariableInput";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs: any;
  openVariablePicker: (ref: any) => void;
}

export const SendMessageConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Mensagem</Label>
      <VariableTextarea
        name="text"
        ref={(el) => (inputRefs.current['text'] = el)}
        value={config.text || ""}
        onChange={(e) => handleConfigChange("text", e.target.value)}
        onVariableRequest={() => openVariablePicker(inputRefs.current['text'])}
        placeholder="Digite a mensagem... (Ctrl+V para variáveis)"
        rows={6}
      />
      <p className="text-xs text-muted-foreground">
        💡 Use <kbd className="px-1.5 py-0.5 bg-muted rounded border">Ctrl+V</kbd> para inserir variáveis
      </p>
    </div>
  </div>
);

export const MediaConfig = ({ config, handleConfigChange }: ConfigProps) => (
  <div className="space-y-4">
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
          <SelectItem value="video">Vídeo</SelectItem>
          <SelectItem value="audio">Áudio</SelectItem>
          <SelectItem value="file">Arquivo</SelectItem>
          <SelectItem value="gif">GIF</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>URL da Mídia *</Label>
      <Input
        value={config.url || ""}
        onChange={(e) => handleConfigChange("url", e.target.value)}
        placeholder="https://exemplo.com/imagem.jpg"
      />
    </div>

    <div className="space-y-2">
      <Label>Legenda (opcional)</Label>
      <Textarea
        value={config.caption || ""}
        onChange={(e) => handleConfigChange("caption", e.target.value)}
        placeholder="Descrição da mídia..."
        rows={3}
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
