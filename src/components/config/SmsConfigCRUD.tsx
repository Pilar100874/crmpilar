import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, Save, MessageSquare } from 'lucide-react';

type Provider = 'gatewayapi' | 'twilio' | 'zenvia';

interface SmsConfig {
  id?: string;
  estabelecimento_id: string;
  provider: Provider;
  sender: string | null;
  ativo: boolean;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_from: string | null;
  gatewayapi_token: string | null;
  zenvia_api_token: string | null;
  zenvia_from: string | null;
}

const PROVIDERS: { value: Provider; label: string; desc: string }[] = [
  { value: 'gatewayapi', label: 'GatewayAPI', desc: 'Envio global de SMS via GatewayAPI.com' },
  { value: 'twilio', label: 'Twilio', desc: 'Envio via Twilio Programmable Messaging' },
  { value: 'zenvia', label: 'Zenvia', desc: 'Envio via Zenvia (Brasil)' },
];

export default function SmsConfigCRUD({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testDestino, setTestDestino] = useState('');
  const [testMensagem, setTestMensagem] = useState('Teste de envio de SMS ✅');
  const [historico, setHistorico] = useState<any[]>([]);

  const [cfg, setCfg] = useState<SmsConfig>({
    estabelecimento_id: estabelecimentoId,
    provider: 'gatewayapi',
    sender: '',
    ativo: true,
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_from: '',
    gatewayapi_token: '',
    zenvia_api_token: '',
    zenvia_from: '',
  });

  useEffect(() => {
    void load();
  }, [estabelecimentoId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('sms_config' as any)
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();
      if (data) setCfg({ ...cfg, ...(data as any) });

      const { data: hist } = await supabase
        .from('sms_envios' as any)
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false })
        .limit(20);
      setHistorico((hist as any[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...cfg, estabelecimento_id: estabelecimentoId };
      delete payload.id;
      const { error } = await supabase
        .from('sms_config' as any)
        .upsert(payload, { onConflict: 'estabelecimento_id' });
      if (error) throw error;
      toast.success('Configuração de SMS salva');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testDestino) { toast.error('Informe o número de destino'); return; }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          estabelecimento_id: estabelecimentoId,
          destino: testDestino,
          mensagem: testMensagem,
        },
      });
      if (error) throw error;
      if ((data as any)?.success) toast.success('SMS enviado com sucesso');
      else toast.error((data as any)?.erro || 'Falha no envio');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Erro no envio');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">Provedor de SMS</CardTitle>
          <CardDescription>Escolha e configure o provedor usado para envio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Provedor</Label>
              <Select value={cfg.provider} onValueChange={(v) => setCfg({ ...cfg, provider: v as Provider })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {PROVIDERS.find(p => p.value === cfg.provider)?.desc}
              </p>
            </div>
            <div>
              <Label>Remetente (Sender ID)</Label>
              <Input
                value={cfg.sender || ''}
                onChange={(e) => setCfg({ ...cfg, sender: e.target.value })}
                placeholder="Ex: MinhaEmpresa"
              />
              <p className="text-xs text-muted-foreground mt-1">Usado por GatewayAPI. Twilio/Zenvia usam o número "From".</p>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={cfg.ativo} onCheckedChange={(v) => setCfg({ ...cfg, ativo: v })} />
              <Label>Envio de SMS ativo</Label>
            </div>
          </div>

          {cfg.provider === 'gatewayapi' && (
            <div className="grid grid-cols-1 gap-4 border-t pt-4">
              <div>
                <Label>Token da API (GatewayAPI)</Label>
                <Input
                  type="password"
                  value={cfg.gatewayapi_token || ''}
                  onChange={(e) => setCfg({ ...cfg, gatewayapi_token: e.target.value })}
                  placeholder="Token gerado em gatewayapi.com"
                />
              </div>
            </div>
          )}

          {cfg.provider === 'twilio' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <div>
                <Label>Account SID</Label>
                <Input value={cfg.twilio_account_sid || ''} onChange={(e) => setCfg({ ...cfg, twilio_account_sid: e.target.value })} placeholder="ACxxxxxxxx" />
              </div>
              <div>
                <Label>Auth Token</Label>
                <Input type="password" value={cfg.twilio_auth_token || ''} onChange={(e) => setCfg({ ...cfg, twilio_auth_token: e.target.value })} />
              </div>
              <div>
                <Label>Número From (E.164)</Label>
                <Input value={cfg.twilio_from || ''} onChange={(e) => setCfg({ ...cfg, twilio_from: e.target.value })} placeholder="+15558675310" />
              </div>
            </div>
          )}

          {cfg.provider === 'zenvia' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <Label>API Token (Zenvia)</Label>
                <Input type="password" value={cfg.zenvia_api_token || ''} onChange={(e) => setCfg({ ...cfg, zenvia_api_token: e.target.value })} />
              </div>
              <div>
                <Label>Número From</Label>
                <Input value={cfg.zenvia_from || ''} onChange={(e) => setCfg({ ...cfg, zenvia_from: e.target.value })} placeholder="5511999999999" />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />{saving ? 'Salvando...' : 'Salvar configuração'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Send className="h-4 w-4" /> Enviar SMS de teste</CardTitle>
          <CardDescription>Envie uma mensagem real usando o provedor configurado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Destino (com DDI/DDD)</Label>
              <Input value={testDestino} onChange={(e) => setTestDestino(e.target.value)} placeholder="+5511999999999" />
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea value={testMensagem} onChange={(e) => setTestMensagem(e.target.value)} rows={2} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleTest} disabled={testing}>
              <Send className="h-4 w-4 mr-2" />{testing ? 'Enviando...' : 'Enviar teste'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Últimos envios</CardTitle>
          <CardDescription>Histórico dos 20 SMS mais recentes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Provedor</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(h.created_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{h.provider}</TableCell>
                  <TableCell>{h.destino}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={h.mensagem}>{h.mensagem}</TableCell>
                  <TableCell>
                    <span className={h.status === 'sent' ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                      {h.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-destructive max-w-[220px] truncate" title={h.erro || ''}>{h.erro || '-'}</TableCell>
                </TableRow>
              ))}
              {historico.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum SMS enviado ainda</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
