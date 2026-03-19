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
  vox: 'Extraia insights da voz do cliente: dores, desejos, objeções, frases literais, padrões emocionais e linguagem recorrente.',
  cipher: 'Analise a concorrência: promessas dominantes, mecanismos, ângulos de anúncio, posicionamento e lacunas estratégicas.',
  positioning: 'Crie o posicionamento: ICP, problema central, resultado desejado, mecanismo único, big idea, oferta e diferenciação.',
  funnel: 'Desenhe o funil: fontes de tráfego, etapas, ativos necessários e lógica de conversão.',
  vsl: 'Crie roteiro de VSL: hook, problema, descoberta, mecanismo, prova, oferta e CTA.',
  landing_page: 'Crie estrutura da landing page: hero, problema, solução, mecanismo, prova, depoimentos, oferta, FAQ e CTA.',
  creative: 'Gere conceitos de criativos: hooks, conceitos, ângulos de campanha e ideias de anúncios.',
  email: 'Crie sequências de email: boas-vindas, nutrição, quebra de objeções e conversão.',
  reel: 'Crie scripts de Reels/TikTok: hook, desenvolvimento e CTA para cada vídeo curto.',
};

export function StrategyAdminPanel() {
  const [configs, setConfigs] = useState<Record<string, { prompt: string; active: boolean; saved: boolean }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, { prompt: string; active: boolean; saved: boolean }> = {};
    AGENT_ORDER.forEach(key => {
      initial[key] = { prompt: DEFAULT_PROMPTS[key] || '', active: true, saved: true };
    });
    setConfigs(initial);
  }, []);

  const handleSave = async (agentKey: string) => {
    setSaving(agentKey);
    // In a real implementation, save to strategy_agent_configs table
    await new Promise(r => setTimeout(r, 500));
    setConfigs(prev => ({ ...prev, [agentKey]: { ...prev[agentKey], saved: true } }));
    toast.success(`Configuração do ${AGENT_INFO[agentKey]?.name} salva`);
    setSaving(null);
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Configuração dos Agentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Edite os prompts, ative/desative agentes e configure a lógica de execução.
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
                        [agentKey]: { prompt: DEFAULT_PROMPTS[agentKey], active: true, saved: false }
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
