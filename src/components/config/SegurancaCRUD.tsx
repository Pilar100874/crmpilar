import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface SegurancaCRUDProps {
  estabelecimentoId?: string;
}

export const SegurancaCRUD = ({ estabelecimentoId }: SegurancaCRUDProps) => {
  const [config, setConfig] = useState({
    retencao_dados_dias: 90,
    consentimento_obrigatorio: true,
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
      .from("seguranca_config")
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
        retencao_dados_dias: data.retencao_dados_dias,
        consentimento_obrigatorio: data.consentimento_obrigatorio,
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
      .from("seguranca_config")
      .select("id")
      .eq("estabelecimento_id", estabId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("seguranca_config")
        .update(config)
        .eq("estabelecimento_id", estabId));
    } else {
      ({ error } = await supabase
        .from("seguranca_config")
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
        <div className="flex-1 mr-4">
          <Label htmlFor="retencao">Retenção de dados (dias)</Label>
          <Input 
            id="retencao"
            type="number"
            min="1"
            value={config.retencao_dados_dias}
            onChange={(e) => setConfig({ ...config, retencao_dados_dias: parseInt(e.target.value) || 90 })}
            className="mt-2"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Consentimento obrigatório</p>
          <p className="text-sm text-muted-foreground">Exigir opt-in para campanhas</p>
        </div>
        <Switch 
          checked={config.consentimento_obrigatorio}
          onCheckedChange={(checked) => setConfig({ ...config, consentimento_obrigatorio: checked })}
        />
      </div>
      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};
