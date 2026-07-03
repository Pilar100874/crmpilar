import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Plus, Trash2, Smartphone, Download, RefreshCw } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

interface Device {
  id: string;
  nome: string;
  token: string;
  ativo: boolean;
  ultimo_ping: string | null;
  bateria: number | null;
  sinal: string | null;
}

export default function PilarSmsDevices({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Device | null>(null);
  const [showToken, setShowToken] = useState<string | null>(null);

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
    if (!novoNome.trim()) { toast.error('Informe um nome para o celular'); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('sms_devices' as any)
        .insert({ nome: novoNome.trim(), estabelecimento_id: estabelecimentoId })
        .select('*')
        .single();
      if (error) throw error;
      setNovoNome('');
      toast.success('Dispositivo cadastrado. Copie o token e cole no APK.');
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> Celulares autorizados</Label>
          <p className="text-xs text-muted-foreground">Cada celular precisa de um cadastro para receber SMS da fila.</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a href="/pilar-sms-v1.2.0.apk" download>
            <Download className="h-4 w-4 mr-2" /> Baixar APK v1.2.0
          </a>
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Ex: Celular Recepção"
          onKeyDown={(e) => e.key === 'Enter' && criar()}
        />
        <Button onClick={criar} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" />Cadastrar
        </Button>
        <Button variant="ghost" size="icon" onClick={load} title="Atualizar"><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {showToken && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-sm font-medium">Token do novo dispositivo (guarde agora — só é mostrado uma vez com destaque):</p>
          <div className="flex gap-2">
            <Input readOnly value={showToken} className="font-mono text-xs" />
            <Button size="sm" variant="outline" onClick={() => copiar(showToken)}><Copy className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setShowToken(null)}>Fechar</Button>
          </div>
          <p className="text-xs text-muted-foreground">Abra o APK Pilar SMS no celular, cole este token e clique em "Conectar".</p>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-4">Carregando...</div>
      ) : devices.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-4 border rounded-md">Nenhum dispositivo cadastrado.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Último ping</TableHead>
              <TableHead>Bateria</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.nome}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => copiar(d.token)} className="font-mono text-xs">
                    {d.token.slice(0, 10)}… <Copy className="h-3 w-3 ml-1" />
                  </Button>
                </TableCell>
                <TableCell className="text-xs">{pingLabel(d.ultimo_ping)}</TableCell>
                <TableCell className="text-xs">{d.bateria != null ? `${d.bateria}%` : '—'}</TableCell>
                <TableCell><Switch checked={d.ativo} onCheckedChange={() => toggleAtivo(d)} /></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => setToDelete(d)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        onConfirm={remover}
        title="Remover dispositivo?"
        description={`O celular "${toDelete?.nome}" perderá acesso à fila. Não afeta SMS já enviados.`}
      />
    </div>
  );
}
