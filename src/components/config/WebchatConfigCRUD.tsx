import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, Copy, Check } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface WebchatConfig {
  id?: string;
  enabled: boolean;
  title: string;
  welcome_message: string;
  primary_color: string;
  position: string;
}

export function WebchatConfigCRUD() {
  const [config, setConfig] = useState<WebchatConfig>({
    enabled: true,
    title: "Atendimento",
    welcome_message: "Olá! Como posso ajudar?",
    primary_color: "#3b82f6",
    position: "right",
  });
  const [loading, setLoading] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [copied, setCopied] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
      
      if (!estabId) {
        console.log("Nenhum estabelecimento selecionado");
        return;
      }

      const { data, error } = await supabase
        .from("canais_atendimento")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar configuração:", error);
        return;
      }

      if (data) {
        setConfig({
          id: data.id,
          enabled: data.webchat_enabled ?? true,
          title: "Atendimento",
          welcome_message: "Olá! Como posso ajudar?",
          primary_color: "#3b82f6",
          position: "right",
        });
        setHasExistingConfig(true);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const estabId = await getEstabelecimentoId();
      
      if (!estabId) {
        toast({
          title: "Erro",
          description: "Nenhum estabelecimento selecionado",
          variant: "destructive",
        });
        return;
      }

      const configData = {
        estabelecimento_id: estabId,
        webchat_enabled: config.enabled,
      };

      if (hasExistingConfig && config.id) {
        const { error } = await supabase
          .from("canais_atendimento")
          .update({ webchat_enabled: config.enabled })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("canais_atendimento")
          .insert([configData]);

        if (error) throw error;
      }

      toast({
        title: "Configuração salva",
        description: "A configuração do Webchat foi salva com sucesso",
      });

      await loadConfig();
    } catch (error: any) {
      console.error("Erro ao salvar configuração:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a configuração",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEmbedCode = () => {
    const baseUrl = window.location.origin;
    return `<script src="${baseUrl}/webchat-widget.js" data-establishment="${estabelecimentoId}"></script>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Código copiado",
      description: "O código de incorporação foi copiado para a área de transferência",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle>Configuração do Webchat</CardTitle>
        </div>
        <CardDescription>
          Configure o widget de chat para seu website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Webchat Ativo</Label>
            <p className="text-xs text-muted-foreground">
              Habilita ou desabilita o webchat para este estabelecimento
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Título do Chat</Label>
          <Input
            id="title"
            type="text"
            placeholder="Atendimento"
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
          <Input
            id="welcome_message"
            type="text"
            placeholder="Olá! Como posso ajudar?"
            value={config.welcome_message}
            onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="primary_color">Cor Principal</Label>
          <div className="flex gap-2">
            <Input
              id="primary_color"
              type="color"
              value={config.primary_color}
              onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
              className="w-16 h-10 p-1"
            />
            <Input
              type="text"
              value={config.primary_color}
              onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>

        {estabelecimentoId && (
          <div className="space-y-2">
            <Label>Código de Incorporação</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={getEmbedCode()}
                readOnly
                className="font-mono text-xs"
              />
              <Button variant="outline" size="icon" onClick={copyEmbedCode}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Adicione este código ao seu website para exibir o widget de chat
            </p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configuração
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
