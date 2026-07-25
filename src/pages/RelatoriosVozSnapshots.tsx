import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Save, Trash2, Eye, Clock, FileBarChart, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Snapshot = {
  id: string;
  nome: string;
  total_registros: number;
  filtros_aplicados: any;
  dados: any[];
  permanente: boolean;
  expira_em: string;
  created_at: string;
  relatorio_voz_id: string | null;
};

export default function RelatoriosVozSnapshots() {
  const [items, setItems] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [ver, setVer] = useState<Snapshot | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("relatorio_snapshots")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const excluir = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("relatorio_snapshots").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("Snapshot excluído");
    setDeleteId(null); load();
  };

  const togglePermanente = async (s: Snapshot) => {
    const novoValor = !s.permanente;
    const { error } = await supabase.from("relatorio_snapshots")
      .update({ permanente: novoValor, expira_em: novoValor ? new Date(Date.now() + 3650*86400000).toISOString() : new Date(Date.now() + 7*86400000).toISOString() })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(novoValor ? "Marcado como permanente" : "Marcado como temporário (7 dias)");
    load();
  };

  const exportar = (s: Snapshot) => {
    if (!s.dados?.length) return toast.error("Sem dados");
    const ws = XLSX.utils.json_to_sheet(s.dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `${s.nome}.xlsx`);
  };

  const filtered = items.filter(i => !filter.trim() || i.nome.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Save className="h-6 w-6 text-primary" /> Snapshots de relatórios
        </h1>
        <p className="text-sm text-muted-foreground">
          Resultados salvos pelo Assistente Pilar. Snapshots temporários expiram em 7 dias.
        </p>
      </div>

      <Card>
        <CardContent className="p-3">
          <Input placeholder="Filtrar por nome…" value={filter} onChange={e => setFilter(e.target.value)} />
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileBarChart className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p>Nenhum snapshot salvo ainda.</p>
            <p className="text-xs mt-1">Peça um relatório ao Pilar e clique em "Salvar".</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map(s => (
            <Card key={s.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{s.nome}</span>
                    <Badge variant="secondary" className="text-[10px]">{s.total_registros} reg.</Badge>
                    {s.permanente
                      ? <Badge className="text-[10px]">permanente</Badge>
                      : <Badge variant="outline" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />expira {formatDistanceToNow(new Date(s.expira_em), { locale: ptBR, addSuffix: true })}</Badge>
                    }
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Criado {formatDistanceToNow(new Date(s.created_at), { locale: ptBR, addSuffix: true })}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setVer(s)}>
                  <Eye className="h-3 w-3 mr-1" /> Ver
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportar(s)}>
                  <Download className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => togglePermanente(s)}>
                  {s.permanente ? "→ Temporário" : "→ Permanente"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteId(s.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!ver} onOpenChange={o => !o && setVer(null)}>
        <SheetContent side="right" className="w-[95vw] max-w-4xl sm:max-w-4xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-3 border-b">
            <SheetTitle>{ver?.nome}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden p-4">
            {ver?.dados?.length ? (
              <ScrollArea className="h-full">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>{Object.keys(ver.dados[0]).map(c => <th key={c} className="px-2 py-1 text-left whitespace-nowrap">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {ver.dados.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.keys(ver.dados[0]).map(c => (
                          <td key={c} className="px-2 py-1 max-w-[200px] truncate">{row[c] != null ? String(row[c]) : "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-12">Sem dados.</div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={o => !o && setDeleteId(null)}
        onConfirm={excluir}
        title="Excluir snapshot?"
        description="Os dados salvos serão removidos permanentemente."
      />
    </div>
  );
}
