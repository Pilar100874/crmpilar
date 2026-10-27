import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, Pencil, Trash2, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { toast } from 'sonner';
import { ContentItem, MediaGalleryItem } from '../types';
import { EnvioMassaTemplate } from '../hooks/useEnvioMassaTemplates';
import { StepCompose } from './StepCompose';

interface Props {
  media: MediaGalleryItem[];
  onUploadMedia: (arquivo: File) => Promise<MediaGalleryItem | null>;
  onTemplatesChanged?: () => void;
  canal?: 'email' | 'whatsapp';
}

/** Tela separada de modelos de e-mail, no mesmo formato da de templates do WhatsApp. */
export function ModelosEmailCRUD({ media, onUploadMedia, onTemplatesChanged, canal = 'email' }: Props) {
  const ehEmail = canal === 'email';
  const [modelos, setModelos] = useState<EnvioMassaTemplate[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<EnvioMassaTemplate | 'novo' | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [itens, setItens] = useState<ContentItem[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState<EnvioMassaTemplate | null>(null);

  const carregar = async () => {
    setCarregando(true);
    try {
      const estab = await getEstabelecimentoId();
      if (!estab) return;
      const { data, error } = await supabase.from('envio_massa_templates').select('*').eq('estabelecimento_id', estab).order('ordem');
      if (error) throw error;
      setModelos(((data || []) as unknown as EnvioMassaTemplate[]).filter(t => ehEmail ? !!t.content_items?.[0]?.emailTemplate : !t.content_items?.[0]?.emailTemplate));
    } catch { toast.error('Não foi possível carregar os modelos'); }
    finally { setCarregando(false); }
  };
  useEffect(() => { carregar(); }, []);

  const abrir = (m: EnvioMassaTemplate | 'novo') => {
    setEditando(m);
    setNome(m === 'novo' ? '' : m.nome);
    setDescricao(m === 'novo' ? '' : m.descricao || '');
    setItens(m === 'novo' ? [] : (m.content_items || []).map(i => ({ ...i, id: crypto.randomUUID() })));
  };

  const salvar = async () => {
    if (!nome.trim()) { toast.error('Informe o nome do modelo'); return; }
    if (itens.length === 0) { toast.error('Adicione conteúdo ao modelo'); return; }
    if (ehEmail && !itens[0]?.emailSubject?.trim()) { toast.error('Informe o assunto do e-mail'); return; }
    setSalvando(true);
    try {
      const estab = await getEstabelecimentoId();
      if (!estab) throw new Error('Entre novamente para salvar o modelo');
      const dados = { nome: nome.trim(), descricao: descricao.trim() || null, conteudo: itens.map(i => i.content).join('\n\n'), content_items: JSON.parse(JSON.stringify(itens)) };
      const { error } = editando && editando !== 'novo'
        ? await supabase.from('envio_massa_templates').update(dados).eq('id', editando.id)
        : await supabase.from('envio_massa_templates').insert({ ...dados, estabelecimento_id: estab, ativo: true, ordem: modelos.length });
      if (error) throw error;
      toast.success(ehEmail ? 'Modelo de e-mail salvo' : 'Modelo de WhatsApp salvo');
      setEditando(null); await carregar(); onTemplatesChanged?.();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível salvar o modelo'); }
    finally { setSalvando(false); }
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await supabase.from('envio_massa_templates').delete().eq('id', excluir.id);
    if (error) toast.error('Não foi possível excluir o modelo');
    else { toast.success('Modelo excluído'); await carregar(); onTemplatesChanged?.(); }
    setExcluir(null);
  };

  if (editando) {
    return (
      <div className="space-y-4 min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
          <div className="space-y-1"><Label htmlFor="nome-modelo-email">Nome do modelo</Label><Input id="nome-modelo-email" value={nome} onChange={e => setNome(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="descricao-modelo-email">Descrição (opcional)</Label><Input id="descricao-modelo-email" value={descricao} onChange={e => setDescricao(e.target.value)} /></div>
        </div>
        <StepCompose
          canal={canal} modoModelo rotuloVoltar="Cancelar" rotuloAvancar={salvando ? 'Salvando…' : 'Salvar modelo'}
          contentItems={itens} quickReplies={[]} groupedReplies={{}} templates={modelos} media={media}
          onContentChange={setItens} onUploadMedia={onUploadMedia}
          onBack={() => setEditando(null)} onNext={() => { if (!salvando) salvar(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 min-w-0">
      <Button onClick={() => abrir('novo')} className="gap-2"><Plus className="h-4 w-4" />{ehEmail ? 'Novo modelo de e-mail' : 'Novo modelo de WhatsApp'}</Button>
      {carregando ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        : modelos.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{ehEmail ? 'Nenhum modelo de e-mail cadastrado.' : 'Nenhum modelo de WhatsApp cadastrado.'}</p>
        : modelos.map(m => (
          <Card key={m.id} className="p-3 flex items-start gap-3 min-w-0">
            <Mail className="h-4 w-4 mt-1 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm break-words">{m.nome}</p>
              {ehEmail && <p className="text-xs text-muted-foreground break-words">Assunto: {m.content_items?.[0]?.emailSubject || '—'}</p>}
              <Badge variant="outline" className="text-xs h-5 mt-1">{m.content_items?.length || 0} itens</Badge>
            </div>
            <Button size="icon" variant="ghost" aria-label="Editar modelo" onClick={() => abrir(m)}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Excluir modelo" onClick={() => setExcluir(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Card>
        ))}
      <DeleteConfirmDialog open={excluir !== null} onOpenChange={a => { if (!a) setExcluir(null); }} title="Excluir modelo" onConfirm={confirmarExclusao} />
    </div>
  );
}
