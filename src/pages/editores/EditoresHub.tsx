import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FileText, FileStack, Plus, Search, Copy, Trash2, Edit, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { printHtml } from "@/lib/editores/pdfExport";

interface Modelo {
  id: string; titulo: string; descricao: string | null;
  ativo: boolean; versao_atual: number; updated_at: string;
  content_html?: string;
}
interface Documento {
  id: string; titulo: string; status: string; created_at: string;
  content_html?: string; content_html_final?: string;
  modelo_id: string | null; tipo?: string;
}

export default function EditoresHub() {
  const nav = useNavigate();
  const [estabId, setEstabId] = useState<string | null>(null);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<{ kind: "modelo" | "documento"; item: any } | null>(null);

  const load = async (estab: string) => {
    setLoading(true);
    const [m, d] = await Promise.all([
      supabase.from("doc_modelos").select("id,titulo,descricao,ativo,versao_atual,updated_at,content_html")
        .eq("estabelecimento_id", estab).order("updated_at", { ascending: false }),
      supabase.from("doc_gerados").select("id,titulo,status,created_at,content_html,content_html_final,modelo_id,tipo")
        .eq("estabelecimento_id", estab).order("created_at", { ascending: false }).limit(200),
    ]);
    setModelos((m.data ?? []) as Modelo[]);
    setDocumentos((d.data ?? []) as Documento[]);
    setLoading(false);
  };

  useEffect(() => {
    getEstabelecimentoId().then(id => { setEstabId(id); void load(id); }).catch(() => toast.error("Estabelecimento não encontrado"));
  }, []);

  const filtroModelos = useMemo(
    () => modelos.filter(m => !busca || m.titulo.toLowerCase().includes(busca.toLowerCase())),
    [modelos, busca],
  );
  const filtroDocs = useMemo(
    () => documentos.filter(d => !busca || (d.titulo ?? "").toLowerCase().includes(busca.toLowerCase())),
    [documentos, busca],
  );

  const criarDocumento = () => nav(`/editores/modelos/new?tipo=documento`);



  const duplicarModelo = async (m: Modelo) => {
    if (!estabId) return;
    const { data: full } = await supabase.from("doc_modelos").select("*").eq("id", m.id).single();
    if (!full) return;
    const { error } = await supabase.from("doc_modelos").insert({
      estabelecimento_id: estabId,
      titulo: (full as any).titulo + " (cópia)",
      descricao: (full as any).descricao,
      categoria_id: (full as any).categoria_id,
      content_html: (full as any).content_html,
      content_json: (full as any).content_json,
      header_html: (full as any).header_html,
      footer_html: (full as any).footer_html,
      merge_config: (full as any).merge_config ?? {},
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Duplicado");
    if (estabId) void load(estabId);
  };

  const duplicarDocumento = async (d: Documento) => {
    if (!estabId) return;
    const { data: full } = await supabase.from("doc_gerados").select("*").eq("id", d.id).single();
    if (!full) return;
    const { error } = await supabase.from("doc_gerados").insert({
      estabelecimento_id: estabId,
      titulo: ((full as any).titulo ?? "Documento") + " (cópia)",
      tipo: (full as any).tipo ?? "documento",
      modelo_id: (full as any).modelo_id,
      modelo_versao: (full as any).modelo_versao,
      content_html: (full as any).content_html,
      content_html_final: (full as any).content_html_final,
      dados_merge: (full as any).dados_merge,
      merge_config: (full as any).merge_config ?? {},
      status: "rascunho",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Duplicado");
    if (estabId) void load(estabId);
  };

  const excluir = async () => {
    if (!toDelete) return;
    const table = toDelete.kind === "modelo" ? "doc_modelos" : "doc_gerados";
    await supabase.from(table).delete().eq("id", toDelete.item.id);
    setToDelete(null);
    toast.success("Excluído");
    if (estabId) void load(estabId);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…" className="pl-8" />
        </div>
        <Button onClick={criarDocumento}><Plus className="h-4 w-4 mr-1" /> Criar documento</Button>

      </div>

      {/* Documentos */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <FileStack className="h-4 w-4" /> Documentos ({filtroDocs.length})
        </h2>
        {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : filtroDocs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">Nenhum documento. Clique em "Criar documento".</Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtroDocs.map(d => (
              <Card key={d.id} className="p-4 space-y-2 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold truncate flex-1">{d.titulo}</h3>
                  <Badge variant="secondary" className="text-[10px]">{d.status}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{new Date(d.created_at).toLocaleString("pt-BR")}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {d.modelo_id && (
                    <Button size="sm" variant="outline" onClick={() => nav(`/editores/gerar?id=${d.id}`)}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> Abrir
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => duplicarDocumento(d)} title="Duplicar"><Copy className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => printHtml(d.content_html_final ?? d.content_html ?? "")} title="Imprimir"><Printer className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setToDelete({ kind: "documento", item: d })} title="Excluir"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Modelos */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" /> Modelos ({filtroModelos.length})
        </h2>
        {loading ? null : filtroModelos.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">Nenhum modelo. Clique em "Criar modelo".</Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtroModelos.map(m => (
              <Card key={m.id} className="p-4 space-y-2 hover:shadow-md transition border-primary/20">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold truncate flex-1">{m.titulo}</h3>
                  <Badge variant={m.ativo ? "default" : "secondary"} className="text-[10px]">v{m.versao_atual}</Badge>
                </div>
                {m.descricao && <p className="text-[11px] text-muted-foreground line-clamp-2">{m.descricao}</p>}
                <p className="text-[11px] text-muted-foreground">Atualizado {new Date(m.updated_at).toLocaleDateString("pt-BR")}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Button size="sm" variant="outline" onClick={() => nav(`/editores/modelos/${m.id}`)}><Edit className="h-3.5 w-3.5 mr-1" /> Abrir</Button>
                  <Button size="sm" variant="outline" onClick={() => nav(`/editores/gerar?modelo=${m.id}`)}>Usar</Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicarModelo(m)} title="Duplicar"><Copy className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => printHtml(m.content_html ?? "")} title="Imprimir"><Printer className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setToDelete({ kind: "modelo", item: m })} title="Excluir"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        onConfirm={excluir}
        title={toDelete?.kind === "modelo" ? "Excluir modelo?" : "Excluir documento?"}
        description={`"${toDelete?.item?.titulo}" será removido.`}
      />
    </div>
  );
}
