import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CanaisAtendimentoCRUDProps {
  estabelecimentoId: string;
}

export const CanaisAtendimentoCRUD = ({ estabelecimentoId }: CanaisAtendimentoCRUDProps) => {
  const [config, setConfig] = useState({
    whatsapp_enabled: true,
    telegram_enabled: false,
    webchat_enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, [estabelecimentoId]);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from("canais_atendimento")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setConfig({
        whatsapp_enabled: data.whatsapp_enabled,
        telegram_enabled: data.telegram_enabled,
        webchat_enabled: data.webchat_enabled,
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);

    const { data: existing } = await supabase
      .from("canais_atendimento")
      .select("id")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("canais_atendimento")
        .update(config)
        .eq("estabelecimento_id", estabelecimentoId));
    } else {
      ({ error } = await supabase
        .from("canais_atendimento")
        .insert([{ estabelecimento_id: estabelecimentoId, ...config }]));
    }

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Configurações salvas com sucesso!" });
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">WhatsApp</p>
          <p className="text-sm text-muted-foreground">Meta Cloud API</p>
        </div>
        <Switch 
          checked={config.whatsapp_enabled}
          onCheckedChange={(checked) => setConfig({ ...config, whatsapp_enabled: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Telegram</p>
          <p className="text-sm text-muted-foreground">Bot API</p>
        </div>
        <Switch 
          checked={config.telegram_enabled}
          onCheckedChange={(checked) => setConfig({ ...config, telegram_enabled: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Web Chat</p>
          <p className="text-sm text-muted-foreground">Widget incorporado</p>
        </div>
        <Switch 
          checked={config.webchat_enabled}
          onCheckedChange={(checked) => setConfig({ ...config, webchat_enabled: checked })}
        />
      </div>
      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};
