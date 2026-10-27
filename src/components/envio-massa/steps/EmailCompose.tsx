import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, Save, Upload, ArrowUp, ArrowDown, Trash2, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { toast } from 'sonner';
import { ContentItem, MediaGalleryItem } from '../types';
import { EnvioMassaTemplate } from '../hooks/useEnvioMassaTemplates';

interface Props {
  contentItems: ContentItem[]; templates: EnvioMassaTemplate[]; media: MediaGalleryItem[];
  onContentChange: (itens: ContentItem[]) => void; onUploadMedia: (arquivo: File) => Promise<MediaGalleryItem | null>;
  onBack: () => void; onNext: () => void; onTemplatesChanged?: () => void;
}
export function EmailCompose({ contentItems, templates, media, onContentChange, onUploadMedia, onBack, onNext, onTemplatesChanged }: Props) {
  const assunto = contentItems[0]?.emailSubject || '';
  const [nomeModelo, setNomeModelo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [excluir, setExcluir] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const alvo = useRef<string>('assunto');
  const emitir = (itens: ContentItem[], novoAssunto = assunto) => onContentChange(itens.map((i, n) => ({ ...i, emailTemplate: true, emailSubject: n === 0 ? novoAssunto : undefined })));
  const mudarAssunto = (valor: string) => emitir(contentItems.length ? contentItems : [{ id: crypto.randomUUID(), type: 'text', content: '' }], valor);
  const adicionar = (item: ContentItem) => emitir([...contentItems, item]);
  const modelos = templates.filter(t => t.content_items?.[0]?.emailTemplate);
  const mover = (indice: number, delta: number) => {
    const itens = [...contentItems]; const destino = indice + delta;
    if (destino < 0 || destino >= itens.length) return;
    [itens[indice], itens[destino]] = [itens[destino], itens[indice]]; emitir(itens);
  };
  const salvar = async () => {
    if (!nomeModelo.trim() || !assunto.trim()) { toast.error('Preencha o nome do modelo e o assunto'); return; }
    setSalvando(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data: { user } } = await supabase.auth.getUser();
      if (!estabelecimentoId || !user) throw new Error('Entre novamente para salvar o modelo');
      const { data: usuario } = await supabase.from('usuarios').select('id').eq('auth_user_id', user.id).maybeSingle();
      if (!usuario) throw new Error('Usuário não encontrado');
      const { error } = await supabase.from('envio_massa_templates').insert({ nome: nomeModelo.trim(), conteudo: contentItems.map(i => i.content).join('\n\n'), content_items: JSON.parse(JSON.stringify(contentItems)), estabelecimento_id: estabelecimentoId, user_id: usuario.id, ativo: true, ordem: templates.length });
      if (error) throw error;
      setNomeModelo(''); onTemplatesChanged?.(); toast.success('Modelo de e-mail salvo');
    } catch (erro) { toast.error(erro instanceof Error ? erro.message : 'Não foi possível salvar o modelo'); }
    finally { setSalvando(false); }
  };
  return <div className="min-w-0 space-y-4">
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4 min-w-0">
      <aside className="min-w-0 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />Modelos de e-mail</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {modelos.map(t => <Button key={t.id} variant="outline" className="w-full justify-start h-auto whitespace-normal text-left" onClick={() => { const itens = (t.content_items || []).map(i => ({ ...i, id: crypto.randomUUID() })); onContentChange(itens); }}>{t.nome}</Button>)}
          {!modelos.length && <p className="text-sm text-muted-foreground">Nenhum modelo de e-mail salvo.</p>}
        </div>
        <Label htmlFor="nome-modelo-email">Nome do modelo</Label>
        <Input id="nome-modelo-email" value={nomeModelo} onChange={e => setNomeModelo(e.target.value)} />
        <Button variant="outline" className="w-full gap-2" disabled={salvando || !contentItems.length} onClick={salvar}>{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar como modelo</Button>
      </aside>
      <div className="min-w-0 space-y-3">
        <Label htmlFor="assunto-email-massa">Assunto do e-mail</Label>
        <Input id="assunto-email-massa" value={assunto} onFocus={() => { alvo.current = 'assunto'; }} onChange={e => mudarAssunto(e.target.value)} />
        <div className="flex flex-wrap gap-1">{['contato', 'empresa', 'whatsapp', 'email'].map(v => <Button key={v} size="sm" variant="outline" onClick={() => {
          const variavel = `{{${v}}}`;
          if (alvo.current === 'assunto') mudarAssunto(assunto + variavel);
          else emitir(contentItems.map(i => i.id === alvo.current ? { ...i, content: i.content + variavel } : i));
        }}>{`{{${v}}}`}</Button>)}</div>
        <div className="space-y-3">
          {contentItems.map((item, indice) => <div key={item.id} className="border rounded-md p-3 space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2"><Label htmlFor={`bloco-${item.id}`}>{item.type === 'image' ? 'Imagem' : 'Texto'} {indice + 1}</Label><div className="flex">
              <Button size="icon" variant="ghost" aria-label="Mover para cima" disabled={indice === 0} onClick={() => mover(indice, -1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Mover para baixo" disabled={indice === contentItems.length - 1} onClick={() => mover(indice, 1)}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Excluir bloco" onClick={() => setExcluir(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div></div>
            {item.type === 'image' && item.mediaUrl && <img src={item.mediaUrl} alt={item.content} className="max-w-full max-h-40 object-contain" />}
            <Textarea id={`bloco-${item.id}`} aria-label={item.type === 'image' ? 'Descrição da imagem' : `Texto ${indice + 1}`} value={item.content} onFocus={() => { alvo.current = item.id; }} onChange={e => emitir(contentItems.map(i => i.id === item.id ? { ...i, content: e.target.value } : i))} />
          </div>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => adicionar({ id: crypto.randomUUID(), type: 'text', content: '' })} className="gap-2"><Plus className="h-4 w-4" />Adicionar texto</Button>
          <Button variant="outline" disabled={carregando} onClick={() => arquivo.current?.click()} className="gap-2"><Upload className="h-4 w-4" />{carregando ? 'Enviando imagem…' : 'Adicionar imagem'}</Button>
          <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={async e => {
            const file = e.target.files?.[0]; if (!file) return;
            setCarregando(true);
            try { const imagem = await onUploadMedia(file); if (imagem) adicionar({ id: crypto.randomUUID(), type: 'image', content: imagem.nome, mediaUrl: imagem.public_url }); }
            finally { setCarregando(false); e.target.value = ''; }
          }} />
        </div>
        {media.some(m => m.tipo === 'image') && <div className="flex flex-wrap gap-2">{media.filter(m => m.tipo === 'image').slice(0, 12).map(m => <Button key={m.id} variant="outline" size="icon" title={m.nome} aria-label={`Adicionar ${m.nome}`} onClick={() => adicionar({ id: crypto.randomUUID(), type: 'image', content: m.nome, mediaUrl: m.public_url })}><img src={m.thumbnail_url || m.public_url} alt={m.nome} className="w-8 h-8 object-cover" /></Button>)}</div>}
      </div>
    </div>
    <div className="flex justify-between border-t pt-4"><Button variant="outline" onClick={onBack}>Voltar</Button><Button onClick={onNext} disabled={!assunto.trim() || !contentItems.some(i => i.content.trim() || i.mediaUrl)}>Continuar</Button></div>
    <DeleteConfirmDialog open={excluir !== null} onOpenChange={aberto => { if (!aberto) setExcluir(null); }} title="Excluir bloco" onConfirm={() => { emitir(contentItems.filter(i => i.id !== excluir)); setExcluir(null); }} />
  </div>;
}