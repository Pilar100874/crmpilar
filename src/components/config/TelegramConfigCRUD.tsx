import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Eye, EyeOff, Send } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface TelegramConfig {
  id?: string;
  bot_token: string;
  bot_username: string;
  webhook_url: string;
}

export function TelegramConfigCRUD() {
  const [config, setConfig] = useState<TelegramConfig>({
    bot_token: "",
    bot_username: "",
    webhook_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        console.log("Nenhum estabelecimento selecionado");
        return;
      }

      const { data, error } = await supabase
        .from("telegram_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar configuração:", error);
        return;
      }

      if (data) {
        setConfig({
          id: data.id,
          bot_token: data.bot_token || "",
          bot_username: data.bot_username || "",
          webhook_url: data.webhook_url || "",
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

      if (!config.bot_token) {
        toast({
          title: "Campo obrigatório",
          description: "Por favor, preencha o Token do Bot",
          variant: "destructive",
        });
        return;
      }

      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        toast({
          title: "Erro",
          description: "Nenhum estabelecimento selecionado",
          variant: "destructive",
        });
        return;
      }

      const configData = {
        estabelecimento_id: estabelecimentoId,
        bot_token: config.bot_token,
        bot_username: config.bot_username || null,
        webhook_url: config.webhook_url || null,
      };

      if (hasExistingConfig && config.id) {
        const { error } = await supabase
          .from("telegram_config")
          .update(configData)
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("telegram_config")
          .insert([configData]);

        if (error) throw error;
      }

      toast({
        title: "Configuração salva",
        description: "A configuração do Telegram foi salva com sucesso",
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5 text-[#0088cc]" />
          <CardTitle>Configuração do Telegram</CardTitle>
        </div>
        <CardDescription>
          Configure o bot do Telegram para receber e enviar mensagens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bot_token">Token do Bot *</Label>
          <div className="relative">
            <Input
              id="bot_token"
              type={showToken ? "text" : "password"}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={config.bot_token}
              onChange={(e) => setConfig({ ...config, bot_token: e.target.value })}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Token obtido através do @BotFather no Telegram
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bot_username">Username do Bot</Label>
          <Input
            id="bot_username"
            type="text"
            placeholder="@meu_bot"
            value={config.bot_username}
            onChange={(e) => setConfig({ ...config, bot_username: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Nome de usuário do bot (ex: @meu_bot)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook_url">URL do Webhook</Label>
          <Input
            id="webhook_url"
            type="text"
            placeholder="https://seu-dominio.com/webhook/telegram"
            value={config.webhook_url}
            onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            URL para receber atualizações do Telegram
          </p>
        </div>

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
