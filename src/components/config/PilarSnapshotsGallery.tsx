import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Camera, Clock } from 'lucide-react';

interface Snap {
  id: string;
  origem: string;
  storage_path: string;
  url_publica: string | null;
  meta: any;
  created_at: string;
}

export default function PilarSnapshotsGallery({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'all' | 'ponto' | 'camera' | 'motion'>('all');

  const load = async () => {
    setLoading(true);
    let q = supabase.from('pilar_hub_snapshots' as any)
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('created_at', { ascending: false })
      .limit(60);
    if (filtro !== 'all') q = q.eq('origem', filtro);
    const { data } = await q;
    setSnaps(((data as any[]) || []) as Snap[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [estabelecimentoId, filtro]);

  const iconFor = (o: string) => o === 'ponto' ? <Clock className="h-3 w-3" /> : <Camera className="h-3 w-3" />;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><ImageIcon className="h-4 w-4 mr-2" /> Galeria de snapshots</Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Snapshots do Pilar Hub</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          {(['all', 'ponto', 'camera', 'motion'] as const).map(f => (
            <Button key={f} size="sm" variant={filtro === f ? 'default' : 'outline'} onClick={() => setFiltro(f)}>
              {f === 'all' ? 'Todos' : f}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-6">Carregando...</div>
        ) : snaps.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">Nenhum snapshot ainda.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {snaps.map(s => (
              <a key={s.id} href={s.url_publica || '#'} target="_blank" rel="noreferrer" className="block border rounded-md overflow-hidden hover:border-primary transition">
                {s.url_publica ? (
                  <img src={s.url_publica} alt={s.origem} className="w-full h-32 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-32 bg-muted flex items-center justify-center text-xs text-muted-foreground">Sem preview</div>
                )}
                <div className="p-2 space-y-1">
                  <Badge variant="secondary" className="text-[10px]">{iconFor(s.origem)}<span className="ml-1">{s.origem}</span></Badge>
                  <div className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
