import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, RotateCcw, Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import {
  TV_VEICULOS_CICLO_PADRAO,
  carregarCicloConfig,
  salvarCicloConfig,
  type TvVeiculosCicloConfig,
} from '@/lib/tv/veiculosCicloConfig';

export default function TvSignageConfigVeiculos() {
  const [config, setConfig] = useState<TvVeiculosCicloConfig>(TV_VEICULOS_CICLO_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarCicloConfig()
      .then(setConfig)
      .finally(() => setCarregando(false));
  }, []);

  const setNum = (campo: keyof TvVeiculosCicloConfig, valor: string, min: number, max: number) => {
    const n = Math.max(min, Math.min(max, Number(valor) || min));
    setConfig(prev => ({ ...prev, [campo]: n }));
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarCicloConfig(config);
      toast.success('Configurações salvas. As TVs aplicam na próxima atualização.');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar as configurações');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-primary" />
            Modo autônomo — TV Veículos
          </CardTitle>
          <CardDescription>
            Ajuste os tempos do ciclo automático exibido nas TVs (sem mouse ou teclado).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="font-medium">Ciclo automático ativo</p>
              <p className="text-sm text-muted-foreground">
                Alterna sozinho entre visão geral e foco em cada veículo.
              </p>
            </div>
            <Switch
              checked={config.autonomo_ativo}
              onCheckedChange={v => setConfig(prev => ({ ...prev, autonomo_ativo: v }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="overview">Visão geral (segundos)</Label>
              <Input
                id="overview"
                type="number"
                min={5}
                max={600}
                value={config.overview_segundos}
                onChange={e => setNum('overview_segundos', e.target.value, 5, 600)}
              />
              <p className="text-xs text-muted-foreground">Tempo com todos os veículos enquadrados no mapa.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="foco">Foco por veículo (segundos)</Label>
              <Input
                id="foco"
                type="number"
                min={3}
                max={600}
                value={config.foco_segundos}
                onChange={e => setNum('foco_segundos', e.target.value, 3, 600)}
              />
              <p className="text-xs text-muted-foreground">Tempo de zoom em cada veículo antes de passar ao próximo.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trilha">Duração da trilha (minutos)</Label>
              <Input
                id="trilha"
                type="number"
                min={0}
                max={480}
                value={config.trilha_minutos}
                onChange={e => setNum('trilha_minutos', e.target.value, 0, 480)}
              />
              <p className="text-xs text-muted-foreground">Histórico recente desenhado no mapa durante o foco (0 desliga).</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pausa">Pausa após interação (segundos)</Label>
              <Input
                id="pausa"
                type="number"
                min={0}
                max={3600}
                value={config.pausa_interacao_segundos}
                onChange={e => setNum('pausa_interacao_segundos', e.target.value, 0, 3600)}
              />
              <p className="text-xs text-muted-foreground">Se alguém tocar/clicar, o ciclo pausa por este tempo.</p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Modo quiosque</p>
                <p className="text-sm text-muted-foreground">
                  Tela cheia, sem cursor nem controles clicáveis, com bloqueio de scroll, zoom e atalhos.
                </p>
              </div>
              <Switch
                checked={config.quiosque_ativo}
                onCheckedChange={v => setConfig(prev => ({ ...prev, quiosque_ativo: v }))}
              />
            </div>
            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="pausaFalha">Pausa após falha (segundos)</Label>
              <Input
                id="pausaFalha"
                type="number"
                min={10}
                max={3600}
                value={config.pausa_falha_segundos}
                onChange={e => setNum('pausa_falha_segundos', e.target.value, 10, 3600)}
                disabled={!config.quiosque_ativo}
              />
              <p className="text-xs text-muted-foreground">
                Se ocorrer erro ou queda de rede, o ciclo automático pausa por este tempo e retoma sozinho.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={salvar} disabled={salvando} className="gap-2">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfig(TV_VEICULOS_CICLO_PADRAO)}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar padrão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
