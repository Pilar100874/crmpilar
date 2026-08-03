import React, { useEffect, useState } from 'react';
import { Gauge, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LIMITES_POR_TIPO,
  LIMITE_PADRAO_GLOBAL,
  TIPOS_VEICULO_LIMITE,
  carregarLimitesVelocidade,
  setLimitesVelocidadeConfig,
} from '@/lib/logistica/limitesVelocidade';

interface Props {
  estabelecimentoId: string | null;
}

export const LimitesVelocidadeConfig: React.FC<Props> = ({ estabelecimentoId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [global, setGlobal] = useState<string>(String(LIMITE_PADRAO_GLOBAL));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const cfg = await carregarLimitesVelocidade(estabelecimentoId);
      const iniciais: Record<string, string> = {};
      TIPOS_VEICULO_LIMITE.forEach((t) => {
        const v = cfg.porTipo[t];
        iniciais[t] = v ? String(v) : String(LIMITES_POR_TIPO[t]);
      });
      setValores(iniciais);
      setGlobal(String(cfg.global || LIMITE_PADRAO_GLOBAL));
      setLoading(false);
    })();
  }, [estabelecimentoId]);

  const salvar = async () => {
    if (!estabelecimentoId) {
      toast.error('Estabelecimento não encontrado');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, number> = {};
      TIPOS_VEICULO_LIMITE.forEach((t) => {
        const n = Number(valores[t]);
        if (Number.isFinite(n) && n > 0) payload[t] = Math.round(n);
      });
      const globalNum = Number(global);
      const globalFinal = Number.isFinite(globalNum) && globalNum > 0 ? Math.round(globalNum) : LIMITE_PADRAO_GLOBAL;

      const { error } = await supabase
        .from('logistica_config')
        .update({
          limites_velocidade_tipo: payload,
          limite_velocidade_global: globalFinal,
        } as any)
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;

      setLimitesVelocidadeConfig(payload, globalFinal);
      toast.success('Limites de velocidade salvos');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar limites de velocidade');
    } finally {
      setSaving(false);
    }
  };

  const restaurarPadroes = () => {
    const iniciais: Record<string, string> = {};
    TIPOS_VEICULO_LIMITE.forEach((t) => (iniciais[t] = String(LIMITES_POR_TIPO[t])));
    setValores(iniciais);
    setGlobal(String(LIMITE_PADRAO_GLOBAL));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Limites de velocidade por tipo
        </CardTitle>
        <CardDescription>
          Define a velocidade máxima (km/h) de cada tipo de veículo. A hierarquia usada é:
          limite cadastrado no veículo &gt; limite do tipo &gt; limite global.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TIPOS_VEICULO_LIMITE.map((tipo) => (
                <div key={tipo} className="space-y-1.5">
                  <Label className="text-xs">{tipo}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={valores[tipo] ?? ''}
                    onChange={(e) => setValores((p) => ({ ...p, [tipo]: e.target.value }))}
                    placeholder={String(LIMITES_POR_TIPO[tipo])}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5 max-w-[220px]">
              <Label className="text-xs">Limite global (fallback)</Label>
              <Input
                type="number"
                min={1}
                value={global}
                onChange={(e) => setGlobal(e.target.value)}
                placeholder={String(LIMITE_PADRAO_GLOBAL)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={salvar} disabled={saving} className="flex-1">
                {saving ? 'Salvando…' : 'Salvar limites'}
              </Button>
              <Button type="button" variant="outline" onClick={restaurarPadroes}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Padrões
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
