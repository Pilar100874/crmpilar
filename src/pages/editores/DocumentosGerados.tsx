import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { toast } from "@/lib/editores/editorPopup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Eye, Trash2, Copy, Download, Printer, Search } from "lucide-react";
import { downloadHtml, printHtml } from "@/lib/editores/pdfExport";

const STATUS = ["rascunho","gerado","enviado","assinado","cancelado"];

export default function DocumentosGerados() {
  const [estabId, setEstabId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("__all");
  const [preview, setPreview] = useState<any | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);

  const load = async (id: string) => {
    let q = supabase.from("doc_gerados").select("*").eq("estabelecimento_id", id).order("created_at", { ascending: false }).limit(200);
    const { data } = await q;
    setItems((data ?? []) as any[]);
  };

  useEffect(() => { getEstabelecimentoId().then(id => { setEstabId(id); void load(id); }); }, []);

  const filtered = items.filter(i =>
    (filtroStatus === "__all" || i.status === filtroStatus) &&
    (!busca || i.titulo.toLowerCase().includes(busca.toLowerCase()))
  );

  const duplicar = async (i: any) => {
    if (!estabId) return;
    await supabase.from("doc_gerados").insert({
      estabelecimento_id: estabId, modelo_id: i.modelo_id, modelo_versao: i.modelo_versao,
      registro_tipo: i.registro_tipo, registro_id: i.registro_id,
      titulo: i.titulo + " (cópia)", content_html_final: i.content_html_final,
      dados_merge: i.dados_merge, status: "rascunho",
    });
    toast.success("Documento duplicado");
    if (estabId) void load(estabId);
  };

  const excluir = async () => {
    if (!toDelete) return;
    await supabase.from("doc_gerados").delete().eq("id", toDelete.id);
    setToDelete(null);
    toast.success("Excluído");
    if (estabId) void load(estabId);
  };

  const mudarStatus = async (i: any, novo: string) => {
    await supabase.from("doc_gerados").update({ status: novo }).eq("id", i.id);
    if (estabId) void load(estabId);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar documento…" className="pl-8" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos os status</SelectItem>
            {STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.titulo}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{i.registro_tipo}</TableCell>
                <TableCell>
                  <Select value={i.status} onValueChange={(v) => mudarStatus(i, v)}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs">{new Date(i.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => setPreview(i)}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => duplicar(i)}><Copy className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => downloadHtml(i.content_html_final, i.titulo)}><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => printHtml(i.content_html_final)}><Printer className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setToDelete(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum documento gerado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b"><DialogTitle>{preview?.titulo}</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/20 p-6">
            <div className="bg-white text-black shadow-xl mx-auto"
              style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "12pt" }}
              dangerouslySetInnerHTML={{ __html: preview?.content_html_final ?? "" }} />
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        onConfirm={excluir}
        title="Excluir documento?"
        description={`O documento "${toDelete?.titulo}" será removido do histórico.`}
      />
    </div>
  );
}
