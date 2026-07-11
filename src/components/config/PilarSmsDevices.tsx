import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Plus, Trash2, Smartphone, RefreshCw, Pencil, Check, X, Eye, EyeOff, KeyRound } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
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
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Device | null>(null);
  const [showToken, setShowToken] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const toggleReveal = (id: string) => setRevealed((r) => ({ ...r, [id]: !r[id] }));
  const maskToken = (t: string) => (t.length <= 12 ? '•'.repeat(t.length) : `${t.slice(0, 6)}${'•'.repeat(Math.max(6, t.length - 10))}${t.slice(-4)}`);

  const TokenField = ({ d, compact = false }: { d: Device; compact?: boolean }) => {
    const shown = !!revealed[d.id];
    return (
      <div className={`flex items-center gap-1 rounded-md border bg-muted/40 px-2 ${compact ? 'py-0.5' : 'py-1'} font-mono ${compact ? 'text-[10px]' : 'text-xs'} min-w-0`}>
        <KeyRound className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-muted-foreground shrink-0`} />
        <span className="truncate select-all">{shown ? d.token : maskToken(d.token)}</span>
        <Button size="icon" variant="ghost" className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} shrink-0`} onClick={() => toggleReveal(d.id)} title={shown ? 'Ocultar' : 'Mostrar'}>
          {shown ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
        <Button size="icon" variant="ghost" className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} shrink-0`} onClick={() => copiar(d.token)} title="Copiar token">
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  const startEdit = (d: Device) => { setEditingId(d.id); setEditNome(d.nome); };
  const cancelEdit = () => { setEditingId(null); setEditNome(''); };
  const salvarEdit = async (d: Device) => {
    const nome = editNome.trim();
    if (!nome) { toast.error('Nome não pode ficar vazio'); return; }
    if (nome === d.nome) { cancelEdit(); return; }
    const { error } = await supabase.from('sms_devices' as any).update({ nome }).eq('id', d.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Celular atualizado');
    cancelEdit();
    await load();
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sms_devices' as any)
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('tipo_dispositivo', 'android')
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
          tipo_dispositivo: 'android',
          modulo_sms_ativo: true,
          modulo_ponto_ativo: false,
          modulo_camera_ativo: false,
        })
        .select('*')
        .single();
      if (error) throw error;
      setNovoNome('');
      toast.success('Celular cadastrado. Copie o token e cole no app.');
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

  const remover = async () => {
    if (!toDelete) return;
    await supabase.from('sms_devices' as any).delete().eq('id', toDelete.id);
    setToDelete(null);
    toast.success('Celular removido');
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

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> Celulares Pilar SMS</Label>
        <p className="text-xs text-muted-foreground">Android com chip que roda o APK Pilar SMS e envia as mensagens da fila do CRM.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Ex: Celular Recepção"
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
          <p className="text-sm font-medium">Token do novo celular (guarde agora):</p>
          <div className="flex gap-2">
            <Input readOnly value={showToken} className="font-mono text-xs" />
            <Button size="sm" variant="outline" onClick={() => copiar(showToken)}><Copy className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setShowToken(null)}>Fechar</Button>
          </div>
          <p className="text-xs text-muted-foreground">Abra o app Pilar SMS no celular, cole este token e toque em "Conectar".</p>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-4">Carregando...</div>
      ) : devices.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-4 border rounded-md">Nenhum celular cadastrado.</div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block w-full overflow-hidden border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Celular</TableHead>
                  <TableHead className="w-[260px]">Token</TableHead>
                  <TableHead>Último ping</TableHead>
                  <TableHead>Bateria</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-primary" />
                        {editingId === d.id ? (
                          <Input
                            autoFocus
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') salvarEdit(d); if (e.key === 'Escape') cancelEdit(); }}
                            className="h-7 text-sm"
                          />
                        ) : (
                          <div>
                            <div className="font-medium text-sm">{d.nome}</div>
                            {d.versao_app && <div className="text-[10px] text-muted-foreground uppercase">v{d.versao_app}</div>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[220px] max-w-[280px]">
                      <TokenField d={d} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <StatusPingDot at={d.ultimo_heartbeat ?? d.ultimo_ping} label={`Celular ${d.nome}`} dotOnly />
                        <span>{pingLabel(d.ultimo_ping)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.bateria != null ? <Badge variant={d.bateria > 20 ? 'default' : 'destructive'}>{d.bateria}%</Badge> : '—'}
                    </TableCell>
                    <TableCell><Switch checked={d.ativo} onCheckedChange={() => toggleAtivo(d)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {editingId === d.id ? (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => salvarEdit(d)} title="Salvar">
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={cancelEdit} title="Cancelar">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => startEdit(d)} title="Editar nome">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setToDelete(d)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden space-y-3">
            {devices.map((d) => (
              <div key={d.id} className="border rounded-lg bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Smartphone className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      {editingId === d.id ? (
                        <Input
                          autoFocus
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') salvarEdit(d); if (e.key === 'Escape') cancelEdit(); }}
                          className="h-7 text-sm"
                        />
                      ) : (
                        <>
                          <div className="font-medium text-sm truncate">{d.nome}</div>
                          {d.versao_app && <div className="text-[10px] text-muted-foreground uppercase">v{d.versao_app}</div>}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {editingId === d.id ? (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => salvarEdit(d)}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Switch checked={d.ativo} onCheckedChange={() => toggleAtivo(d)} />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setToDelete(d)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1 border-t">
                  <div className="flex items-center gap-1.5">
                    <StatusPingDot at={d.ultimo_heartbeat ?? d.ultimo_ping} label={`Celular ${d.nome}`} dotOnly />
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
            ))}
          </div>
        </>
      )}

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        onConfirm={remover}
        title="Remover celular?"
        description={`O celular "${toDelete?.nome}" perderá acesso ao envio de SMS. Não afeta mensagens já enviadas.`}
      />
    </div>
  );
}
