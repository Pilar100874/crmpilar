import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Video } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

interface Camera {
  id: string;
  device_id: string;
  nome: string;
  rtsp_url: string;
  usuario: string | null;
  senha: string | null;
  ativo: boolean;
  ordem: number;
}

export default function PilarCamerasCRUD({ deviceId, estabelecimentoId }: { deviceId: string; estabelecimentoId: string }) {
  const [cams, setCams] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [nova, setNova] = useState({ nome: '', rtsp_url: '', usuario: '', senha: '' });
  const [toDelete, setToDelete] = useState<Camera | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pilar_cam_cameras' as any)
      .select('*')
      .eq('device_id', deviceId)
      .order('ordem', { ascending: true });
    setCams(((data as any[]) || []) as Camera[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [deviceId]);

  const criar = async () => {
    if (!nova.nome.trim() || !nova.rtsp_url.trim()) { toast.error('Nome e URL RTSP obrigatórios'); return; }
    const { error } = await supabase.from('pilar_cam_cameras' as any).insert({
      device_id: deviceId,
      estabelecimento_id: estabelecimentoId,
      nome: nova.nome.trim(),
      rtsp_url: nova.rtsp_url.trim(),
      usuario: nova.usuario.trim() || null,
      senha: nova.senha.trim() || null,
      ordem: cams.length,
    });
    if (error) { toast.error(error.message); return; }
    setNova({ nome: '', rtsp_url: '', usuario: '', senha: '' });
    toast.success('Câmera adicionada');
    await load();
  };

  const toggle = async (c: Camera) => {
    await supabase.from('pilar_cam_cameras' as any).update({ ativo: !c.ativo }).eq('id', c.id);
    await load();
  };

  const remover = async () => {
    if (!toDelete) return;
    await supabase.from('pilar_cam_cameras' as any).delete().eq('id', toDelete.id);
    setToDelete(null);
    toast.success('Câmera removida');
    await load();
  };

  return (
    <div className="space-y-3 border rounded-md p-3 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Video className="h-4 w-4 text-blue-500" /> Câmeras deste dispositivo
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <Input placeholder="Nome (ex: Portaria)" value={nova.nome} onChange={e => setNova({ ...nova, nome: e.target.value })} />
        <Input placeholder="rtsp://ip:554/stream" className="md:col-span-2" value={nova.rtsp_url} onChange={e => setNova({ ...nova, rtsp_url: e.target.value })} />
        <Input placeholder="usuário (opc)" value={nova.usuario} onChange={e => setNova({ ...nova, usuario: e.target.value })} />
        <div className="flex gap-2">
          <Input placeholder="senha (opc)" type="password" value={nova.senha} onChange={e => setNova({ ...nova, senha: e.target.value })} />
          <Button size="sm" onClick={criar}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Carregando...</div>
      ) : cams.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">Nenhuma câmera cadastrada.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>RTSP</TableHead>
              <TableHead className="w-20">Ativa</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cams.map(c => (
              <TableRow key={c.id}>
                <TableCell className="text-sm">{c.nome}</TableCell>
                <TableCell className="font-mono text-xs truncate max-w-[300px]">{c.rtsp_url}</TableCell>
                <TableCell><Switch checked={c.ativo} onCheckedChange={() => toggle(c)} /></TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => setToDelete(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        onConfirm={remover}
        title="Remover câmera?"
        description={`A câmera "${toDelete?.nome}" será removida deste dispositivo. Gravações locais no PC não são afetadas.`}
      />
    </div>
  );
}
