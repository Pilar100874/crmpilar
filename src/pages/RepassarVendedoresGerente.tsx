import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { carregarGerentesEAdministradores, UsuarioGerente } from "@/lib/cadastros/gerentes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface Vendedor { id: string; nome: string; empresas: number }
interface EmpresaDireta { id: string; nome: string }

export default function RepassarVendedoresGerente() {
  const [etapa, setEtapa] = useState(1);
  const [estabId, setEstabId] = useState<string | null>(null);
  const [gerentes, setGerentes] = useState<UsuarioGerente[]>([]);
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [empresas, setEmpresas] = useState<EmpresaDireta[]>([]);
  const [empresasSel, setEmpresasSel] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [buscaEmp, setBuscaEmp] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    (async () => {
      const id = await getEstabelecimentoId();
      if (!id) return;
      setEstabId(id);
      try { setGerentes(await carregarGerentesEAdministradores(id)); } catch { toast.error("Erro ao carregar gerentes"); }
    })();
  }, []);

  const carregarVendedores = async (gerenteId: string) => {
    if (!estabId || !gerenteId) { setVendedores([]); return; }
    setLoading(true);
    const [{ data: gv }, { data: evProprio }, { data: evClientes }] = await Promise.all([
      supabase.from("gerente_vendedores").select("vendedor_empresa_id").eq("estabelecimento_id", estabId).eq("gerente_usuario_id", gerenteId),
      supabase.from("empresa_vinculos").select("empresa_id").eq("estabelecimento_id", estabId).eq("usuario_id", gerenteId).is("vendedor_id", null).is("auto_via_vendedor_id", null),
      supabase.from("empresa_vinculos").select("vendedor_id").eq("estabelecimento_id", estabId).eq("usuario_id", gerenteId).not("vendedor_id", "is", null),
    ]);
    const ids = new Set<string>();
    (gv || []).forEach((r: any) => ids.add(r.vendedor_empresa_id));
    const contagem: Record<string, number> = {};
    (evClientes || []).forEach((r: any) => { ids.add(r.vendedor_id); contagem[r.vendedor_id] = (contagem[r.vendedor_id] || 0) + 1; });
    const candidatos = (evProprio || []).map((r: any) => r.empresa_id);
    let lista: Vendedor[] = [];
    const todos = Array.from(new Set([...ids, ...candidatos]));
    if (todos.length) {
      const { data: emps } = await supabase.from("empresas").select("id, nome, nome_fantasia, tipo_cliente").in("id", todos);
      lista = (emps || [])
        .filter((e: any) => e.tipo_cliente === "vendedor")
        .map((e: any) => ({ id: e.id, nome: e.nome_fantasia || e.nome || "Sem nome", empresas: contagem[e.id] || 0 }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    }
    setVendedores(lista);
    setSelecionados(new Set(lista.map((v) => v.id)));
    setLoading(false);
  };

  useEffect(() => { carregarVendedores(origem); }, [origem, estabId]);

  // Empresas vinculadas diretamente ao gerente de origem (sem vendedor)
  const carregarEmpresas = async () => {
    if (!estabId || !origem) return;
    setLoadingEmp(true);
    const { data: vinc } = await supabase.from("empresa_vinculos")
      .select("empresa_id")
      .eq("estabelecimento_id", estabId).eq("usuario_id", origem)
      .is("vendedor_id", null).is("auto_via_vendedor_id", null);
    const empIds = Array.from(new Set((vinc || []).map((r: any) => r.empresa_id)));
    let lista: EmpresaDireta[] = [];
    if (empIds.length) {
      const { data: emps } = await supabase.from("empresas").select("id, nome, nome_fantasia, tipo_cliente").in("id", empIds);
      lista = (emps || [])
        .filter((e: any) => e.tipo_cliente !== "vendedor")
        .map((e: any) => ({ id: e.id, nome: e.nome_fantasia || e.nome || "Sem nome" }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    }
    setEmpresas(lista);
    setEmpresasSel(new Set(lista.map((e) => e.id)));
    setLoadingEmp(false);
  };

  const filtrados = useMemo(
    () => vendedores.filter((v) => v.nome.toLowerCase().includes(busca.toLowerCase())),
    [vendedores, busca],
  );
  const empresasFiltradas = useMemo(
    () => empresas.filter((e) => e.nome.toLowerCase().includes(buscaEmp.toLowerCase())),
    [empresas, buscaEmp],
  );
  const nomeGerente = (id: string) => gerentes.find((g) => g.id === id)?.nome || "";
  const toggle = (id: string) => setSelecionados((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleEmp = (id: string) => setEmpresasSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const executar = async () => {
    if (!estabId) return;
    setSalvando(true);
    try {
      const ids = Array.from(selecionados);
      if (ids.length) {
        // 1) Tabela de gerente x vendedor
        await supabase.from("gerente_vendedores").delete().eq("estabelecimento_id", estabId).eq("gerente_usuario_id", origem).in("vendedor_empresa_id", ids);
        const { data: jaDestino } = await supabase.from("gerente_vendedores").select("vendedor_empresa_id").eq("estabelecimento_id", estabId).eq("gerente_usuario_id", destino).in("vendedor_empresa_id", ids);
        const existentes = new Set((jaDestino || []).map((r: any) => r.vendedor_empresa_id));
        const novos = ids.filter((id) => !existentes.has(id)).map((id) => ({ estabelecimento_id: estabId, gerente_usuario_id: destino, vendedor_empresa_id: id }));
        if (novos.length) { const { error } = await supabase.from("gerente_vendedores").insert(novos); if (error) throw error; }

        // 2) Gerente responsável no cadastro do vendedor
        const { error: e2 } = await supabase.from("empresa_vinculos").update({ usuario_id: destino })
          .eq("estabelecimento_id", estabId).eq("usuario_id", origem).in("empresa_id", ids).is("vendedor_id", null).is("auto_via_vendedor_id", null);
        if (e2) throw e2;
      }

      // 3) Empresas diretas do gerente selecionadas na etapa 2
      const empIds = Array.from(empresasSel);
      if (empIds.length) {
        const { error: e3 } = await supabase.from("empresa_vinculos").update({ usuario_id: destino })
          .eq("estabelecimento_id", estabId).eq("usuario_id", origem).in("empresa_id", empIds).is("vendedor_id", null).is("auto_via_vendedor_id", null);
        if (e3) throw e3;
      }
      toast.success(`Repasse concluído para ${nomeGerente(destino)}`);
      setConfirmar(false);
      setEtapa(1);
      setEmpresas([]);
      setEmpresasSel(new Set());
      await carregarVendedores(origem);
    } catch (err: any) {
      console.error(err);
      toast.error("Não foi possível repassar: " + (err?.message || ""));
    } finally {
      setSalvando(false);
    }
  };

  const etapa1Ok = !!(origem && destino && origem !== destino && (selecionados.size > 0 || true));

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Repassar Vendedores entre Gerentes</CardTitle>
          <CardDescription>
            Transfira vendedores e empresas de um gerente para outro em 2 etapas:
            {" "}<b>1)</b> escolha os vendedores que serão repassados; <b>2)</b> escolha as empresas do gerente que vão junto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] items-end rounded-md border p-3 bg-muted/30">
            <div className="space-y-1">
              <Label>Gerente atual (de onde saem)</Label>
              <Select value={origem} onValueChange={(v) => { setOrigem(v); setEtapa(1); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o gerente de origem" /></SelectTrigger>
                <SelectContent>{gerentes.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <ArrowRight className="hidden md:block h-5 w-5 mb-2 text-muted-foreground" />
            <div className="space-y-1">
              <Label>Novo gerente (para onde vão)</Label>
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger><SelectValue placeholder="Selecione o gerente de destino" /></SelectTrigger>
                <SelectContent>{gerentes.filter((g) => g.id !== origem).map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {origem && destino && etapa === 1 && (
            <>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Etapa 1 de 2 — Vendedores que serão repassados</h3>
                <p className="text-sm text-muted-foreground">
                  Abaixo estão os vendedores vinculados a <b>{nomeGerente(origem)}</b>. Marque os que passarão a responder
                  a <b>{nomeGerente(destino)}</b>. O cadastro de cada vendedor marcado terá o gerente responsável alterado automaticamente.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Buscar vendedor..." value={busca} onChange={(e) => setBusca(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelecionados(new Set(vendedores.map((v) => v.id)))}>Marcar todos</Button>
                <Button variant="outline" size="sm" onClick={() => setSelecionados(new Set())}>Desmarcar</Button>
              </div>
              <div className="border rounded-md divide-y max-h-[420px] overflow-y-auto">
                {loading ? (
                  <div className="p-4 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando vendedores...</div>
                ) : filtrados.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Nenhum vendedor vinculado a este gerente.</div>
                ) : filtrados.map((v) => (
                  <label key={v.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={selecionados.has(v.id)} onCheckedChange={() => toggle(v.id)} />
                    <span className="flex-1 text-sm">{v.nome}</span>
                    <span className="text-xs text-muted-foreground">{v.empresas} empresa(s) atendida(s)</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => { setEtapa(2); carregarEmpresas(); }}>
                  Avançar para empresas<ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {origem && destino && etapa === 2 && (
            <>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Etapa 2 de 2 — Empresas do gerente que vão junto</h3>
                <p className="text-sm text-muted-foreground">
                  Abaixo estão as empresas vinculadas <b>diretamente</b> a <b>{nomeGerente(origem)}</b> (sem vendedor responsável).
                  Marque as que devem passar para <b>{nomeGerente(destino)}</b>. As que ficarem desmarcadas continuam com o gerente atual.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Buscar empresa..." value={buscaEmp} onChange={(e) => setBuscaEmp(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" onClick={() => setEmpresasSel(new Set(empresas.map((e) => e.id)))}>Marcar todas</Button>
                <Button variant="outline" size="sm" onClick={() => setEmpresasSel(new Set())}>Desmarcar</Button>
              </div>
              <div className="border rounded-md divide-y max-h-[420px] overflow-y-auto">
                {loadingEmp ? (
                  <div className="p-4 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando empresas...</div>
                ) : empresasFiltradas.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Nenhuma empresa vinculada diretamente a este gerente.</div>
                ) : empresasFiltradas.map((e) => (
                  <label key={e.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={empresasSel.has(e.id)} onCheckedChange={() => toggleEmp(e.id)} />
                    <span className="flex-1 text-sm">{e.nome}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setEtapa(1)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar aos vendedores</Button>
                <Button onClick={() => setConfirmar(true)}>
                  Revisar e repassar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar repasse</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>De <b>{nomeGerente(origem)}</b> para <b>{nomeGerente(destino)}</b>:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><b>{selecionados.size}</b> vendedor(es) serão repassados (o gerente responsável no cadastro de cada um será alterado).</li>
                  <li><b>{empresasSel.size}</b> empresa(s) vinculada(s) diretamente ao gerente serão transferidas.</li>
                </ul>
                {empresas.size - empresasSel.size > 0 && (
                  <p>{empresas.size - empresasSel.size} empresa(s) desmarcada(s) continuarão com {nomeGerente(origem)}.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={salvando} onClick={(e) => { e.preventDefault(); executar(); }}>
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirmar repasse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
