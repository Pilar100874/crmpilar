import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Sparkles, Plus, Pencil, Trash2, Loader2, MessageSquareText, Copy } from "lucide-react";

interface Grupo {
  id: string;
  nome: string;
  descritivo_catalogo?: string | null;
}
interface Frase {
  id: string;
  grupo_id: string | null;
  tema: string;
  frase: string;
  ordem: number;
  ativo: boolean;
}
type Escopo = "geral" | "grupo";

const TEMAS_SUGERIDOS = [
  "Promoção", "Institucional", "Lançamento", "Novidade",
  "Benefícios", "Diferencial", "Prova social", "Urgência",
  "Sazonal", "Educacional", "Manter Contato",
];

export default function MarketingMensagensGrupo() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [escopo, setEscopo] = useState<Escopo>("geral");
  const [grupoId, setGrupoId] = useState<string>("");
  const [tema, setTema] = useState<string>("Promoção");
  const [temaCustom, setTemaCustom] = useState<string>("");
  const [frases, setFrases] = useState<Frase[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [editing, setEditing] = useState<Frase | null>(null);
  const [editText, setEditText] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newText, setNewText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Frase | null>(null);
  const [showGerar, setShowGerar] = useState(false);
  const [complemento, setComplemento] = useState("");

  const activeTema = tema === "__custom__" ? temaCustom.trim() : tema;
  const grupoAtual = useMemo(() => grupos.find(g => g.id === grupoId), [grupos, grupoId]);
  const escopoPronto = escopo === "geral" || (escopo === "grupo" && !!grupoId);

  useEffect(() => {
    (async () => {
      const eid = await getEstabelecimentoId();
      if (!eid) return;
      setEstabelecimentoId(eid);
      const { data } = await supabase
        .from("produto_grupos")
        .select("id, nome, descritivo_catalogo")
        .eq("estabelecimento_id", eid)
        .order("nome");
      setGrupos(data || []);
    })();
  }, []);

  useEffect(() => {
    if (escopoPronto && activeTema) loadFrases();
    else setFrases([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo, grupoId, activeTema]);

  const loadFrases = async () => {
    if (!activeTema) return;
    if (escopo === "grupo" && !grupoId) return;
    setLoading(true);
    let q = supabase
      .from("mensagens_grupo_produto")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("tema", activeTema)
      .order("ordem");
    q = escopo === "geral" ? q.is("grupo_id", null) : q.eq("grupo_id", grupoId);
    const { data, error } = await q;
    setLoading(false);
    if (error) { toast.error("Erro ao carregar frases"); return; }
    setFrases((data || []) as Frase[]);
  };

  const abrirGerar = () => {
    if (!escopoPronto || !activeTema) {
      toast.error(escopo === "grupo" ? "Selecione um grupo e um tema" : "Selecione um tema");
      return;
    }
    setComplemento("");
    setShowGerar(true);
  };

  const gerarComIA = async () => {
    if (!activeTema) return;
    if (escopo === "grupo" && !grupoAtual) return;
    setShowGerar(false);
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-mensagens-grupo", {
        body: {
          escopo,
          grupo: escopo === "grupo" ? grupoAtual?.nome : undefined,
          descritivo: escopo === "grupo" ? (grupoAtual?.descritivo_catalogo || "") : "",
          tema: activeTema,
          count: 10,
          complemento: complemento.trim() || undefined,
          existentes: frases.map(f => f.frase),
        },
      });
      if (error) throw error;
      const novas: string[] = data?.frases || [];
      if (!novas.length) { toast.error("A IA não retornou frases"); return; }

      const startOrdem = frases.length;
      const rows = novas.map((f, i) => ({
        estabelecimento_id: estabelecimentoId,
        grupo_id: escopo === "grupo" ? grupoId : null,
        tema: activeTema,
        frase: f,
        ordem: startOrdem + i,
        ativo: true,
      }));
      const { error: insErr } = await supabase.from("mensagens_grupo_produto").insert(rows);
      if (insErr) throw insErr;
      toast.success(`${novas.length} frases geradas`);
      loadFrases();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar frases");
    } finally {
      setGenerating(false);
    }
  };

  const salvarNova = async () => {
    if (!newText.trim() || !activeTema) return;
    if (escopo === "grupo" && !grupoId) return;
    const { error } = await supabase.from("mensagens_grupo_produto").insert({
      estabelecimento_id: estabelecimentoId,
      grupo_id: escopo === "grupo" ? grupoId : null,
      tema: activeTema,
      frase: newText.trim(),
      ordem: frases.length,
      ativo: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Frase adicionada");
    setNewText("");
    setShowNew(false);
    loadFrases();
  };

  const salvarEdit = async () => {
    if (!editing || !editText.trim()) return;
    const { error } = await supabase
      .from("mensagens_grupo_produto")
      .update({ frase: editText.trim() })
      .eq("id", editing.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Frase atualizada");
    setEditing(null);
    loadFrases();
  };

  const excluir = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("mensagens_grupo_produto")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Frase excluída");
    setDeleteTarget(null);
    loadFrases();
  };

  const copiar = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Copiado");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareText className="h-4 w-4 text-primary" />
            Mensagens Automáticas por Grupo de Produtos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Escopo</Label>
              <Select value={escopo} onValueChange={(v) => setEscopo(v as Escopo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="grupo">Por grupo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Grupo de produtos</Label>
              <Select
                value={grupoId}
                onValueChange={setGrupoId}
                disabled={escopo === "geral"}
              >
                <SelectTrigger>
                  <SelectValue placeholder={escopo === "geral" ? "— (não se aplica)" : "Selecione um grupo"} />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {escopo === "grupo" && grupoAtual?.descritivo_catalogo && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {grupoAtual.descritivo_catalogo}
                </p>
              )}
            </div>

            <div>
              <Label>Tema</Label>
              <Select value={tema} onValueChange={setTema}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMAS_SUGERIDOS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">Outro (personalizado)</SelectItem>
                </SelectContent>
              </Select>
              {tema === "__custom__" && (
                <Input
                  className="mt-2"
                  placeholder="Nome do tema"
                  value={temaCustom}
                  onChange={(e) => setTemaCustom(e.target.value)}
                />
              )}
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={abrirGerar}
                disabled={!escopoPronto || !activeTema || generating}
                className="w-full"
              >
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Gerar 10 frases com IA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {escopoPronto && activeTema && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              Frases
              <Badge variant="secondary">{frases.length}</Badge>
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova frase
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : frases.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Nenhuma frase cadastrada. Gere 10 automaticamente com IA ou adicione manualmente.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {frases.map((f, i) => (
                  <div
                    key={f.id}
                    className="group flex items-start gap-2 p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors"
                  >
                    <span className="text-xs font-mono text-muted-foreground w-6 pt-0.5">{i + 1}</span>
                    <p className="flex-1 text-sm">{f.frase}</p>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => copiar(f.frase)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditing(f); setEditText(f.frase); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(f)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Editar */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar frase</DialogTitle></DialogHeader>
          <Textarea rows={4} value={editText} onChange={(e) => setEditText(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={salvarEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova frase</DialogTitle></DialogHeader>
          <Textarea rows={4} value={newText} onChange={(e) => setNewText(e.target.value)}
            placeholder="Escreva a frase..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={salvarNova}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complemento antes de gerar */}
      <Dialog open={showGerar} onOpenChange={setShowGerar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar 10 frases com IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {escopo === "grupo"
                ? <>Grupo: <b>{grupoAtual?.nome}</b> · Tema: <b>{activeTema}</b></>
                : <>Escopo: <b>Geral</b> · Tema: <b>{activeTema}</b></>}
            </p>
            <Label>Complemento (opcional)</Label>
            <Textarea
              rows={4}
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Ex.: foco em varejo, tom descontraído, destacar entrega rápida, público jovem..."
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para gerar sem direcionamentos adicionais.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGerar(false)}>Cancelar</Button>
            <Button onClick={gerarComIA} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar 10 frases
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={excluir}
        title="Excluir frase?"
        description="Esta ação não pode ser desfeita."
      />
    </div>
  );
}
