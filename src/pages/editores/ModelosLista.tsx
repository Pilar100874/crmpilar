import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Search, Copy, Trash2, Edit, Power, PowerOff, Send } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

interface Modelo {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria_id: string | null;
  ativo: boolean;
  versao_atual: number;
  updated_at: string;
  created_at: string;
}
interface Categoria { id: string; nome: string; cor: string; }

export default function ModelosLista() {
  const nav = useNavigate();
  const [estabId, setEstabId] = useState<string | null>(null);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("__all");
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<Modelo | null>(null);
  const [openNovo, setOpenNovo] = useState(false);
  const [novo, setNovo] = useState({ titulo: "", descricao: "", categoria_id: "__none" });
  const [openCat, setOpenCat] = useState(false);
  const [novaCat, setNovaCat] = useState({ nome: "", cor: "#3b82f6" });

  const load = async (estab: string) => {
    setLoading(true);
    const [m, c] = await Promise.all([
      supabase.from("doc_modelos").select("*").eq("estabelecimento_id", estab).order("updated_at", { ascending: false }),
      supabase.from("doc_categorias").select("*").eq("estabelecimento_id", estab).order("ordem"),
    ]);
    setModelos((m.data ?? []) as Modelo[]);
    setCats((c.data ?? []) as Categoria[]);
    setLoading(false);
  };

  useEffect(() => {
    getEstabelecimentoId().then(id => { setEstabId(id); void load(id); }).catch(() => toast.error("Estabelecimento não encontrado"));
  }, []);

  const filtered = useMemo(() => modelos.filter(m =>
    (!busca || m.titulo.toLowerCase().includes(busca.toLowerCase()))
    && (filtroCat === "__all" || m.categoria_id === filtroCat)
  ), [modelos, busca, filtroCat]);

  const criarModelo = async () => {
    if (!estabId || !novo.titulo.trim()) { toast.error("Informe o título"); return; }
    const { data, error } = await supabase.from("doc_modelos").insert({
      estabelecimento_id: estabId,
      titulo: novo.titulo.trim(),
      descricao: novo.descricao.trim() || null,
      categoria_id: novo.categoria_id === "__none" ? null : novo.categoria_id,
      content_html: "<h1>Novo Documento</h1><p>Comece a escrever aqui…</p>",
      content_json: {},
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setOpenNovo(false);
    setNovo({ titulo: "", descricao: "", categoria_id: "__none" });
    nav(`/editores/modelos/${data.id}`);
  };

  const duplicar = async (m: Modelo) => {
    if (!estabId) return;
    const { data: full } = await supabase.from("doc_modelos").select("*").eq("id", m.id).single();
    if (!full) return;
    const { data, error } = await supabase.from("doc_modelos").insert({
      estabelecimento_id: estabId,
      titulo: (full as any).titulo + " (cópia)",
      descricao: (full as any).descricao,
      categoria_id: (full as any).categoria_id,
      content_html: (full as any).content_html,
      content_json: (full as any).content_json,
      header_html: (full as any).header_html,
      footer_html: (full as any).footer_html,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Modelo duplicado");
    if (estabId) void load(estabId);
  };

  const toggleAtivo = async (m: Modelo) => {
    await supabase.from("doc_modelos").update({ ativo: !m.ativo }).eq("id", m.id);
    if (estabId) void load(estabId);
  };

  const excluir = async () => {
    if (!toDelete) return;
    await supabase.from("doc_modelos").delete().eq("id", toDelete.id);
    setToDelete(null);
    toast.success("Modelo excluído");
    if (estabId) void load(estabId);
  };

  const criarCategoria = async () => {
    if (!estabId || !novaCat.nome.trim()) return;
    const { error } = await supabase.from("doc_categorias").insert({
      estabelecimento_id: estabId,
      nome: novaCat.nome.trim(),
      cor: novaCat.cor,
      ordem: cats.length,
    });
    if (error) { toast.error(error.message); return; }
    setOpenCat(false);
    setNovaCat({ nome: "", cor: "#3b82f6" });
    if (estabId) void load(estabId);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar modelo…" className="pl-8" />
        </div>
        <Select value={filtroCat} onValueChange={setFiltroCat}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas as categorias</SelectItem>
            {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setOpenCat(true)}><Plus className="h-4 w-4 mr-1" /> Categoria</Button>
        <Button onClick={() => setOpenNovo(true)}><Plus className="h-4 w-4 mr-1" /> Novo modelo</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhum modelo. Crie o primeiro.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(m => {
            const cat = cats.find(c => c.id === m.categoria_id);
            return (
              <Card key={m.id} className="p-4 space-y-2 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{m.titulo}</h3>
                    {m.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{m.descricao}</p>}
                  </div>
                  <Badge variant={m.ativo ? "default" : "secondary"}>{m.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {cat && <Badge variant="outline" style={{ borderColor: cat.cor, color: cat.cor }}>{cat.nome}</Badge>}
                  <span>v{m.versao_atual}</span>
                  <span>· Atualizado {new Date(m.updated_at).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Button size="sm" variant="outline" asChild><Link to={`/editores/modelos/${m.id}`}><Edit className="h-3.5 w-3.5 mr-1" /> Editar</Link></Button>
                  <Button size="sm" variant="outline" onClick={() => nav(`/editores/gerar?modelo=${m.id}`)}><Send className="h-3.5 w-3.5 mr-1" /> Gerar</Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicar(m)} title="Duplicar"><Copy className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleAtivo(m)} title={m.ativo ? "Inativar" : "Ativar"}>
                    {m.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setToDelete(m)} title="Excluir"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={openNovo} onOpenChange={setOpenNovo}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo modelo</DialogTitle><DialogDescription>Crie um novo modelo de documento.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Título</label>
              <Input value={novo.titulo} onChange={e => setNovo({ ...novo, titulo: e.target.value })} placeholder="Ex.: Contrato de prestação de serviços" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Input value={novo.descricao} onChange={e => setNovo({ ...novo, descricao: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Select value={novo.categoria_id} onValueChange={v => setNovo({ ...novo, categoria_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sem categoria</SelectItem>
                  {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovo(false)}>Cancelar</Button>
            <Button onClick={criarModelo}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openCat} onOpenChange={setOpenCat}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova categoria</DialogTitle><DialogDescription>Organize seus modelos.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={novaCat.nome} onChange={e => setNovaCat({ ...novaCat, nome: e.target.value })} placeholder="Ex.: Contratos" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cor</label>
              <Input type="color" value={novaCat.cor} onChange={e => setNovaCat({ ...novaCat, cor: e.target.value })} className="h-10 w-20 p-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCat(false)}>Cancelar</Button>
            <Button onClick={criarCategoria}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        onConfirm={excluir}
        title="Excluir modelo?"
        description={`O modelo "${toDelete?.titulo}" será removido. Documentos já gerados a partir dele permanecerão no histórico.`}
      />
    </div>
  );
}
