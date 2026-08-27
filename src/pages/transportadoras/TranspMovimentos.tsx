import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ListChecks, Search, Images, Clock, User, PackageCheck, PackageOpen, FileText, X } from "lucide-react";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { listarTransportadoras, nomeTransportadora, type TranspEmpresa } from "@/lib/transportadoras/dados";
import { formatarChave, parseChaveNfe } from "@/lib/transportadoras/nfe";

export default function TranspMovimentos() {
  const [rows, setRows] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<TranspEmpresa[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [placa, setPlaca] = useState("todas");
  const [motorista, setMotorista] = useState("todos");
  const [fotos, setFotos] = useState<{ mov: any; itens: any[] } | null>(null);

  const load = async () => {
    const [emp, m] = await Promise.all([
      listarTransportadoras(),
      supabase.from("transp_movimentos").select("*").order("entrada_time", { ascending: false }).limit(500),
    ]);
    setEmpresas(emp);
    setRows((m.data ?? []) as any[]);
  };
  useEffect(() => { load(); }, []);

  const empNome = (id: string | null) => nomeTransportadora(empresas.find((e) => e.id === id));

  const placas = useMemo(
    () => Array.from(new Set(rows.map((r) => (r.placa || "").trim()).filter(Boolean))).sort(),
    [rows]
  );
  const motoristas = useMemo(
    () => Array.from(new Set(rows.map((r) => (r.motorista_nome || "").trim()).filter(Boolean))).sort(),
    [rows]
  );

  const filtradas = useMemo(() => rows.filter((r) => {
    if (status !== "todos" && r.status !== status) return false;
    if (placa !== "todas" && (r.placa || "").trim() !== placa) return false;
    if (motorista !== "todos" && (r.motorista_nome || "").trim() !== motorista) return false;
    if (de && new Date(r.entrada_time) < new Date(`${de}T00:00:00`)) return false;
    if (ate && new Date(r.entrada_time) > new Date(`${ate}T23:59:59`)) return false;
    if (!q) return true;
    const t = `${r.placa ?? ""} ${r.motorista_nome ?? ""} ${r.documento ?? ""} ${r.nfe_chave ?? ""} ${empNome(r.transportadora_id)}`.toLowerCase();
    return t.includes(q.toLowerCase());
  }), [rows, q, status, empresas, de, ate, placa, motorista]);

  const limparFiltros = () => { setQ(""); setStatus("todos"); setDe(""); setAte(""); setPlaca("todas"); setMotorista("todos"); };

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

  const tipoBadge = (r: any) => {
    const entrega = (r.tipo_operacao ?? "entrega") === "entrega";
    return (
      <Badge variant="secondary" className="gap-1">
        {entrega ? <PackageCheck className="h-3 w-3" /> : <PackageOpen className="h-3 w-3" />}
        {entrega ? "Entrega" : "Coleta"}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <CVPageHeader icon={ListChecks} title="Movimentações" subtitle={`${filtradas.length} de ${rows.length} registros de transportadoras`} />

      <div className="rounded-lg border p-3 grid grid-cols-2 lg:grid-cols-6 gap-3 bg-muted/30">
        <div className="col-span-2 lg:col-span-2">
          <Label className="text-xs">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Placa, motorista, nota..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div><Label className="text-xs">De</Label><Input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
        <div>
          <Label className="text-xs">Placa</Label>
          <Select value={placa} onValueChange={setPlaca}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover max-h-72">
              <SelectItem value="todas">Todas</SelectItem>
              {placas.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Motorista</Label>
          <Select value={motorista} onValueChange={setMotorista}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover max-h-72">
              <SelectItem value="todos">Todos</SelectItem>
              {motoristas.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="dentro">No pátio</SelectItem>
              <SelectItem value="saiu">Finalizados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 lg:col-span-5 flex items-end justify-end">
          <Button variant="outline" size="sm" onClick={limparFiltros}><X className="h-4 w-4 mr-2" />Limpar filtros</Button>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhuma movimentação encontrada.</CardContent></Card>
      ) : (
        <>
          {/* Tabela no desktop */}
          <div className="hidden lg:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Entrada</th>
                  <th className="px-3 py-2 font-medium">Saída</th>
                  <th className="px-3 py-2 font-medium">Placa</th>
                  <th className="px-3 py-2 font-medium">Motorista</th>
                  <th className="px-3 py-2 font-medium">Transportadora</th>
                  <th className="px-3 py-2 font-medium">Operação</th>
                  <th className="px-3 py-2 font-medium">Porteiro</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.entrada_time).toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.saida_time ? new Date(r.saida_time).toLocaleString("pt-BR") : "-"}</td>
                    <td className="px-3 py-2 font-mono">{r.placa || "-"}</td>
                    <td className="px-3 py-2">{r.motorista_nome || "-"}{r.ajudante_nome ? ` + ${r.ajudante_nome}` : ""}</td>
                    <td className="px-3 py-2">{empNome(r.transportadora_id)}</td>
                    <td className="px-3 py-2">{tipoBadge(r)}</td>
                    <td className="px-3 py-2 text-xs">
                      <div>Entrada: {r.porteiro_entrada_nome || "-"}</div>
                      {r.saida_time && <div className="text-muted-foreground">Saída: {r.porteiro_saida_nome || "-"}</div>}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === "dentro"
                        ? <Badge className="bg-amber-500/15 text-amber-600 border-0">No pátio</Badge>
                        : <Badge variant="secondary">Finalizado</Badge>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => abrirFotos(r)}>
                        <Images className="h-4 w-4 mr-1" />Fotos
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards no celular/tablet */}
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {filtradas.map((r) => {
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
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Entrada: {new Date(r.entrada_time).toLocaleString("pt-BR")}{r.porteiro_entrada_nome ? ` · por ${r.porteiro_entrada_nome}` : ""}</p>
                    {r.saida_time && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Saída: {new Date(r.saida_time).toLocaleString("pt-BR")}{r.porteiro_saida_nome ? ` · por ${r.porteiro_saida_nome}` : ""}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {tipoBadge(r)}
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
        </>
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
