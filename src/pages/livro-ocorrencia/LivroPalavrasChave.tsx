import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { KeyRound, Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface PalavraChave {
  id: string;
  palavra: string;
  observacao: string | null;
  ativo: boolean;
  created_at: string;
}

const upper = (v: string) => v.toUpperCase();

export default function LivroPalavrasChave() {
  const [itens, setItens] = useState<PalavraChave[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [palavra, setPalavra] = useState("");
  const [observacao, setObservacao] = useState("");
  const [editing, setEditing] = useState<PalavraChave | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("livro_palavras_chave" as any)
      .select("*")
      .order("palavra", { ascending: true });
    if (error) toast.error("Erro ao carregar palavras-chave");
    setItens((data as any[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    const p = upper(palavra.trim());
    if (!p) {
      toast.warning("Informe a palavra-chave");
      return;
    }
    setSalvando(true);
    const payload = { palavra: p, observacao: observacao.trim() ? upper(observacao.trim()) : null };
    const { error } = editing
      ? await supabase.from("livro_palavras_chave" as any).update(payload as any).eq("id", editing.id)
      : await supabase.from("livro_palavras_chave" as any).insert(payload as any);
    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar palavra-chave");
      return;
    }
    toast.success(editing ? "Palavra-chave atualizada" : "Palavra-chave cadastrada");
    setPalavra("");
    setObservacao("");
    setEditing(null);
    carregar();
  };

  const alternarAtivo = async (item: PalavraChave) => {
    const { error } = await supabase
      .from("livro_palavras_chave" as any)
      .update({ ativo: !item.ativo } as any)
      .eq("id", item.id);
    if (error) {
      toast.error("Erro ao alterar status");
      return;
    }
    carregar();
  };

  const excluir = async () => {
    if (!deletingId) return;
    setExcluindo(true);
    const { error } = await supabase
      .from("livro_palavras_chave" as any)
      .delete()
      .eq("id", deletingId);
    setExcluindo(false);
    setDeletingId(null);
    if (error) {
      toast.error("Erro ao excluir palavra-chave");
      return;
    }
    toast.success("Palavra-chave excluída");
    carregar();
  };

  const iniciarEdicao = (item: PalavraChave) => {
    setEditing(item);
    setPalavra(item.palavra);
    setObservacao(item.observacao ?? "");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold">Palavras-Chave de Recebimento</h2>
          <p className="text-xs text-muted-foreground">
            Palavras/frases que o porteiro deve informar ao entregador no ato do recebimento de mercadorias.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <Input
              placeholder="PALAVRA-CHAVE *"
              value={palavra}
              onChange={(e) => setPalavra(upper(e.target.value))}
              maxLength={120}
            />
            <Textarea
              placeholder="OBSERVAÇÃO (QUANDO/COMO INFORMAR)"
              value={observacao}
              onChange={(e) => setObservacao(upper(e.target.value))}
              rows={1}
              maxLength={500}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {editing ? "Salvar alterações" : "Adicionar"}
            </Button>
            {editing && (
              <Button
                variant="outline"
                onClick={() => { setEditing(null); setPalavra(""); setObservacao(""); }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : itens.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma palavra-chave cadastrada.
        </p>
      ) : (
        <div className="grid gap-2">
          {itens.map((item) => (
            <Card key={item.id} className={item.ativo ? "" : "opacity-60"}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm sm:text-base">{item.palavra}</span>
                    {!item.ativo && <Badge variant="secondary">Inativa</Badge>}
                  </div>
                  {item.observacao && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.observacao}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={item.ativo}
                    onCheckedChange={() => alternarAtivo(item)}
                    aria-label="Ativar/desativar"
                  />
                  <Button variant="ghost" size="icon" onClick={() => iniciarEdicao(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeletingId(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        onConfirm={excluir}
        itemName="esta palavra-chave"
        isLoading={excluindo}
      />
    </div>
  );
}
