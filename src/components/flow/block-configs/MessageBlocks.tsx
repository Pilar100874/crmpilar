import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X, Upload, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { ConfigSection, ConfigInput, ConfigTextarea, ConfigSelect, ConfigSwitch, ConfigInfo } from "./ConfigField";
import { FormattingToolbar } from "./FormattingToolbar";
import { MediaUrlUploadField } from "./MediaUrlUploadField";
import { MediaCaptionFields } from "./MediaCaptionFields";

// Normaliza placeholders legados para o formato {{...}}
const normalizeLegacyTokens = (value?: string) => {
  if (!value) return value as any;
  return value
    .replace(/§§\s*VAR_?(\d+)\s*§§/g, (_m, idx) => `{{VAR${idx}}}`)
    .replace(/§§\s*([A-Za-z0-9_]+)\s*§§/g, (_m, name) => `{{${name}}}`);
};

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: any;
  openVariablePicker?: (ref: any) => void;
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
}

export const SendMessageConfig = ({ config, handleConfigChange, nodes = [], edges = [], selectedNode }: ConfigProps) => {
  const messages = Array.isArray(config.messages) ? config.messages : [{ text: config.text || "" }];
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const addMessage = () => {
    handleConfigChange("messages", [...messages, { text: "" }]);
  };

  const updateMessage = (index: number, text: string) => {
    const normalized = normalizeLegacyTokens(text || "");
    const updated = [...messages];
    updated[index] = { ...updated[index], text: normalized };
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

  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingMedia(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('bot-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('bot-media')
        .getPublicUrl(data.path);

      handleConfigChange("media", { ...config.media, url: publicUrl });
      toast.success("Arquivo enviado com sucesso!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivo. Tente novamente.");
    } finally {
      setUploadingMedia(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Messages */}
      {messages.map((message, index) => (
        <ConfigSection key={index} title={`Mensagem ${index + 1}`}>
          <div className="space-y-3">
            {messages.length > 1 && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMessage(index)}
                  className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>
            )}

          <div className="space-y-2">
            <Label className="text-foreground text-sm font-medium flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
              Texto da Mensagem
            </Label>
            <RichTextEditor
              value={normalizeLegacyTokens(message.text || "")}
              onChange={(text) => updateMessage(index, text)}
              placeholder="Clique para editar..."
              multiline={true}
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode}
            />
          </div>
          </div>
        </ConfigSection>
      ))}


      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addMessage} 
          className="flex-1 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-white hover:border-cyan-500"
        >
          <Plus className="w-4 h-4 mr-1" />
          Adicionar mensagem
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addMedia} 
          className="flex-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/40 text-purple-300 hover:bg-purple-500/20 hover:text-white hover:border-purple-500"
        >
          <Plus className="w-4 h-4 mr-1" />
          Adicionar mídia
        </Button>
      </div>

      {/* Media Section */}
      {config.media && (
        <ConfigSection title="Mídia Anexada">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleConfigChange("media", null)}
                className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <X className="w-4 h-4 mr-1" />
                Remover mídia
              </Button>
            </div>

            <ConfigSelect
              label="Tipo de Mídia"
              value={config.media.type || "image"}
              onChange={(v) => handleConfigChange("media", { ...config.media, type: v })}
              options={[
                { value: "image", label: "Imagem" },
                { value: "video", label: "Vídeo" },
                { value: "audio", label: "Áudio" },
                { value: "file", label: "Arquivo" },
                { value: "gif", label: "GIF" }
              ]}
            />
            
            {config.media.type === "file" ? (
              <div className="space-y-2 min-w-0">
                <Label className="text-foreground text-sm font-semibold flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
                  Upload de Arquivo
                </Label>
                <div className="flex gap-2 items-center min-w-0">
                  <Input
                    type="file"
                    onChange={handleMediaFileUpload}
                    disabled={uploadingMedia}
                    className="bg-background border-border text-foreground file:text-foreground file:bg-muted file:border-0 file:mr-3 file:py-1.5 file:px-3 file:rounded hover:file:bg-muted/80 cursor-pointer min-w-0 flex-1"
                  />
                  {uploadingMedia && <Loader2 className="w-5 h-5 animate-spin text-cyan-500 shrink-0" />}
                </div>

                {config.media.url && (
                  <div className="flex items-start gap-2 p-2 bg-muted/40 rounded border border-border min-w-0">
                    <span className="text-xs text-foreground break-all flex-1 min-w-0">{config.media.url}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConfigChange("media", { ...config.media, url: "" })}
                      className="h-6 px-2 text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <MediaUrlUploadField
                label="URL da Mídia"
                value={config.media.url || ""}
                onChange={(url) => handleConfigChange("media", { ...config.media, url })}
                accept={config.media.type === "video" ? "video/*" : config.media.type === "audio" ? "audio/*" : "image/*"}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            )}
            
            <MediaCaptionFields
              title={config.media.mediaTitle || ""}
              description={config.media.mediaDescription || config.media.caption || ""}
              footer={config.media.mediaFooter || ""}
              onChange={(patch) => handleConfigChange("media", { ...config.media, ...patch })}
            />
          </div>
        </ConfigSection>
      )}
    </div>
  );
};

