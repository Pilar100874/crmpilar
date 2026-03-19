import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AGENT_INFO, AGENT_ORDER } from './types';
import { Save, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_PROMPTS: Record<string, string> = {
  vox: 'Pesquisador sênior de VOC. Extraia dores (funcionais, emocionais, sociais), desejos concretos, objeções reais de compra, frases literais autênticas, padrões emocionais, linguagem do nicho, nível de consciência (Schwartz) e gatilhos de decisão. Mínimo 7 itens por campo. Nunca genérico.',
  cipher: 'Analista de inteligência competitiva. Mapeie promessas dominantes (com frequência e eficácia), mecanismos dos concorrentes (proprietários ou commodity), ângulos de anúncio (com saturação), lacunas estratégicas acionáveis, tendências emergentes, pontos fracos exploráveis e benchmark de preços.',
  positioning: 'Estrategista de posicionamento (Al Ries + April Dunford + Hormozi). Defina ICP granular, problema raiz (5 porquês), mecanismo único nomeado (derivado das lacunas do Cipher), big idea contraintuitiva, stack de oferta com valor 10x, garantia de inversão de risco e tom de marca.',
  funnel: 'Engenheiro de funis com unit economics. Selecione tipo de funil (justificado pelo nível de consciência), fontes de tráfego com CPC estimado, etapas com taxas realistas (cold→LP 15-35%, LP→lead 20-40%), retargeting, KPIs e cronograma de implantação.',
  vsl: 'Copywriter sênior de VSL (Jon Benson + Stefan Georgi). Estrutura PASCA completa: hook que retém 70%+, problema na linguagem do Vox, agitação com consequências, mecanismo com analogias, stack de oferta, garantia e CTA. Inclua loops abertos e instruções de gravação [pausa] [ênfase].',
  landing_page: 'Especialista em CRO e UX persuasiva. Estruture: hero com headline magnética (da big idea), problema-espelho, solução-mecanismo em passos, prova social com resultados mensuráveis, stack de oferta visual, FAQ baseado em objeções reais do Vox, 3+ CTAs ao longo da página.',
  creative: 'Diretor criativo de performance. Crie 5+ hooks variados (curiosidade, dor, resultado, contraintuitivo, UGC), 5+ conceitos criativos multi-formato, 4+ ângulos de campanha e 8+ ideias de anúncio prontas por plataforma e etapa de funil.',
  email: 'Especialista em automação (Chaperon + Ben Settle). Crie 5 sequências: boas-vindas (indoctrination), nutrição (soap opera com ganchos), quebra de objeções, conversão (urgência progressiva) e pós-venda. Subject lines <50 chars, 1 CTA por email, linguagem real do cliente.',
  reel: 'Roteirista de vídeos curtos de alta retenção. Crie 8+ scripts em 7 categorias (dor, contraintuitivo, tutorial, storytelling, trend, prova, objeção). Hook em 1.5s, instruções visuais detalhadas, hashtags estratégicas e calendário de publicação.',
};

interface AgentConfig {
  prompt: string;
  active: boolean;
  saved: boolean;
  dbId?: string;
}

export function StrategyAdminPanel() {
  const [configs, setConfigs] = useState<Record<string, AgentConfig>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load configs from database
  useEffect(() => {
    const loadConfigs = async () => {
      const initial: Record<string, AgentConfig> = {};
      AGENT_ORDER.forEach(key => {
        initial[key] = { prompt: DEFAULT_PROMPTS[key] || '', active: true, saved: true };
      });

      const { data } = await supabase
        .from('strategy_agent_configs')
        .select('*')
        .order('created_at');

      if (data) {
        for (const row of data as any[]) {
          if (initial[row.agent_type]) {
            initial[row.agent_type] = {
              prompt: row.system_prompt || DEFAULT_PROMPTS[row.agent_type],
              active: row.is_active ?? true,
              saved: true,
              dbId: row.id
            };
          }
        }
      }

      setConfigs(initial);
      setLoading(false);
    };
    loadConfigs();
  }, []);

  const handleSave = async (agentKey: string) => {
    setSaving(agentKey);
    const config = configs[agentKey];

    try {
      if (config.dbId) {
        // Update existing
        await supabase
          .from('strategy_agent_configs')
          .update({
            system_prompt: config.prompt,
            is_active: config.active
          } as any)
          .eq('id', config.dbId);
      } else {
        // Insert new
        const info = AGENT_INFO[agentKey];
        const { data } = await supabase
          .from('strategy_agent_configs')
          .insert({
            agent_type: agentKey,
            agent_name: info?.name || agentKey,
            system_prompt: config.prompt,
            is_active: config.active
          } as any)
          .select()
          .single();

        if (data) {
          setConfigs(prev => ({
            ...prev,
            [agentKey]: { ...prev[agentKey], dbId: (data as any).id }
          }));
        }
      }

      setConfigs(prev => ({ ...prev, [agentKey]: { ...prev[agentKey], saved: true } }));
      toast.success(`Configuração do ${AGENT_INFO[agentKey]?.name} salva`);
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Configuração dos Agentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Edite os prompts, ative/desative agentes e configure a lógica de execução. As alterações são salvas no banco.
          </p>
        </CardContent>
      </Card>

      <ScrollArea className="h-[600px] pr-2">
        <div className="space-y-3">
          {AGENT_ORDER.map((agentKey, index) => {
            const info = AGENT_INFO[agentKey];
            const config = configs[agentKey] || { prompt: '', active: true, saved: true };

            return (
              <Card key={agentKey}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{info.icon}</span>
                      <CardTitle className="text-sm">{info.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                      {config.dbId && <Badge variant="secondary" className="text-[10px]">Salvo</Badge>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Ativo</span>
                        <Switch
                          checked={config.active}
                          onCheckedChange={v => setConfigs(prev => ({
                            ...prev,
                            [agentKey]: { ...prev[agentKey], active: v, saved: false }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <Textarea
                    value={config.prompt}
                    onChange={e => setConfigs(prev => ({
                      ...prev,
                      [agentKey]: { ...prev[agentKey], prompt: e.target.value, saved: false }
                    }))}
                    rows={3}
                    className="text-xs"
                    placeholder="Instruções do agente..."
                  />
                  <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfigs(prev => ({
                        ...prev,
                        [agentKey]: { ...prev[agentKey], prompt: DEFAULT_PROMPTS[agentKey], active: true, saved: false }
                      }))}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Resetar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSave(agentKey)}
                      disabled={config.saved || saving === agentKey}
                    >
                      {saving === agentKey ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
