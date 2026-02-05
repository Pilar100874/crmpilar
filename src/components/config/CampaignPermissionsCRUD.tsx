import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Zap,
  Info,
  Save,
  Play,
  Filter,
  Gauge,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { toast } from '@/lib/toast-config';
import { useQuery } from '@tanstack/react-query';

interface CampaignPermission {
  id?: string;
  estabelecimento_id: string;
  nome: string;
  last_contact_days: number;
  only_replied: boolean;
  optin_required: boolean;
  min_score: number;
  allowed_tags: string[];
  blocked_tags: string[];
  max_per_day: number;
  max_per_hour: number;
  delay_min_seconds: number;
  delay_max_seconds: number;
  randomize_text: boolean;
  include_media: boolean;
  stop_if_low_response: number;
  stop_if_blocks: number;
  risk_score: number;
  risk_level: string;
  is_active: boolean;
}

const defaultPermission: Omit<CampaignPermission, 'id' | 'estabelecimento_id'> = {
  nome: 'Configuração Padrão',
  last_contact_days: 30,
  only_replied: false,
  optin_required: true,
  min_score: 0,
  allowed_tags: [],
  blocked_tags: [],
  max_per_day: 100,
  max_per_hour: 20,
  delay_min_seconds: 30,
  delay_max_seconds: 120,
  randomize_text: true,
  include_media: false,
  stop_if_low_response: 10,
  stop_if_blocks: 3,
  risk_score: 0,
  risk_level: 'low',
  is_active: true
};

