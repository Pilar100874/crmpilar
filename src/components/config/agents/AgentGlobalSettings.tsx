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
import { Save, Building2, MessageSquare, Settings2, Shield, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  estabelecimentoId: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Empresa': Building2,
  'Comunicação': MessageSquare,
  'Roteamento': Settings2,
  'Políticas': Shield,
};

export default function AgentGlobalSettings({ estabelecimentoId }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGlobalSettings();
  }, [estabelecimentoId]);

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
      for (const field of GLOBAL_AGENT_SETTINGS) {
        const val = values[field.campo] || '';
        if (!val && !field.obrigatorio) continue;
        
        await supabase
          .from('agent_data_bindings')
          .upsert({
            estabelecimento_id: estabelecimentoId,
            agent_template_key: '_global',
            campo: field.campo,
            label: field.label,
            descricao: field.descricao || null,
            fonte_tipo: 'manual',
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

  const filledCount = GLOBAL_AGENT_SETTINGS.filter(f => values[f.campo]?.trim()).length;
  const requiredCount = GLOBAL_AGENT_SETTINGS.filter(f => f.obrigatorio).length;
  const filledRequired = GLOBAL_AGENT_SETTINGS.filter(f => f.obrigatorio && values[f.campo]?.trim()).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                {catName === 'Políticas' && 'Regras gerais de pagamento e devolução'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {fields.map(field => {
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
