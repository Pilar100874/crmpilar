import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Trash2, Users, ShieldCheck, FileDown, ClipboardList } from "lucide-react";
import { gerarPdfSetores } from "@/lib/epi/relatorioEpi";
import { toast } from "sonner";
import { episFaltantes } from "@/lib/epi/regrasEpi";

const sb = supabase as any;

export type Setor = { id: string; nome: string };
export type SetorItem = { id: string; setor_id: string; epi_id: string; quantidade: number };
export type FuncSetor = { id: string; usuario_id: string; setor_id: string };

type Props = {
  empresaId: string;
  epis: { id: string; nome: string; tamanho: string | null; ativo: boolean }[];
  funcs: { id: string; nome: string }[];
  entregas: { usuario_id: string; epi_id: string; quantidade: number; data_devolucao: string | null; troca_prevista: string | null }[];
  setores: Setor[]; itens: SetorItem[]; vinculos: FuncSetor[];
  onChange: () => void;
};

export default function EpiSetores({ empresaId, epis, funcs, entregas, setores, itens, vinculos, onChange }: Props) {
  const [novoSetor, setNovoSetor] = useState("");
  const [sel, setSel] = useState<string>("");
  const [addEpi, setAddEpi] = useState("");
  const [excluir, setExcluir] = useState<Setor | null>(null);
  const hoje = new Date().toISOString().slice(0, 10);
  useEffect(() => { if (!sel && setores[0]) setSel(setores[0].id); if (sel && !setores.some((s) => s.id === sel)) setSel(setores[0]?.id ?? ""); }, [setores]);

  const epiNome = useMemo(() => new Map(epis.map((e) => [e.id, `${e.nome}${e.tamanho ? ` (${e.tamanho})` : ""}`])), [epis]);
  const setorDe = useMemo(() => new Map(vinculos.map((v) => [v.usuario_id, v.setor_id])), [vinculos]);
  const itensSel = itens.filter((i) => i.setor_id === sel);
  const situacaoTroca = (t: string | null) => !t ? "Em uso" : t < hoje ? "Troca vencida" : (new Date(t).getTime() - new Date(hoje).getTime()) / 864e5 <= 15 ? "Troca em breve" : "Em uso";
  const resumoSetores = useMemo(() => {
    const grupos = [...setores.map((s) => ({ id: s.id, nome: s.nome })), { id: "", nome: "Sem setor" }];
    return grupos.map((g) => {
      const exig = itens.filter((i) => i.setor_id === g.id);
      const membros = funcs.filter((f) => (setorDe.get(f.id) ?? "") === g.id);
      return {
        id: g.id, setor: g.nome, exigidos: exig.map((i) => `${i.quantidade}× ${epiNome.get(i.epi_id) ?? "—"}`),
        funcionarios: membros.map((f) => {
          const ent = entregas.filter((e) => e.usuario_id === f.id);
          return {
            funcionario: f.nome,
            atuais: ent.filter((e) => !e.data_devolucao).map((e) => ({ epi: epiNome.get(e.epi_id) ?? "—", qtd: e.quantidade, troca: e.troca_prevista ?? "", situacao: situacaoTroca(e.troca_prevista) })),
            faltam: episFaltantes(exig, ent, hoje).map((x) => `${x.falta}× ${epiNome.get(x.epi_id) ?? "—"}`),
          };
        }),
      };
    }).filter((g) => g.id || g.funcionarios.length);
  }, [setores, itens, funcs, setorDe, entregas, epiNome, hoje]);

  const criarSetor = async () => {
    if (!novoSetor.trim()) return toast.error("Informe o nome do setor.");
    const r = await sb.from("epi_setores").insert({ empresa_id: empresaId, nome: novoSetor.trim() }).select("id").single();
    if (r.error) return toast.error(r.error.code === "23505" ? "Já existe um setor com esse nome." : r.error.message);
    setNovoSetor(""); setSel(r.data.id); onChange();
  };
  const incluirEpi = async () => {
    if (!addEpi) return;
    const r = await sb.from("epi_setor_itens").insert({ empresa_id: empresaId, setor_id: sel, epi_id: addEpi, quantidade: 1 });
    if (r.error) return toast.error(r.error.code === "23505" ? "Esse EPI já está no setor." : r.error.message);
    setAddEpi(""); onChange();
  };
  const mudarQtd = async (i: SetorItem, q: number) => {
    if (q < 1) return;
    await sb.from("epi_setor_itens").update({ quantidade: q }).eq("id", i.id); onChange();
  };
  const tirarEpi = async (i: SetorItem) => { await sb.from("epi_setor_itens").delete().eq("id", i.id); onChange(); };
  const definirSetor = async (usuarioId: string, setorId: string) => {
    const r = setorId === "nenhum"
      ? await sb.from("epi_funcionario_setor").delete().eq("empresa_id", empresaId).eq("usuario_id", usuarioId)
      : await sb.from("epi_funcionario_setor").upsert({ empresa_id: empresaId, usuario_id: usuarioId, setor_id: setorId }, { onConflict: "empresa_id,usuario_id" });
    if (r.error) return toast.error(r.error.message);
    onChange();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <p className="lg:col-span-2 text-sm text-muted-foreground rounded-md border bg-muted/40 p-3">
        <b>Como usar:</b> 1) crie os setores e diga quais EPIs cada um exige · 2) escolha o setor de cada funcionário · 3) veja abaixo, por setor, os EPIs atuais e o que falta entregar, e gere o PDF.
      </p>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Setores e EPIs obrigatórios</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Novo setor (ex.: Produção)" value={novoSetor} onChange={(e) => setNovoSetor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && criarSetor()} />
            <Button onClick={criarSetor}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {setores.map((s) => (
              <Button key={s.id} size="sm" variant={s.id === sel ? "default" : "outline"} onClick={() => setSel(s.id)}>
                {s.nome} <span className="ml-1 opacity-70">({vinculos.filter((v) => v.setor_id === s.id).length})</span>
              </Button>
            ))}
            {!setores.length && <p className="text-sm text-muted-foreground">Nenhum setor cadastrado.</p>}
          </div>
          {sel && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex gap-2">
                <Select value={addEpi} onValueChange={setAddEpi}>
                  <SelectTrigger className="min-w-0"><SelectValue placeholder="Adicionar EPI ao setor" /></SelectTrigger>
                  <SelectContent>{epis.filter((e) => e.ativo && !itensSel.some((i) => i.epi_id === e.id)).map((e) => <SelectItem key={e.id} value={e.id}>{epiNome.get(e.id)}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" onClick={incluirEpi} disabled={!addEpi}>Incluir</Button>
              </div>
              {itensSel.map((i) => (
                <div key={i.id} className="flex items-center gap-2 border rounded-md p-2">
                  <span className="flex-1 min-w-0 truncate text-sm">{epiNome.get(i.epi_id) ?? "—"}</span>
                  <Input type="number" min={1} className="w-16 h-8" value={i.quantidade} onChange={(e) => mudarQtd(i, Number(e.target.value))} aria-label="Quantidade" />
                  <Button size="icon" variant="ghost" onClick={() => tirarEpi(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {!itensSel.length && <p className="text-sm text-muted-foreground">Nenhum EPI exigido neste setor.</p>}
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setExcluir(setores.find((s) => s.id === sel) ?? null)}><Trash2 className="h-4 w-4 mr-1" />Excluir setor</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Setor de cada funcionário</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {funcs.map((f) => {
            const sid = setorDe.get(f.id);
            const faltam = sid ? episFaltantes(itens.filter((i) => i.setor_id === sid), entregas.filter((e) => e.usuario_id === f.id), hoje) : [];
            return (
              <div key={f.id} className="border rounded-md p-2 space-y-1">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <span className="font-medium text-sm min-w-0 truncate">{f.nome}</span>
                  <Select value={sid ?? "nenhum"} onValueChange={(v) => definirSetor(f.id, v)}>
                    <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="nenhum">Sem setor</SelectItem>{setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {sid && (faltam.length
                  ? <div className="flex flex-wrap gap-1">{faltam.map((x) => <Badge key={x.epi_id} variant="destructive">Falta {x.falta}× {epiNome.get(x.epi_id)}</Badge>)}</div>
                  : <Badge variant="secondary">EPIs do setor em dia</Badge>)}
              </div>
            );
          })}
          {!funcs.length && <p className="text-sm text-muted-foreground">Nenhum usuário marcado com "Usa EPI".</p>}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />Situação por setor</CardTitle>
          <Button size="sm" variant="outline" onClick={() => gerarPdfSetores(resumoSetores)} disabled={!resumoSetores.length}><FileDown className="h-4 w-4 mr-1" />PDF de todos os setores</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {resumoSetores.map((g) => (
            <div key={g.id || "sem"} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1">
                <div className="min-w-0"><p className="font-semibold">{g.setor}</p><p className="text-xs text-muted-foreground">Exige: {g.exigidos.join(", ") || "nenhum EPI definido"}</p></div>
                <Button size="sm" variant="ghost" onClick={() => gerarPdfSetores([g])}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {g.funcionarios.map((f) => (
                  <div key={f.funcionario} className="rounded-md border p-2 space-y-1 text-sm">
                    <p className="font-medium">{f.funcionario}</p>
                    <div className="flex flex-wrap gap-1">
                      {f.atuais.map((a, i) => <Badge key={i} variant={a.situacao === "Troca vencida" ? "destructive" : a.situacao === "Troca em breve" ? "outline" : "secondary"}>{a.qtd}× {a.epi} · {a.situacao}</Badge>)}
                      {!f.atuais.length && <span className="text-xs text-muted-foreground">Nenhum EPI em uso</span>}
                    </div>
                    {g.id && (f.faltam.length
                      ? <p className="text-xs text-destructive">Falta entregar: {f.faltam.join(", ")}</p>
                      : <p className="text-xs text-muted-foreground">Tudo que o setor exige está entregue.</p>)}
                  </div>
                ))}
                {!g.funcionarios.length && <p className="text-sm text-muted-foreground">Nenhum funcionário neste setor.</p>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <DeleteConfirmDialog open={!!excluir} onOpenChange={(o: boolean) => !o && setExcluir(null)}
        onConfirm={async () => { await sb.from("epi_setores").delete().eq("id", excluir!.id); setExcluir(null); onChange(); }}
        title="Excluir setor" description={`Excluir o setor "${excluir?.nome}"? Os funcionários ficam sem setor.`} />
    </div>
  );
}