export function CampaignPermissionsCRUD() {
  const [permission, setPermission] = useState<CampaignPermission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const { data: estabelecimentoId } = useQuery({
    queryKey: ['user-estabelecimento-permissions'],
    queryFn: async () => {
      return await getEstabelecimentoId();
    }
  });

  useEffect(() => {
    if (estabelecimentoId) {
      loadPermission();
      loadTags();
    }
  }, [estabelecimentoId]);

  useEffect(() => {
    if (permission && estabelecimentoId) {
      calculateRisk();
      loadEligibleContacts();
    }
  }, [permission?.last_contact_days, permission?.only_replied, permission?.optin_required, permission?.min_score, permission?.allowed_tags, permission?.blocked_tags, permission?.max_per_day, permission?.max_per_hour, permission?.delay_min_seconds]);

  const loadPermission = async () => {
    if (!estabelecimentoId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaign_permissions')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPermission({
          id: data.id,
          estabelecimento_id: data.estabelecimento_id,
          nome: data.nome || 'Configuração Padrão',
          last_contact_days: data.last_contact_days ?? 30,
          only_replied: data.only_replied ?? false,
          optin_required: data.optin_required ?? true,
          min_score: data.min_score ?? 0,
          allowed_tags: data.allowed_tags || [],
          blocked_tags: data.blocked_tags || [],
          max_per_day: data.max_per_day ?? 100,
          max_per_hour: data.max_per_hour ?? 20,
          delay_min_seconds: data.delay_min_seconds ?? 30,
          delay_max_seconds: data.delay_max_seconds ?? 120,
          randomize_text: data.randomize_text ?? true,
          include_media: data.include_media ?? false,
          stop_if_low_response: data.stop_if_low_response ?? 10,
          stop_if_blocks: data.stop_if_blocks ?? 3,
          risk_score: data.risk_score ?? 0,
          risk_level: data.risk_level || 'low',
          is_active: data.is_active ?? true
        });
      } else {
        setPermission({
          ...defaultPermission,
          estabelecimento_id: estabelecimentoId
        });
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setPermission({
        ...defaultPermission,
        estabelecimento_id: estabelecimentoId || ''
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    if (!estabelecimentoId) return;
    try {
      const { data } = await supabase
        .from('chat_tags')
        .select('nome')
        .eq('estabelecimento_id', estabelecimentoId);
      
      if (data) {
        setAvailableTags(data.map(t => t.nome));
      }
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  };

  const loadEligibleContacts = async () => {
    if (!permission || !estabelecimentoId) return;

    try {
      setLoadingCount(true);

      let query = supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabelecimentoId);

      const { count, error } = await query;

      if (error) throw error;
      setEligibleCount(count || 0);
    } catch (error) {
      console.error('Erro ao contar contatos:', error);
      setEligibleCount(null);
    } finally {
      setLoadingCount(false);
    }
  };

  const calculateRisk = () => {
    if (!permission) return;

    let riskScore = 0;

    if (permission.max_per_hour > 50) riskScore += 30;
    else if (permission.max_per_hour > 30) riskScore += 20;
    else if (permission.max_per_hour > 20) riskScore += 10;

    if (permission.max_per_day > 500) riskScore += 25;
    else if (permission.max_per_day > 200) riskScore += 15;
    else if (permission.max_per_day > 100) riskScore += 5;

    if (permission.delay_min_seconds < 15) riskScore += 20;
    else if (permission.delay_min_seconds < 30) riskScore += 10;

    if (!permission.randomize_text) riskScore += 15;
    if (!permission.optin_required) riskScore += 20;
    if (permission.last_contact_days > 90) riskScore += 10;

    let riskLevel = 'low';
    if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    setPermission(prev => prev ? { ...prev, risk_score: riskScore, risk_level: riskLevel } : null);
  };

  const handleSave = async () => {
    if (!permission || !estabelecimentoId) return;

    try {
      setSaving(true);

      const dataToSave = {
        estabelecimento_id: estabelecimentoId,
        nome: permission.nome,
        last_contact_days: permission.last_contact_days,
        only_replied: permission.only_replied,
        optin_required: permission.optin_required,
        min_score: permission.min_score,
        allowed_tags: permission.allowed_tags,
        blocked_tags: permission.blocked_tags,
        max_per_day: permission.max_per_day,
        max_per_hour: permission.max_per_hour,
        delay_min_seconds: permission.delay_min_seconds,
        delay_max_seconds: permission.delay_max_seconds,
        randomize_text: permission.randomize_text,
        include_media: permission.include_media,
        stop_if_low_response: permission.stop_if_low_response,
        stop_if_blocks: permission.stop_if_blocks,
        risk_score: permission.risk_score,
        risk_level: permission.risk_level,
        is_active: permission.is_active
      };

      if (permission.id) {
        const { error } = await supabase
          .from('campaign_permissions')
          .update(dataToSave)
          .eq('id', permission.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('campaign_permissions')
          .insert([dataToSave])
          .select()
          .single();
        if (error) throw error;
        setPermission({ ...permission, id: data.id });
      }

      toast.success('Regras salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar regras');
    } finally {
      setSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!permission || permission.risk_level === 'high') {
      toast.error('Não é possível executar com risco alto. Ajuste os parâmetros.');
      return;
    }

    toast.info('Executando campanha no n8n...');
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-emerald-600 dark:text-emerald-400';
      case 'medium': return 'text-amber-600 dark:text-amber-400';
      case 'high': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'medium': return 'bg-amber-500/10 border-amber-500/30';
      case 'high': return 'bg-destructive/10 border-destructive/30';
      default: return 'bg-muted';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case 'medium': return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'high': return <Shield className="h-5 w-5 text-destructive" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Seguro';
      case 'medium': return 'Médio';
      case 'high': return 'Alto Risco';
      default: return 'Desconhecido';
    }
  };

  const estimatedTime = useMemo(() => {
    if (!permission || !eligibleCount) return null;
    
    const avgDelay = (permission.delay_min_seconds + permission.delay_max_seconds) / 2;
    const totalSeconds = eligibleCount * avgDelay;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }, [permission, eligibleCount]);

  const generateSQLPreview = () => {
    if (!permission) return '';
    
    const conditions = [];
    conditions.push(`estabelecimento_id = '${estabelecimentoId}'`);
    
    if (permission.optin_required) {
      conditions.push(`opt_in_whatsapp = true`);
    }
    
    if (permission.last_contact_days > 0) {
      conditions.push(`ultimo_contato >= NOW() - INTERVAL '${permission.last_contact_days} days'`);
    }
    
    if (permission.only_replied) {
      conditions.push(`tem_resposta_anterior = true`);
    }
    
    if (permission.min_score > 0) {
      conditions.push(`score_engajamento >= ${permission.min_score}`);
    }
    
    return `SELECT * FROM customers\nWHERE ${conditions.join('\n  AND ')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!permission) return null;

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 pr-4">
        {/* Header com indicador de risco */}
        <div className={`flex items-center justify-between p-4 rounded-lg border ${getRiskBgColor(permission.risk_level)}`}>
          <div className="flex items-center gap-3">
            {getRiskIcon(permission.risk_level)}
            <div>
              <h3 className={`font-semibold ${getRiskColor(permission.risk_level)}`}>
                {getRiskLabel(permission.risk_level)}
              </h3>
              <p className="text-sm text-muted-foreground">
                Score de risco: {permission.risk_score}/100
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {eligibleCount !== null && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Contatos elegíveis</p>
                <p className="text-2xl font-bold">{eligibleCount.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BLOCO 1 - Filtro de Contatos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtro de Contatos
              </CardTitle>
              <CardDescription>
                Defina quais contatos podem receber mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Último contato em até (dias)</span>
                  <Badge variant="outline">{permission.last_contact_days} dias</Badge>
                </Label>
                <Slider
                  value={[permission.last_contact_days]}
                  onValueChange={([v]) => setPermission({ ...permission, last_contact_days: v })}
                  min={7}
                  max={180}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>7 dias</span>
                  <span>180 dias</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Score mínimo de engajamento</span>
                  <Badge variant="outline">{permission.min_score}</Badge>
                </Label>
                <Slider
                  value={[permission.min_score]}
                  onValueChange={([v]) => setPermission({ ...permission, min_score: v })}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="only-replied" className="flex items-center gap-2">
                    <Checkbox
                      id="only-replied"
                      checked={permission.only_replied}
                      onCheckedChange={(checked) => 
                        setPermission({ ...permission, only_replied: checked as boolean })
                      }
                    />
                    Somente quem já respondeu
                  </Label>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="optin-required" className="flex items-center gap-2">
                    <Checkbox
                      id="optin-required"
                      checked={permission.optin_required}
                      onCheckedChange={(checked) => 
                        setPermission({ ...permission, optin_required: checked as boolean })
                      }
                    />
                    Somente Opt-in WhatsApp
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Recomendado para evitar bloqueios</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {availableTags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Tags Permitidas</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => (
                        <Badge
                          key={tag}
                          variant={permission.allowed_tags.includes(tag) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const newTags = permission.allowed_tags.includes(tag)
                              ? permission.allowed_tags.filter(t => t !== tag)
                              : [...permission.allowed_tags, tag];
                            setPermission({ ...permission, allowed_tags: newTags });
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tags Bloqueadas</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => (
                        <Badge
                          key={tag}
                          variant={permission.blocked_tags.includes(tag) ? 'destructive' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const newTags = permission.blocked_tags.includes(tag)
                              ? permission.blocked_tags.filter(t => t !== tag)
                              : [...permission.blocked_tags, tag];
                            setPermission({ ...permission, blocked_tags: newTags });
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Preview da Query SQL
                </Label>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {generateSQLPreview()}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* BLOCO 2 - Limites de Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Limites de Segurança
              </CardTitle>
              <CardDescription>
                Configure limites para proteger seu número
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Máximo por dia</Label>
                  <Input
                    type="number"
                    value={permission.max_per_day}
                    onChange={(e) => setPermission({ ...permission, max_per_day: parseInt(e.target.value) || 0 })}
                    min={1}
                    max={1000}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máximo por hora</Label>
                  <Input
                    type="number"
                    value={permission.max_per_hour}
                    onChange={(e) => setPermission({ ...permission, max_per_hour: parseInt(e.target.value) || 0 })}
                    min={1}
                    max={100}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-semibold">Delay entre envios (Randomizado)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Mínimo (segundos)</Label>
                    <Input
                      type="number"
                      value={permission.delay_min_seconds}
                      onChange={(e) => setPermission({ ...permission, delay_min_seconds: parseInt(e.target.value) || 0 })}
                      min={5}
                      max={300}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Máximo (segundos)</Label>
                    <Input
                      type="number"
                      value={permission.delay_max_seconds}
                      onChange={(e) => setPermission({ ...permission, delay_max_seconds: parseInt(e.target.value) || 0 })}
                      min={permission.delay_min_seconds}
                      max={600}
                    />
                  </div>
                </div>
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Delay randomizado de <strong>{permission.delay_min_seconds}s</strong> a <strong>{permission.delay_max_seconds}s</strong> entre cada mensagem
                  </AlertDescription>
                </Alert>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="randomize-text">Enviar texto randomizado</Label>
                  <Switch
                    id="randomize-text"
                    checked={permission.randomize_text}
                    onCheckedChange={(checked) => setPermission({ ...permission, randomize_text: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-media">Incluir mídia nas mensagens</Label>
                  <Switch
                    id="include-media"
                    checked={permission.include_media}
                    onCheckedChange={(checked) => setPermission({ ...permission, include_media: checked })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-semibold">Paradas de Segurança</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Parar se taxa de resposta menor que</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={permission.stop_if_low_response}
                        onChange={(e) => setPermission({ ...permission, stop_if_low_response: parseInt(e.target.value) || 0 })}
                        min={0}
                        max={100}
                        className="w-20"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Parar se bloqueios maiores que</Label>
                    <Input
                      type="number"
                      value={permission.stop_if_blocks}
                      onChange={(e) => setPermission({ ...permission, stop_if_blocks: parseInt(e.target.value) || 0 })}
                      min={1}
                      max={50}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BLOCO 3 - Simulador de Risco */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Simulador de Risco
              </CardTitle>
              <CardDescription>
                Análise em tempo real das suas configurações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Volume total estimado</span>
                  <span className="font-semibold">{eligibleCount?.toLocaleString() || '...'} mensagens</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Tempo estimado de envio</span>
                  <span className="font-semibold">{estimatedTime || '...'}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Taxa média por hora</span>
                  <span className="font-semibold">
                    {Math.min(permission.max_per_hour, Math.floor(3600 / ((permission.delay_min_seconds + permission.delay_max_seconds) / 2)))} msg/hora
                  </span>
                </div>
              </div>

              <Separator />

              {permission.risk_level === 'high' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Risco Alto Detectado</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      {permission.max_per_hour > 30 && (
                        <li>Muitas mensagens por hora. Reduza para no máximo 30.</li>
                      )}
                      {permission.delay_min_seconds < 30 && (
                        <li>Delay muito curto. Aumente para no mínimo 30 segundos.</li>
                      )}
                      {!permission.randomize_text && (
                        <li>Ative a randomização de texto para parecer mais humano.</li>
                      )}
                      {!permission.optin_required && (
                        <li>Recomendamos ativar o filtro de opt-in.</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {permission.risk_level === 'medium' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Risco Médio</AlertTitle>
                  <AlertDescription>
                    Configuração aceitável, mas considere reduzir a velocidade de envio para maior segurança.
                  </AlertDescription>
                </Alert>
              )}

              {permission.risk_level === 'low' && (
                <Alert className="border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertTitle className="text-emerald-700 dark:text-emerald-300">Configuração Segura</AlertTitle>
                  <AlertDescription>
                    Suas configurações estão dentro dos parâmetros seguros para envio em massa.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* BLOCO 4 - Autorização */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Autorização e Execução
              </CardTitle>
              <CardDescription>
                Salve as regras e execute campanhas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Regras
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={loadEligibleContacts}
                  disabled={loadingCount}
                >
                  {loadingCount ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Gerar Campanha Segura
                </Button>

                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleExecute}
                  disabled={permission.risk_level === 'high'}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Executar no n8n
                </Button>

                {permission.risk_level === 'high' && (
                  <p className="text-sm text-destructive text-center">
                    Botão desabilitado devido ao alto risco. Ajuste os parâmetros.
                  </p>
                )}
              </div>

              <Separator />

              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Ao executar, será enviado para o n8n:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Filtros SQL configurados</li>
                  <li>Limites de envio (dia/hora)</li>
                  <li>Delays randomizados ({permission.delay_min_seconds}s - {permission.delay_max_seconds}s)</li>
                  <li>Regras de parada automática</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