export const MediaConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const mediaType = config.mediaType || "image";
  const url = config.url || "";
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('bot-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('bot-media')
        .getPublicUrl(data.path);

      handleConfigChange("url", publicUrl);
      toast.success("Arquivo enviado com sucesso!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivo. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <ConfigSection title="Configurar Mídia" icon={<Upload className="w-4 h-4" />}>
        <ConfigSelect
          label="Tipo de Mídia"
          value={mediaType}
          onChange={(v) => handleConfigChange("mediaType", v)}
          options={[
            { value: "image", label: "Imagem" },
            { value: "video", label: "Vídeo" },
            { value: "audio", label: "Áudio" },
            { value: "file", label: "Arquivo" },
            { value: "gif", label: "GIF" }
          ]}
          required
        />

        {mediaType === "file" ? (
          <div className="space-y-2 min-w-0">
            <Label className="text-foreground text-sm font-semibold flex items-center gap-2">
              <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
              Upload de Arquivo
            </Label>
            <div className="flex gap-2 min-w-0">
              <Input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="bg-background border-border text-foreground file:text-foreground file:bg-muted file:border-0 file:mr-3 file:py-1.5 file:px-3 file:rounded hover:file:bg-muted/80 cursor-pointer min-w-0 flex-1"
              />
              {uploading && <Loader2 className="w-5 h-5 animate-spin text-cyan-500 shrink-0" />}
            </div>

            {url && (
              <div className="flex items-start gap-2 p-2 bg-muted/40 rounded border border-border min-w-0">
                <span className="text-xs text-foreground break-all flex-1 min-w-0">{url}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleConfigChange("url", "")}
                  className="h-6 px-2 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {!url && (
              <ConfigInfo variant="warning">
                ⚠️ Faça upload de um arquivo
              </ConfigInfo>
            )}
          </div>
        ) : (
          <MediaUrlUploadField
            label="URL da Mídia"
            value={url}
            onChange={(v) => handleConfigChange("url", v)}
            accept={mediaType === "video" ? "video/*" : mediaType === "audio" ? "audio/*" : "image/*"}
            placeholder="https://exemplo.com/imagem.jpg"
          />
        )}

        <MediaCaptionFields
          title={config.mediaTitle || ""}
          description={config.mediaDescription || config.caption || ""}
          footer={config.mediaFooter || ""}
          onChange={(patch) => {
            if ("mediaTitle" in patch) handleConfigChange("mediaTitle", patch.mediaTitle);
            if ("mediaDescription" in patch) handleConfigChange("mediaDescription", patch.mediaDescription);
            if ("mediaFooter" in patch) handleConfigChange("mediaFooter", patch.mediaFooter);
          }}
        />
      </ConfigSection>
    </div>
  );
};

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
