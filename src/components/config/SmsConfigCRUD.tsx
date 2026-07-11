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
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Send, Save, MessageSquare, BookOpen, Shield, Download, AppWindow } from 'lucide-react';
import { Link } from 'react-router-dom';
import PilarSmsDevices from './PilarSmsDevices';
import PilarSmsDownloadCard from './PilarSmsDownloadCard';


type Provider = 'pilar';

interface SmsConfig {
  id?: string;
  estabelecimento_id: string;
  provider: Provider;
  sender: string | null;
  ativo: boolean;
  smsgate_base_url: string | null;
  smsgate_username: string | null;
  smsgate_password: string | null;
  smsgatewayme_email: string | null;
  smsgatewayme_password: string | null;
  smsgatewayme_device_id: string | null;
  pilar_endpoint: string | null;
  pilar_token: string | null;
  pilar_sender: string | null;
}

const PROVIDERS: { value: Provider; label: string; desc: string; icon: any }[] = [
  { value: 'pilar', label: 'Pilar SMS (App próprio)', desc: 'Gateway próprio Pilar — protocolo simplificado, roda no seu Android', icon: Shield },
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
    provider: 'pilar',
    sender: '',
    ativo: true,
    smsgate_base_url: 'https://api.sms-gate.app/3rd/v1',
    smsgate_username: '',
    smsgate_password: '',
    smsgatewayme_email: '',
    smsgatewayme_password: '',
    smsgatewayme_device_id: '',
    pilar_endpoint: '',
    pilar_token: '',
    pilar_sender: '',
  });

  useEffect(() => { void load(); }, [estabelecimentoId]);

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
        body: { estabelecimento_id: estabelecimentoId, destino: testDestino, mensagem: testMensagem },
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

  const currentProvider = PROVIDERS.find(p => p.value === cfg.provider);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
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
              <p className="text-xs text-muted-foreground mt-1">{currentProvider?.desc}</p>
            </div>
            <div>
              <Label>Remetente (Sender ID)</Label>
              <Input
                value={cfg.sender || ''}
                onChange={(e) => setCfg({ ...cfg, sender: e.target.value })}
                placeholder="Ex: MinhaEmpresa"
              />
              <p className="text-xs text-muted-foreground mt-1">Opcional. Twilio/Zenvia/Android usam o número "From" do próprio provedor.</p>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={cfg.ativo} onCheckedChange={(v) => setCfg({ ...cfg, ativo: v })} />
              <Label>Envio de SMS ativo</Label>
            </div>
          </div>



          {cfg.provider === 'pilar' && (
            <div className="border-t pt-4 space-y-3">
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="font-medium text-foreground mb-1">✅ Modo Fila — sem Cloudflare, sem IP público</p>
                <p className="text-muted-foreground">
                  O CRM apenas <b>enfileira</b> as mensagens no banco. O APK Pilar SMS instalado no
                  celular consulta a fila a cada poucos segundos e envia os SMS pelo chip.
                  Funciona com Wi-Fi ou 4G, atrás de qualquer roteador, sem configuração de rede.
                </p>
              </div>
              <PilarSmsDevices estabelecimentoId={estabelecimentoId} />
            </div>
          )}


          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />{saving ? 'Salvando...' : 'Salvar configuração'}
            </Button>
          </div>
        </CardContent>
      </Card>


      <PilarSmsDownloadCard />

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
          <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" /> Manual de configuração dos provedores</CardTitle>
          <CardDescription>Passo a passo para cada um dos 3 provedores suportados</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="pilar">
              <AccordionTrigger className="text-sm">
                <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Pilar SMS — App próprio (Modo Fila) · Gratuito</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-2 text-muted-foreground">
                <p><b>Como funciona:</b> o CRM grava os SMS numa fila. O APK Pilar SMS instalado no seu celular consulta essa fila a cada 5 segundos e envia as mensagens pelo chip usando o <code>SmsManager</code> nativo. <b>Não precisa de IP público, roteador nem Cloudflare</b> — igual ao Coletor de Ponto e ao Coletor de Câmeras.</p>
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-md border border-primary/30 bg-primary/5">
                  <AppWindow className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground"><b>Baixe o APK Pilar SMS</b> e veja o passo a passo em Admin → Apps</span>
                  <Button asChild size="sm" className="ml-auto">
                    <Link to="/admin/apps">
                      <Download className="h-4 w-4 mr-2" /> Ir para Apps
                    </Link>
                  </Button>
                </div>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>Na seção <b>Celulares autorizados</b> acima, cadastre um nome (ex: "Celular Recepção") e clique em <b>Cadastrar</b>. Um <b>token</b> será gerado.</li>
                  <li>Copie o token.</li>
                  <li>Instale o APK <b>Pilar SMS v1.1.0</b> no Android que ficará ligado com o chip.</li>
                  <li>Abra o app, conceda permissão de <b>Enviar SMS</b> e desative a otimização de bateria.</li>
                  <li>Cole o token no campo do app e toque em <b>Conectar</b>. Pronto — o app começa a processar a fila.</li>
                  <li>O status do celular (último ping, bateria) aparece automaticamente na tabela acima.</li>
                </ol>
                <p className="text-xs"><b>Dica:</b> mantenha o celular carregando 24h. Se cair a conexão, os SMS ficam na fila e são reenviados assim que o celular voltar. Pode cadastrar vários celulares — eles dividem a fila automaticamente.</p>
              </AccordionContent>
            </AccordionItem>





          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Últimos envios</CardTitle>
          <CardDescription>Histórico dos 20 SMS mais recentes</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop: tabela */}
          <div className="hidden md:block w-full overflow-hidden">
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
                    <TableCell className="whitespace-nowrap">{h.destino}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={h.mensagem}>{h.mensagem}</TableCell>
                    <TableCell>
                      <span className={h.status === 'sent' ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                        {h.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[200px] truncate" title={h.erro || ''}>{h.erro || '-'}</TableCell>
                  </TableRow>
                ))}
                {historico.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum SMS enviado ainda</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            {historico.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-6">Nenhum SMS enviado ainda</div>
            )}
            {historico.map((h) => (
              <div key={h.id} className="border rounded-md p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                  <span className={h.status === 'sent' ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                    {h.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{h.provider}</Badge>
                  <span className="font-mono">{h.destino}</span>
                </div>
                <div className="text-foreground break-words line-clamp-2">{h.mensagem}</div>
                {h.erro && <div className="text-destructive text-[11px] break-words">{h.erro}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
