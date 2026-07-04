import { Fragment, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Plus, Trash2, Smartphone, Monitor, Download, RefreshCw, MessageSquare, Clock, Camera, ChevronDown, ChevronRight } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import PilarCamerasCRUD from './PilarCamerasCRUD';
import PilarSnapshotsGallery from './PilarSnapshotsGallery';
import { StatusPingDot } from '@/components/StatusPingDot';

interface Device {
  id: string;
  nome: string;
  token: string;
  ativo: boolean;
  ultimo_ping: string | null;
  ultimo_heartbeat?: string | null;
  bateria: number | null;
  sinal: string | null;
  tipo_dispositivo: 'android' | 'windows' | string;
  versao_app: string | null;
  modulo_sms_ativo: boolean;
  modulo_ponto_ativo: boolean;
  modulo_camera_ativo: boolean;
}


export default function PilarSmsDevices({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [novoTipo, setNovoTipo] = useState<'android' | 'windows'>('android');
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Device | null>(null);
  const [showToken, setShowToken] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sms_devices' as any)
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('created_at', { ascending: false });
    setDevices(((data as any[]) || []) as Device[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [estabelecimentoId]);

  const criar = async () => {
    if (!novoNome.trim()) { toast.error('Informe um nome'); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('sms_devices' as any)
        .insert({
          nome: novoNome.trim(),
          estabelecimento_id: estabelecimentoId,
          tipo_dispositivo: novoTipo,
          modulo_sms_ativo: novoTipo === 'android',
          modulo_ponto_ativo: false,
          modulo_camera_ativo: novoTipo === 'windows',
        })
        .select('*')
        .single();
      if (error) throw error;
      setNovoNome('');
      toast.success('Dispositivo cadastrado. Copie o token e cole no app.');
      setShowToken((data as any).token);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleAtivo = async (d: Device) => {
    await supabase.from('sms_devices' as any).update({ ativo: !d.ativo }).eq('id', d.id);
    await load();
  };

  const toggleModulo = async (d: Device, campo: 'modulo_sms_ativo' | 'modulo_ponto_ativo' | 'modulo_camera_ativo') => {
    await supabase.from('sms_devices' as any).update({ [campo]: !(d as any)[campo] }).eq('id', d.id);
    await load();
  };

  const remover = async () => {
    if (!toDelete) return;
    await supabase.from('sms_devices' as any).delete().eq('id', toDelete.id);
    setToDelete(null);
    toast.success('Dispositivo removido');
    await load();
  };

  const copiar = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success('Copiado');
  };

  const pingLabel = (p: string | null) => {
    if (!p) return 'nunca';
    const diff = Date.now() - new Date(p).getTime();
    if (diff < 60_000) return 'agora';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m atrás`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h atrás`;
    return new Date(p).toLocaleString();
  };

  const tipoIcon = (tipo: string) => tipo === 'windows'
    ? <Monitor className="h-4 w-4 text-blue-500" />
    : <Smartphone className="h-4 w-4 text-primary" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Label className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> Dispositivos Pilar Hub</Label>
          <p className="text-xs text-muted-foreground">Celulares (Android) e PCs (Windows) que rodam módulos SMS, Ponto e/ou Câmera.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <PilarSnapshotsGallery estabelecimentoId={estabelecimentoId} />
          <Button asChild size="sm" variant="outline">
            <a href="/pilar-sms-v1.2.0.apk" download>
              <Download className="h-4 w-4 mr-2" /> APK Android
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" disabled>
            <span title="Em breve">
              <Download className="h-4 w-4 mr-2" /> Pilar Cam (Windows)
            </span>
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={novoTipo} onValueChange={(v: any) => setNovoTipo(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="android">📱 Android (Hub)</SelectItem>
            <SelectItem value="windows">🖥️ Windows (Cam)</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder={novoTipo === 'windows' ? 'Ex: PC da Portaria' : 'Ex: Celular Recepção'}
          onKeyDown={(e) => e.key === 'Enter' && criar()}
          className="flex-1 min-w-[200px]"
        />
        <Button onClick={criar} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" />Cadastrar
        </Button>
        <Button variant="ghost" size="icon" onClick={load} title="Atualizar"><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {showToken && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-sm font-medium">Token do novo dispositivo (guarde agora):</p>
          <div className="flex gap-2">
            <Input readOnly value={showToken} className="font-mono text-xs" />
            <Button size="sm" variant="outline" onClick={() => copiar(showToken)}><Copy className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setShowToken(null)}>Fechar</Button>
          </div>
          <p className="text-xs text-muted-foreground">Abra o app no dispositivo, cole este token e clique em "Conectar".</p>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-4">Carregando...</div>
      ) : devices.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-4 border rounded-md">Nenhum dispositivo cadastrado.</div>
      ) : (
        <>
        {/* Desktop: tabela */}
        <div className="hidden lg:block w-full overflow-hidden border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dispositivo</TableHead>
              <TableHead className="w-[100px]">Token</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead>Último ping</TableHead>
              <TableHead>Bateria</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((d) => (
              <Fragment key={d.id}>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {d.tipo_dispositivo === 'windows' && (
                      <button
                        onClick={() => setExpandido(expandido === d.id ? null : d.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Ver câmeras"
                      >
                        {expandido === d.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                    {tipoIcon(d.tipo_dispositivo)}
                    <div>
                      <div className="font-medium text-sm">{d.nome}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {d.tipo_dispositivo}{d.versao_app ? ` · v${d.versao_app}` : ''}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => copiar(d.token)} className="font-mono text-xs">
                    {d.token.slice(0, 8)}… <Copy className="h-3 w-3 ml-1" />
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => toggleModulo(d, 'modulo_sms_ativo')}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition ${d.modulo_sms_ativo ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <MessageSquare className="h-3 w-3" /> SMS
                    </button>
                    <button type="button" onClick={() => toggleModulo(d, 'modulo_ponto_ativo')}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition ${d.modulo_ponto_ativo ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                      <Clock className="h-3 w-3" /> Ponto
                    </button>
                    <button type="button" onClick={() => toggleModulo(d, 'modulo_camera_ativo')}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition ${d.modulo_camera_ativo ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                      <Camera className="h-3 w-3" /> Câmera
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex items-center gap-2">
                    <StatusPingDot at={d.ultimo_heartbeat ?? d.ultimo_ping} label={`Dispositivo ${d.nome} (${d.tipo_dispositivo})`} dotOnly />
                    <span>{pingLabel(d.ultimo_ping)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  {d.bateria != null ? <Badge variant={d.bateria > 20 ? 'default' : 'destructive'}>{d.bateria}%</Badge> : '—'}
                </TableCell>
                <TableCell><Switch checked={d.ativo} onCheckedChange={() => toggleAtivo(d)} /></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => setToDelete(d)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
              {expandido === d.id && d.tipo_dispositivo === 'windows' && (
                <TableRow>
                  <TableCell colSpan={7} className="p-2 bg-muted/20">
                    <PilarCamerasCRUD deviceId={d.id} estabelecimentoId={estabelecimentoId} />
                  </TableCell>
                </TableRow>
              )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        </div>

        {/* Mobile / tablet: cards */}
        <div className="lg:hidden space-y-3">
          {devices.map((d) => (
            <div key={d.id} className="border rounded-lg bg-card">
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {d.tipo_dispositivo === 'windows' && (
                      <button onClick={() => setExpandido(expandido === d.id ? null : d.id)} className="text-muted-foreground shrink-0">
                        {expandido === d.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                    <span className="shrink-0">{tipoIcon(d.tipo_dispositivo)}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{d.nome}</div>
                      <div className="text-[10px] text-muted-foreground uppercase truncate">
                        {d.tipo_dispositivo}{d.versao_app ? ` · v${d.versao_app}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={d.ativo} onCheckedChange={() => toggleAtivo(d)} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setToDelete(d)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => toggleModulo(d, 'modulo_sms_ativo')}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition ${d.modulo_sms_ativo ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <MessageSquare className="h-3 w-3" /> SMS
                  </button>
                  <button type="button" onClick={() => toggleModulo(d, 'modulo_ponto_ativo')}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition ${d.modulo_ponto_ativo ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                    <Clock className="h-3 w-3" /> Ponto
                  </button>
                  <button type="button" onClick={() => toggleModulo(d, 'modulo_camera_ativo')}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition ${d.modulo_camera_ativo ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                    <Camera className="h-3 w-3" /> Câmera
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1 border-t">
                  <div className="flex items-center gap-1.5">
                    <StatusPingDot at={d.ultimo_heartbeat ?? d.ultimo_ping} label={`Dispositivo ${d.nome} (${d.tipo_dispositivo})`} dotOnly />
                    <span className="text-muted-foreground">Ping:</span>
                    <span>{pingLabel(d.ultimo_ping)}</span>
                  </div>
                  {d.bateria != null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Bateria:</span>
                      <Badge variant={d.bateria > 20 ? 'default' : 'destructive'} className="text-[10px]">{d.bateria}%</Badge>
                    </div>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => copiar(d.token)} className="font-mono text-[10px] h-6 px-2 ml-auto">
                    {d.token.slice(0, 8)}… <Copy className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
              {expandido === d.id && d.tipo_dispositivo === 'windows' && (
                <div className="p-2 bg-muted/20 border-t">
                  <PilarCamerasCRUD deviceId={d.id} estabelecimentoId={estabelecimentoId} />
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        onConfirm={remover}
        title="Remover dispositivo?"
        description={`O dispositivo "${toDelete?.nome}" perderá acesso a todos os módulos. Não afeta registros já enviados.`}
      />
    </div>
  );
}
