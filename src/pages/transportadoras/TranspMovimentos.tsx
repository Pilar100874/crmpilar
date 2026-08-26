import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ListChecks, Search, Images, Clock, User, PackageCheck, PackageOpen, FileText } from "lucide-react";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { listarTransportadoras, nomeTransportadora, type TranspEmpresa } from "@/lib/transportadoras/dados";
import { formatarChave, parseChaveNfe } from "@/lib/transportadoras/nfe";

export default function TranspMovimentos() {
  const [rows, setRows] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<TranspEmpresa[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const [fotos, setFotos] = useState<{ mov: any; itens: any[] } | null>(null);

  const load = async () => {
    const [emp, m] = await Promise.all([
      listarTransportadoras(),
      supabase.from("transp_movimentos").select("*").order("entrada_time", { ascending: false }).limit(300),
    ]);
    setEmpresas(emp);
    setRows((m.data ?? []) as any[]);
  };
  useEffect(() => { load(); }, []);

  const empNome = (id: string | null) => nomeTransportadora(empresas.find((e) => e.id === id));

  const filtradas = useMemo(() => rows.filter((r) => {
    if (status !== "todos" && r.status !== status) return false;
    if (!q) return true;
    const t = `${r.placa ?? ""} ${r.motorista_nome ?? ""} ${r.documento ?? ""} ${r.nfe_chave ?? ""} ${empNome(r.transportadora_id)}`.toLowerCase();
    return t.includes(q.toLowerCase());
  }), [rows, q, status, empresas]);

  const abrirFotos = async (mov: any) => {
    const { data } = await supabase
      .from("transp_movimento_fotos")
      .select("*")
      .eq("movimento_id", mov.id)
      .order("created_at");
    const itens = await Promise.all(((data ?? []) as any[]).map(async (f) => {
      const { data: s } = await supabase.storage.from("cv-vehicle-photos").createSignedUrl(f.photo_url, 3600);
      return { ...f, url: s?.signedUrl ?? "" };
    }));
    setFotos({ mov, itens });
  };

  return (
    <div className="space-y-4">
      <CVPageHeader icon={ListChecks} title="Movimentações" subtitle={`${rows.length} registros de transportadoras`} />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar placa, motorista, nota..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="dentro">No pátio</SelectItem>
            <SelectItem value="saiu">Finalizados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtradas.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhuma movimentação encontrada.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((r) => {
            const entrega = (r.tipo_operacao ?? "entrega") === "entrega";
            const nfe = r.nfe_chave ? parseChaveNfe(r.nfe_chave) : null;
            return (
              <Card key={r.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{empNome(r.transportadora_id)}</p>
                      <Badge variant="outline" className="font-mono text-xs mt-1">{r.placa || "—"}</Badge>
                    </div>
                    {r.status === "dentro"
                      ? <Badge className="bg-amber-500/15 text-amber-600 border-0">No pátio</Badge>
                      : <Badge variant="secondary">Finalizado</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{r.motorista_nome || "—"}{r.ajudante_nome ? ` + ${r.ajudante_nome}` : ""}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Entrada: {new Date(r.entrada_time).toLocaleString("pt-BR")}</p>
                  {r.saida_time && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Saída: {new Date(r.saida_time).toLocaleString("pt-BR")}</p>}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge variant="secondary" className="gap-1">
                      {entrega ? <PackageCheck className="h-3 w-3" /> : <PackageOpen className="h-3 w-3" />}
                      {entrega ? "Entrega" : "Coleta"}
                    </Badge>
                    {r.motivo && <Badge variant="outline" className="text-[10px]">{r.motivo}</Badge>}
                  </div>
                  {nfe && (
                    <div className="rounded-md border bg-muted/40 p-2 text-[11px] space-y-0.5">
                      <p className="flex items-center gap-1 font-medium"><FileText className="h-3 w-3" />NF-e nº {nfe.numero} · série {nfe.serie}</p>
                      <p className="text-muted-foreground">Emitente {nfe.cnpj_emitente} · {nfe.uf} · {nfe.emissao}</p>
                      <p className="font-mono text-muted-foreground break-all">{formatarChave(nfe.chave)}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => abrirFotos(r)}>
                      <Images className="h-4 w-4 mr-1" />Fotos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!fotos} onOpenChange={() => setFotos(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Fotos — {fotos?.mov?.placa}</DialogTitle></DialogHeader>
          {fotos && fotos.itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma foto registrada.</p>}
          <div className="grid gap-3 sm:grid-cols-3 max-h-[70vh] overflow-y-auto">
            {fotos?.itens.map((f) => (
              <div key={f.id} className="space-y-1">
                <img src={f.url} alt={`Foto ${f.angle_label ?? ""} da ${f.stage === "entrada" ? "entrada" : "saída"}`} className="w-full rounded-md border object-cover aspect-video" loading="lazy" />
                <p className="text-[11px] text-muted-foreground">
                  {f.stage === "entrada" ? "Entrada" : "Saída"} · {f.angle_label || "Extra"}
                </p>
                {f.caption && <p className="text-[11px]">{f.caption}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
