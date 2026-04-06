import { useState, useEffect, useMemo } from 'react';
import { GLOBAL_AGENT_SETTINGS, AgentDataField } from '@/constants/agentDataRequirements';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, Building2, MessageSquare, Settings2, Shield, Loader2, CheckCircle2, Database } from 'lucide-react';

interface Props {
  estabelecimentoId: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Empresa': Building2,
  'Comunicação': MessageSquare,
  'Roteamento': Settings2,
  'Políticas': Shield,
};

interface TipoPagamento {
  id: string;
  nome: string;
  taxa_percentual: number | null;
  ativo: boolean;
}

interface CondicaoPagamento {
  id: string;
  nome: string;
  descricao: string | null;
  valor_minimo: number | null;
  valor_maximo: number | null;
  tipo_pagamento_id: string | null;
  ativo: boolean;
}

export default function AgentGlobalSettings({ estabelecimentoId }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tiposPagamento, setTiposPagamento] = useState<TipoPagamento[]>([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState<CondicaoPagamento[]>([]);

  useEffect(() => {
    loadGlobalSettings();
    loadPaymentData();
  }, [estabelecimentoId]);

  const loadPaymentData = async () => {
    const [tiposRes, condicoesRes] = await Promise.all([
      supabase.from('tipos_pagamento').select('*').eq('estabelecimento_id', estabelecimentoId).eq('ativo', true).order('nome'),
      supabase.from('condicoes_pagamento').select('*').eq('estabelecimento_id', estabelecimentoId).eq('ativo', true).order('nome'),
    ]);
    if (tiposRes.data) setTiposPagamento(tiposRes.data as any);
    if (condicoesRes.data) setCondicoesPagamento(condicoesRes.data as any);
  };

  const loadGlobalSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('agent_data_bindings')
      .select('campo, valor_manual')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('agent_template_key', '_global');

    if (data) {
      const vals: Record<string, string> = {};
      data.forEach((d: any) => {
        if (d.valor_manual) vals[d.campo] = d.valor_manual;
      });
      setValues(vals);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build auto-generated values for sistema_auto fields
      const formasAutoText = tiposPagamento.length > 0
        ? tiposPagamento.map(t => `${t.nome}${t.taxa_percentual ? ` (juros: ${t.taxa_percentual}%)` : ''}`).join(', ')
        : '';
      const prazosAutoText = condicoesPagamento.length > 0
        ? condicoesPagamento.map(c => {
            const parts = [c.nome];
            if (c.descricao) parts.push(`- ${c.descricao}`);
            if (c.valor_minimo != null || c.valor_maximo != null) {
              const faixa = [];
              if (c.valor_minimo != null) faixa.push(`mín R$${Number(c.valor_minimo).toLocaleString('pt-BR')}`);
              if (c.valor_maximo != null) faixa.push(`máx R$${Number(c.valor_maximo).toLocaleString('pt-BR')}`);
              parts.push(`(${faixa.join(', ')})`);
            }
            return parts.join(' ');
          }).join(' | ')
        : '';

      const autoValues: Record<string, string> = {
        formas_pagamento: formasAutoText,
        prazos_pagamento: prazosAutoText,
      };

      for (const field of GLOBAL_AGENT_SETTINGS) {
        const val = field.tipo === 'sistema_auto' ? (autoValues[field.campo] || '') : (values[field.campo] || '');
        if (!val && !field.obrigatorio) continue;
        
        await supabase
          .from('agent_data_bindings')
          .upsert({
            estabelecimento_id: estabelecimentoId,
            agent_template_key: '_global',
            campo: field.campo,
            label: field.label,
            descricao: field.descricao || null,
            fonte_tipo: field.tipo === 'sistema_auto' ? 'sistema' : 'manual',
            valor_manual: val,
            configurado: !!val,
          }, { onConflict: 'estabelecimento_id,agent_template_key,campo' });
      }
      toast.success('Configurações globais salvas!');
    } catch (err) {
      toast.error('Erro ao salvar configurações');
    }
    setSaving(false);
  };

  const categories = useMemo(() => {
    const cats: Record<string, AgentDataField[]> = {};
    GLOBAL_AGENT_SETTINGS.forEach(f => {
      if (!cats[f.categoria]) cats[f.categoria] = [];
      cats[f.categoria].push(f);
    });
    return cats;
  }, []);

  const filledCount = GLOBAL_AGENT_SETTINGS.filter(f => {
    if (f.tipo === 'sistema_auto') {
      if (f.campo === 'formas_pagamento') return tiposPagamento.length > 0;
      if (f.campo === 'prazos_pagamento') return condicoesPagamento.length > 0;
    }
    return values[f.campo]?.trim();
  }).length;
  const requiredCount = GLOBAL_AGENT_SETTINGS.filter(f => f.obrigatorio).length;
  const filledRequired = GLOBAL_AGENT_SETTINGS.filter(f => {
    if (!f.obrigatorio) return false;
    if (f.tipo === 'sistema_auto') {
      if (f.campo === 'formas_pagamento') return tiposPagamento.length > 0;
      if (f.campo === 'prazos_pagamento') return condicoesPagamento.length > 0;
    }
    return values[f.campo]?.trim();
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderSistemaAutoField = (field: AgentDataField) => {
    if (field.campo === 'formas_pagamento') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">Dados do sistema (automático)</span>
          </div>
          {tiposPagamento.length > 0 ? (
            <div className="bg-muted/50 rounded-md p-3 space-y-1.5">
              {tiposPagamento.map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t.nome}</span>
                  {t.taxa_percentual != null && t.taxa_percentual > 0 && (
                    <Badge variant="outline" className="text-xs">Juros: {t.taxa_percentual}%</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhuma forma de pagamento cadastrada. Cadastre em Vendas → Configurações.</p>
          )}
        </div>
      );
    }

    if (field.campo === 'prazos_pagamento') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">Dados do sistema (automático)</span>
          </div>
          {condicoesPagamento.length > 0 ? (
            <div className="bg-muted/50 rounded-md p-3 space-y-2">
              {condicoesPagamento.map(c => {
                const tipo = tiposPagamento.find(t => t.id === c.tipo_pagamento_id);
                return (
                  <div key={c.id} className="text-sm border-b border-border/50 last:border-0 pb-1.5 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.nome}</span>
                      {tipo && <Badge variant="secondary" className="text-xs">{tipo.nome}</Badge>}
                    </div>
                    {c.descricao && <p className="text-xs text-muted-foreground">{c.descricao}</p>}
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      {c.valor_minimo != null && <span>Mín: R$ {Number(c.valor_minimo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                      {c.valor_maximo != null && <span>Máx: R$ {Number(c.valor_maximo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhuma condição de pagamento cadastrada. Cadastre em Vendas → Configurações.</p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Configurações Globais dos Agentes</h3>
          <p className="text-sm text-muted-foreground">
            Dados compartilhados por todos os agentes de IA — empresa, comunicação e políticas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            <Badge variant={filledRequired === requiredCount ? 'default' : 'secondary'}>
              {filledCount}/{GLOBAL_AGENT_SETTINGS.length} preenchidos
            </Badge>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      {Object.entries(categories).map(([catName, fields]) => {
        const Icon = CATEGORY_ICONS[catName] || Settings2;
        return (
          <Card key={catName}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {catName}
              </CardTitle>
              <CardDescription className="text-xs">
                {catName === 'Empresa' && 'Informações da sua empresa usadas por todos os agentes'}
                {catName === 'Comunicação' && 'Mensagens padrão enviadas aos clientes (saudação, espera, etc.)'}
                {catName === 'Roteamento' && 'Configurações de tempo e confiança do orquestrador'}
                {catName === 'Políticas' && 'Regras de pagamento (automáticas do sistema) e devolução'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {fields.map(field => {
                  if (field.tipo === 'sistema_auto') {
                    return (
                      <div key={field.campo} className="md:col-span-2">
                        <Label className="text-sm flex items-center gap-1.5 mb-1.5">
                          {field.label}
                          {field.obrigatorio && <span className="text-destructive">*</span>}
                          {((field.campo === 'formas_pagamento' && tiposPagamento.length > 0) ||
                            (field.campo === 'prazos_pagamento' && condicoesPagamento.length > 0)) && (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          )}
                        </Label>
                        <p className="text-xs text-muted-foreground mb-1">{field.descricao}</p>
                        {renderSistemaAutoField(field)}
                      </div>
                    );
                  }

                  const isLong = field.tipo === 'texto' && (
                    field.campo.includes('saudacao') || 
                    field.campo.includes('mensagem') || 
                    field.campo.includes('politica') ||
                    field.campo.includes('diferenciais') ||
                    field.campo.includes('prazos') ||
                    field.campo.includes('formas')
                  );
                  const isFilled = !!values[field.campo]?.trim();
                  
                  return (
                    <div key={field.campo} className={isLong ? 'md:col-span-2' : ''}>
                      <Label className="text-sm flex items-center gap-1.5 mb-1.5">
                        {field.label}
                        {field.obrigatorio && <span className="text-destructive">*</span>}
                        {isFilled && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                      </Label>
                      <p className="text-xs text-muted-foreground mb-1">{field.descricao}</p>
                      {isLong ? (
                        <Textarea
                          value={values[field.campo] || ''}
                          onChange={e => setValues(prev => ({ ...prev, [field.campo]: e.target.value }))}
                          placeholder={field.exemplo || ''}
                          rows={2}
                          className="text-sm"
                        />
                      ) : (
                        <Input
                          type={field.tipo === 'numero' ? 'number' : 'text'}
                          value={values[field.campo] || ''}
                          onChange={e => setValues(prev => ({ ...prev, [field.campo]: e.target.value }))}
                          placeholder={field.exemplo || ''}
                          className="text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
