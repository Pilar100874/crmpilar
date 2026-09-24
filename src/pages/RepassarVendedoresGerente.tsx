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
interface EmpresaVinc { id: string; nome: string; vendedorId: string; vendedorNome: string }

export default function RepassarVendedoresGerente() {
  const [etapa, setEtapa] = useState(1);
  const [estabId, setEstabId] = useState<string | null>(null);
  const [gerentes, setGerentes] = useState<UsuarioGerente[]>([]);
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [empresas, setEmpresas] = useState<EmpresaVinc[]>([]);
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

  const carregarEmpresas = async () => {
    if (!estabId) return;
    const ids = Array.from(selecionados);
    if (!ids.length) { setEmpresas([]); setEmpresasSel(new Set()); return; }
    setLoadingEmp(true);
    const { data: vinc } = await supabase.from("empresa_vinculos")
      .select("empresa_id, vendedor_id")
      .eq("estabelecimento_id", estabId).eq("usuario_id", origem).in("vendedor_id", ids);
    const empIds = Array.from(new Set((vinc || []).map((r: any) => r.empresa_id)));
    let lista: EmpresaVinc[] = [];
    if (empIds.length) {
      const { data: emps } = await supabase.from("empresas").select("id, nome, nome_fantasia").in("id", empIds);
      const nomes = new Map((emps || []).map((e: any) => [e.id, e.nome_fantasia || e.nome || "Sem nome"]));
      const vendNome = new Map(vendedores.map((v) => [v.id, v.nome]));
      lista = (vinc || [])
        .map((r: any) => ({ id: r.empresa_id, nome: nomes.get(r.empresa_id) || "Sem nome", vendedorId: r.vendedor_id, vendedorNome: vendNome.get(r.vendedor_id) || "" }))
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
    () => empresas.filter((e) => e.nome.toLowerCase().includes(buscaEmp.toLowerCase()) || e.vendedorNome.toLowerCase().includes(buscaEmp.toLowerCase())),
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

      // 3) Empresas selecionadas na etapa 3
      const empIds = Array.from(empresasSel);
      if (empIds.length) {
        const { error: e3 } = await supabase.from("empresa_vinculos").update({ usuario_id: destino })
          .eq("estabelecimento_id", estabId).eq("usuario_id", origem).in("empresa_id", empIds).in("vendedor_id", ids);
        if (e3) throw e3;
      }
      toast.success(`${ids.length} vendedor(es) repassado(s) para ${nomeGerente(destino)}`);
      setConfirmar(false);
      setEtapa(1);
      setEmpresas([]);
      setEmpresasSel(new Set());
      await carregarVendedores(origem);
    } catch (err: any) {
      console.error(err);
      toast.error("Não foi possível repassar os vendedores: " + (err?.message || ""));
    } finally {
      setSalvando(false);
    }
  };

  const etapa1Ok = !!(origem && destino && origem !== destino);
  const etapa2Ok = selecionados.size > 0;

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Repassar Vendedores entre Gerentes</CardTitle>
          <CardDescription>
            Etapa {etapa} de 3 — {etapa === 1 ? "escolha os gerentes" : etapa === 2 ? "escolha os vendedores" : "escolha as empresas que vão junto"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {etapa === 1 && (
            <>
              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] items-end">
                <div className="space-y-1">
                  <Label>Gerente atual</Label>
                  <Select value={origem} onValueChange={setOrigem}>
                    <SelectTrigger><SelectValue placeholder="Selecione o gerente de origem" /></SelectTrigger>
                    <SelectContent>{gerentes.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <ArrowRight className="hidden md:block h-5 w-5 mb-2 text-muted-foreground" />
                <div className="space-y-1">
                  <Label>Novo gerente</Label>
                  <Select value={destino} onValueChange={setDestino}>
                    <SelectTrigger><SelectValue placeholder="Selecione o gerente de destino" /></SelectTrigger>
                    <SelectContent>{gerentes.filter((g) => g.id !== origem).map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button disabled={!etapa1Ok} onClick={() => setEtapa(2)}>Avançar</Button>
              </div>
            </>
          )}

          {etapa === 2 && (
            <>
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
                    <span className="text-xs text-muted-foreground">{v.empresas} empresa(s)</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setEtapa(1)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
                <Button disabled={!etapa2Ok} onClick={() => { setEtapa(3); carregarEmpresas(); }}>Avançar</Button>
              </div>
            </>
          )}

          {etapa === 3 && (
            <>
              <p className="text-sm text-muted-foreground">
                Empresas vinculadas diretamente aos vendedores selecionados. Desmarque as que devem continuar com o gerente atual.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Buscar empresa ou vendedor..." value={buscaEmp} onChange={(e) => setBuscaEmp(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" onClick={() => setEmpresasSel(new Set(empresas.map((e) => e.id)))}>Marcar todas</Button>
                <Button variant="outline" size="sm" onClick={() => setEmpresasSel(new Set())}>Desmarcar</Button>
              </div>
              <div className="border rounded-md divide-y max-h-[420px] overflow-y-auto">
                {loadingEmp ? (
                  <div className="p-4 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando empresas...</div>
                ) : empresasFiltradas.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Nenhuma empresa vinculada diretamente a esses vendedores.</div>
                ) : empresasFiltradas.map((e) => (
                  <label key={`${e.id}-${e.vendedorId}`} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={empresasSel.has(e.id)} onCheckedChange={() => toggleEmp(e.id)} />
                    <span className="flex-1 text-sm">{e.nome}</span>
                    <span className="text-xs text-muted-foreground">Vendedor: {e.vendedorNome}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setEtapa(2)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
                <Button onClick={() => setConfirmar(true)}>Repassar ({selecionados.size})</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar repasse</AlertDialogTitle>
            <AlertDialogDescription>
              {selecionados.size} vendedor(es) sairão de <b>{nomeGerente(origem)}</b> e passarão para <b>{nomeGerente(destino)}</b>
              {empresasSel.size > 0
                ? `, junto com ${empresasSel.size} empresa(s) selecionada(s).`
                : ". Nenhuma empresa será transferida; elas continuam com o gerente atual."}
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
