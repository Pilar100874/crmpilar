import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface NotificacoesCRUDProps {
  estabelecimentoId?: string;
}

export const NotificacoesCRUD = ({ estabelecimentoId }: NotificacoesCRUDProps) => {
  const [config, setConfig] = useState({
    nova_conversa_enabled: true,
    campanha_concluida_enabled: true,
    erros_sistema_enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, [estabelecimentoId]);

  const fetchConfig = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) return;

    const { data, error } = await supabase
      .from("notificacoes_config")
      .select("*")
      .eq("estabelecimento_id", estabId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setConfig({
        nova_conversa_enabled: data.nova_conversa_enabled,
        campanha_concluida_enabled: data.campanha_concluida_enabled,
        erros_sistema_enabled: data.erros_sistema_enabled,
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);

    const estabId = await getEstabelecimentoId();
    if (!estabId) {
      toast({
        title: "Erro",
        description: "Estabelecimento não identificado",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("notificacoes_config")
      .select("id")
      .eq("estabelecimento_id", estabId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("notificacoes_config")
        .update(config)
        .eq("estabelecimento_id", estabId));
    } else {
      ({ error } = await supabase
        .from("notificacoes_config")
        .insert([{ estabelecimento_id: estabId, ...config }]));
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
          <p className="font-medium">Nova conversa</p>
          <p className="text-sm text-muted-foreground">Alertar ao receber mensagem</p>
        </div>
        <Switch 
          checked={config.nova_conversa_enabled}
          onCheckedChange={(checked) => setConfig({ ...config, nova_conversa_enabled: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Campanha concluída</p>
          <p className="text-sm text-muted-foreground">Notificar término de envio</p>
        </div>
        <Switch 
          checked={config.campanha_concluida_enabled}
          onCheckedChange={(checked) => setConfig({ ...config, campanha_concluida_enabled: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Erros do sistema</p>
          <p className="text-sm text-muted-foreground">Alertar falhas críticas</p>
        </div>
        <Switch 
          checked={config.erros_sistema_enabled}
          onCheckedChange={(checked) => setConfig({ ...config, erros_sistema_enabled: checked })}
        />
      </div>
      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};
