import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Users, Eye, Loader2, MessageSquare } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

interface Props {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

interface VendedorRow {
  id: string;
  nome: string | null;
  nome_fantasia: string | null;
  whatsapp: string | null;
  telefone: string | null;
  segmento_id: string | null;
  gerente_usuario_id?: string | null;
  gerente_nome?: string | null;
  gerente_whatsapp?: string | null;
  kind?: "vendedor" | "empresa";
}

export const BroadcastVendedoresConfig = ({ config, handleConfigChange }: Props) => {
  const [estabId, setEstabId] = useState<string>("");
  const [segmentos, setSegmentos] = useState<Array<{ id: string; nome: string; is_prospect: boolean }>>([]);
  const [gerentes, setGerentes] = useState<Array<{ id: string; nome: string }>>([]);
  const [preview, setPreview] = useState<VendedorRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ---------- Cascata: público → subfiltro → entidade ----------
  const audiencia: string = config.audiencia || "vendedores";
  const subFiltro: string = config.subFiltro || (audiencia === "empresas" ? "segmento" : "todos");
  const especificoTipo: string = config.especificoTipo || "empresa";
  const especificoAlvoId: string = config.especificoAlvoId || "";

  const gerenteId = config.gerenteId || "";
  const segmentoId = config.segmentoId || "";
  const publicoEmpresas: string = config.publicoEmpresas || "cliente";
  const message = config.message || "";
  const usarMensagemPreDefinida = !!config.usarMensagemPreDefinida;
  const preDefinidaVar = config.preDefinidaVar || "last_mensagem_pre_definida";
  const enviarContato = !!config.enviarContato;

  const derivarFiltroTipo = (aud: string, sub: string) => {
    if (aud === "especifico") return "especifico";
    if (aud === "empresas") {
      if (sub === "segmento") return "empresas_segmento";
      if (sub === "gerente_especifico") return "empresas_gerente_especifico";
      return "empresas_com_gerente";
    }
    if (sub === "com_gerente") return "com_gerente";
    if (sub === "gerente_especifico") return "gerente_especifico";
    if (sub === "segmento") return "segmento";
    return "todos";
  };

  useEffect(() => {
    const ft = derivarFiltroTipo(audiencia, subFiltro);
    if (config.filtroTipo !== ft) handleConfigChange("filtroTipo", ft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audiencia, subFiltro]);

  const setAudiencia = (v: string) => {
    handleConfigChange("audiencia", v);
    const defaultSub = v === "empresas" ? "segmento" : v === "vendedores" ? "todos" : "";
    handleConfigChange("subFiltro", defaultSub);
  };

  const [alvosLoading, setAlvosLoading] = useState(false);
  const [alvos, setAlvos] = useState<Array<{ id: string; nome: string; contato?: string }>>([]);
  const [alvoSearch, setAlvoSearch] = useState("");

  useEffect(() => {
    (async () => {
      const eid = await getEstabelecimentoId();
      if (!eid) return;
      setEstabId(eid);

      const { data: segs } = await supabase
        .from("segmentos")
        .select("id, nome, is_prospect")
        .eq("estabelecimento_id", eid)
        .order("nome");
      setSegmentos((segs as any) || []);

      const { data: us } = await supabase
        .from("usuarios")
        .select("id, nome, tipo")
        .eq("estabelecimento_id", eid)
        .eq("tipo", "gerente")
        .order("nome");
      setGerentes(((us as any) || []).map((u: any) => ({ id: u.id, nome: u.nome || u.email || u.id })));
    })();
  }, []);

  useEffect(() => {
    if (audiencia !== "especifico" || !estabId) return;
    (async () => {
      setAlvosLoading(true);
      try {
        if (especificoTipo === "gerente") {
          const { data, error } = await supabase
            .from("usuarios")
            .select("id, nome, email, telefone")
            .eq("estabelecimento_id", estabId)
            .eq("tipo", "gerente")
            .order("nome");
          if (error) console.error("Erro ao carregar gerentes:", error);
          setAlvos(((data as any) || []).map((u: any) => ({
            id: u.id, nome: u.nome || u.email || u.id, contato: u.telefone || "",
          })));
        } else {
          let q = supabase
            .from("empresas")
            .select("id, nome, nome_fantasia, whatsapp, telefone, tipo_cliente")
            .eq("estabelecimento_id", estabId)
            .eq("ativo", true)
            .order("nome");
          if (especificoTipo === "vendedor") {
            q = q.eq("tipo_cliente", "vendedor");
          } else {
            // empresa = clientes/prospects (exclui vendedor e transportadora)
            q = q.not("tipo_cliente", "in", "(vendedor,transportadora)");
          }
          const { data } = await q;
          setAlvos(((data as any) || []).map((e: any) => ({
            id: e.id,
            nome: e.nome_fantasia || e.nome || e.id,
            contato: e.whatsapp || e.telefone || "",
          })));
        }
      } finally {
        setAlvosLoading(false);
      }
    })();
  }, [audiencia, especificoTipo, estabId]);

  const alvosFiltrados = useMemo(() => {
    const q = alvoSearch.trim().toLowerCase();
    if (!q) return alvos.slice(0, 100);
    return alvos.filter((a) => a.nome.toLowerCase().includes(q) || (a.contato || "").toLowerCase().includes(q)).slice(0, 100);
  }, [alvos, alvoSearch]);

  const resolveDestinatarios = async (): Promise<VendedorRow[]> => {
    if (!estabId) return [];
    const ft = derivarFiltroTipo(audiencia, subFiltro);

    if (ft === "especifico") {
      if (!especificoAlvoId) return [];
      if (especificoTipo === "gerente") {
        const { data } = await supabase
          .from("usuarios").select("id, nome, whatsapp, telefone")
          .eq("id", especificoAlvoId).maybeSingle();
        if (!data) return [];
        const phone = ((data as any).whatsapp || (data as any).telefone || "").replace(/\D/g, "");
        if (phone.length < 10) return [];
        return [{
          id: (data as any).id, nome: (data as any).nome, nome_fantasia: null,
          whatsapp: (data as any).whatsapp, telefone: (data as any).telefone,
          segmento_id: null, gerente_usuario_id: (data as any).id, gerente_nome: (data as any).nome,
          kind: "vendedor",
        }];
      }
      const { data } = await supabase
        .from("empresas").select("id, nome, nome_fantasia, whatsapp, telefone, segmento_id, tipo_cliente")
        .eq("id", especificoAlvoId).maybeSingle();
      if (!data) return [];
      const phone = ((data as any).whatsapp || (data as any).telefone || "").replace(/\D/g, "");
      if (phone.length < 10) return [];
      return [{
        id: (data as any).id, nome: (data as any).nome, nome_fantasia: (data as any).nome_fantasia,
        whatsapp: (data as any).whatsapp, telefone: (data as any).telefone,
        segmento_id: (data as any).segmento_id,
        kind: (data as any).tipo_cliente === "vendedor" ? "vendedor" : "empresa",
      }];
    }

    if (ft === "empresas_segmento") {
      if (!segmentoId) return [];
      let q = supabase
        .from("empresas")
        .select("id, nome, nome_fantasia, whatsapp, telefone, segmento_id, status_comercial")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .neq("tipo_cliente", "vendedor")
        .eq("segmento_id", segmentoId);
      if (publicoEmpresas === "prospect") q = q.eq("status_comercial", "prospect");
      else if (publicoEmpresas === "cliente") q = q.neq("status_comercial", "prospect");
      if (config.apenasJaResponderam) q = q.eq("ja_respondeu_whatsapp", true);
      const { data } = await q;
      return ((data as any) || [])
        .filter((e: any) => ((e.whatsapp || e.telefone || "").replace(/\D/g, "").length >= 10))
        .map((e: any) => ({
          id: e.id, nome: e.nome, nome_fantasia: e.nome_fantasia,
          whatsapp: e.whatsapp, telefone: e.telefone, segmento_id: e.segmento_id,
          kind: "empresa" as const,
        }));
    }


    const somenteEmpresas = ft === "empresas_com_gerente" || ft === "empresas_gerente_especifico";
    const gerenteEspecificoAtivo = ft === "gerente_especifico" || ft === "empresas_gerente_especifico";

    let rows: VendedorRow[] = [];

    if (!somenteEmpresas) {
      let q = supabase
        .from("empresas")
        .select("id, nome, nome_fantasia, whatsapp, telefone, segmento_id")
        .eq("estabelecimento_id", estabId)
        .eq("tipo_cliente", "vendedor")
        .eq("ativo", true);

      if (ft === "segmento" && segmentoId) q = q.eq("segmento_id", segmentoId);

      const { data: vendedores } = await q;
      rows = (vendedores as any) || [];

      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const { data: gv } = await supabase
          .from("empresa_vinculos")
          .select("vendedor_id, usuario_id, usuarios:usuario_id(id, nome, whatsapp, telefone)")
          .in("vendedor_id", ids)
          .not("usuario_id", "is", null);
        const map = new Map<string, { id: string; nome: string; whatsapp: string | null }>();
        (gv || []).forEach((r: any) => {
          if (r.vendedor_id && r.usuarios?.id && !map.has(r.vendedor_id)) {
            map.set(r.vendedor_id, {
              id: r.usuarios.id,
              nome: r.usuarios.nome || "",
              whatsapp: r.usuarios.whatsapp || r.usuarios.telefone || null,
            });
          }
        });
        rows = rows.map((r) => {
          const g = map.get(r.id);
          return { ...r, gerente_usuario_id: g?.id || null, gerente_nome: g?.nome || null, gerente_whatsapp: g?.whatsapp || null };
        });
      }

      if (ft === "com_gerente") rows = rows.filter((r) => !!r.gerente_usuario_id);
      if (ft === "gerente_especifico" && gerenteId) rows = rows.filter((r) => r.gerente_usuario_id === gerenteId);

      rows = rows.filter((r) => (r.whatsapp || r.telefone || "").replace(/\D/g, "").length >= 10);
      rows = rows.map((r) => ({ ...r, kind: "vendedor" as const }));
    }

    if (somenteEmpresas) {
      const empresasFiltro = gerenteEspecificoAtivo ? "gerente_especifico" : "com_gerente";
      const { data: vinc } = await supabase
        .from("empresa_vinculos")
        .select("empresa_id, usuario_id")
        .eq("estabelecimento_id", estabId)
        .not("usuario_id", "is", null);
      const empresaGerenteMap = new Map<string, string>();
      (vinc || []).forEach((r: any) => {
        if (!r.empresa_id || !r.usuario_id) return;
        if (empresasFiltro === "gerente_especifico" && gerenteId && r.usuario_id !== gerenteId) return;
        if (!empresaGerenteMap.has(r.empresa_id)) empresaGerenteMap.set(r.empresa_id, r.usuario_id);
      });
      const empresaIds = Array.from(empresaGerenteMap.keys());
      if (empresaIds.length) {
        let qEmp = supabase
          .from("empresas")
          .select("id, nome, nome_fantasia, whatsapp, telefone, segmento_id, status_comercial")
          .eq("estabelecimento_id", estabId)
          .eq("ativo", true)
          .in("id", empresaIds);
        if (publicoEmpresas === "prospect") qEmp = qEmp.eq("status_comercial", "prospect");
        else if (publicoEmpresas === "cliente") qEmp = qEmp.neq("status_comercial", "prospect");
        if (config.apenasJaResponderam) qEmp = qEmp.eq("ja_respondeu_whatsapp", true);
        const { data: emps } = await qEmp;

        const gerIds = Array.from(new Set(Array.from(empresaGerenteMap.values())));
        const gerentesUsersMap = new Map<string, { nome: string; whatsapp: string | null }>();
        if (gerIds.length) {
          const { data: us } = await supabase.from("usuarios").select("id, nome, whatsapp, telefone").in("id", gerIds);
          (us || []).forEach((u: any) => gerentesUsersMap.set(u.id, { nome: u.nome || "", whatsapp: u.whatsapp || u.telefone || null }));
        }
        (emps || []).forEach((e: any) => {
          const phone = (e.whatsapp || e.telefone || "").replace(/\D/g, "");
          if (phone.length < 10) return;
          const gid = empresaGerenteMap.get(e.id) || null;
          const gInfo = gid ? gerentesUsersMap.get(gid) : null;
          rows.push({
            id: e.id, nome: e.nome, nome_fantasia: e.nome_fantasia,
            whatsapp: e.whatsapp, telefone: e.telefone, segmento_id: e.segmento_id,
            gerente_usuario_id: gid, gerente_nome: gInfo?.nome || null, gerente_whatsapp: gInfo?.whatsapp || null,
            kind: "empresa",
          });
        });
      }
    }

    return rows;
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    setPreviewOpen(true);
    try {
      const rows = await resolveDestinatarios();
      setPreview(rows);
    } finally {
      setLoadingPreview(false);
    }
  };

  const totalPreview = preview.length;

  const segClientes = segmentos.filter((s) => !s.is_prospect);
  const segProspects = segmentos.filter((s) => s.is_prospect);
  const mostraSegmento = (audiencia === "vendedores" && subFiltro === "segmento")
    || (audiencia === "empresas" && subFiltro === "segmento");
  const mostraGerente = (audiencia === "vendedores" && subFiltro === "gerente_especifico")
    || (audiencia === "empresas" && subFiltro === "gerente_especifico");
  const mostraPublicoEmpresas = audiencia === "empresas";

  return (
    <div className="space-y-4">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Escolha em cascata: público → filtro → entidade. Compartilha um contato opcional após a mensagem.
        </AlertDescription>
      </Alert>

      {/* CASCATA 1: Público-alvo */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">1. Público-alvo</Label>
        <Select value={audiencia} onValueChange={setAudiencia}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vendedores" className="text-xs">Vendedores</SelectItem>
            <SelectItem value="empresas" className="text-xs">Empresas (clientes/prospects)</SelectItem>
            <SelectItem value="especifico" className="text-xs">Destinatário específico (empresa, vendedor ou gerente)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* CASCATA 2: Filtro */}
      {audiencia === "vendedores" && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">2. Filtro de vendedores</Label>
          <Select value={subFiltro} onValueChange={(v) => handleConfigChange("subFiltro", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos os vendedores</SelectItem>
              <SelectItem value="com_gerente" className="text-xs">Somente com gerente vinculado</SelectItem>
              <SelectItem value="gerente_especifico" className="text-xs">De um gerente específico</SelectItem>
              <SelectItem value="segmento" className="text-xs">De um segmento específico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {audiencia === "empresas" && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">2. Filtro de empresas</Label>
          <Select value={subFiltro} onValueChange={(v) => handleConfigChange("subFiltro", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="segmento" className="text-xs">De um segmento (independe de vínculo)</SelectItem>
              <SelectItem value="com_gerente" className="text-xs">Vinculadas a qualquer gerente</SelectItem>
              <SelectItem value="gerente_especifico" className="text-xs">Vinculadas a um gerente específico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {audiencia === "especifico" && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">2. Tipo do destinatário</Label>
          <Select value={especificoTipo} onValueChange={(v) => { handleConfigChange("especificoTipo", v); handleConfigChange("especificoAlvoId", ""); setAlvoSearch(""); }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="empresa" className="text-xs">Empresa</SelectItem>
              <SelectItem value="vendedor" className="text-xs">Vendedor</SelectItem>
              <SelectItem value="gerente" className="text-xs">Gerente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* CASCATA 3 */}
      {mostraGerente && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold">3. Gerente</Label>
          <Select value={gerenteId} onValueChange={(v) => handleConfigChange("gerenteId", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {gerentes.map((g) => (
                <SelectItem key={g.id} value={g.id} className="text-xs">{g.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {mostraSegmento && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold">3. Segmento</Label>
          <Select value={segmentoId} onValueChange={(v) => handleConfigChange("segmentoId", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o segmento..." /></SelectTrigger>
            <SelectContent>
              {segClientes.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase text-muted-foreground">Segmentos de Cliente</SelectLabel>
                  {segClientes.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.nome}</SelectItem>
                  ))}
                </SelectGroup>
              )}
              {segProspects.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase text-muted-foreground">Segmentos de Prospect</SelectLabel>
                  {segProspects.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.nome}</SelectItem>
                  ))}
                </SelectGroup>
              )}
              {segmentos.length === 0 && (
                <div className="px-2 py-1 text-[11px] text-muted-foreground">Nenhum segmento cadastrado</div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {audiencia === "especifico" && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold">3. Selecione {especificoTipo === "empresa" ? "a empresa" : especificoTipo === "vendedor" ? "o vendedor" : "o gerente"}</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Buscar por nome ou telefone..."
            value={alvoSearch}
            onChange={(e) => setAlvoSearch(e.target.value)}
          />
          <div className="max-h-[180px] overflow-y-auto rounded border border-dashed bg-muted/10">
            {alvosLoading && <div className="p-2 text-[11px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</div>}
            {!alvosLoading && alvosFiltrados.length === 0 && (
              <div className="p-2 text-[11px] text-muted-foreground">Nenhum resultado.</div>
            )}
            {!alvosLoading && alvosFiltrados.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => handleConfigChange("especificoAlvoId", a.id)}
                className={`w-full text-left px-2 py-1 text-[11px] hover:bg-accent flex items-center justify-between ${especificoAlvoId === a.id ? "bg-accent" : ""}`}
              >
                <span className="truncate">{a.nome}</span>
                <span className="text-muted-foreground shrink-0 ml-2">{a.contato}</span>
              </button>
            ))}
          </div>
          {especificoAlvoId && (
            <p className="text-[10px] text-muted-foreground">
              Selecionado: <b>{alvos.find((a) => a.id === especificoAlvoId)?.nome || especificoAlvoId}</b>
            </p>
          )}
        </div>
      )}

      {/* Público das empresas */}
      {mostraPublicoEmpresas && (
        <div className="space-y-1">
          <Label className="text-xs">Público das empresas</Label>
          <Select value={publicoEmpresas} onValueChange={(v) => handleConfigChange("publicoEmpresas", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cliente" className="text-xs">Somente clientes</SelectItem>
              <SelectItem value="prospect" className="text-xs">Somente prospects</SelectItem>
              <SelectItem value="ambos" className="text-xs">Clientes e prospects</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">Filtra pelo status comercial (prospect x cliente).</p>
        </div>
      )}

      {/* Filtro: apenas quem já respondeu algum bot */}
      {audiencia === "empresas" && (
        <div className="flex items-start gap-2 rounded-md border p-2 bg-muted/10">
          <Checkbox
            id="apenas_ja_responderam"
            checked={!!config.apenasJaResponderam}
            onCheckedChange={(v) => handleConfigChange("apenasJaResponderam", !!v)}
          />
          <label htmlFor="apenas_ja_responderam" className="text-xs leading-tight">
            <b>Somente empresas que já responderam algum bot</b>
            <p className="text-[10px] text-muted-foreground mt-0.5">Usa o marcador do cadastro da empresa (atualizado quando a empresa responde a um envio).</p>
          </label>
        </div>
      )}




      {/* Preview em popup */}
      <div className="flex items-center justify-between rounded-md border border-dashed p-3 bg-muted/20">
        <div>
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Eye className="h-3 w-3" /> Pré-visualização dos destinatários
          </Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Simule a lista final com os filtros escolhidos.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handlePreview} disabled={loadingPreview}>
          {loadingPreview ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
          Ver destinatários
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Destinatários do envio
            </DialogTitle>
            <DialogDescription>
              Lista simulada com base nos filtros configurados no bloco.
            </DialogDescription>
          </DialogHeader>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Calculando destinatários...
            </div>
          ) : preview.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum destinatário encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const nv = preview.filter((r) => r.kind !== "empresa").length;
                const ne = preview.filter((r) => r.kind === "empresa").length;
                return (
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{totalPreview} destinatário(s)</Badge>
                    <Badge variant="outline">{nv} vendedor(es)</Badge>
                    {ne > 0 && <Badge variant="outline">{ne} empresa(s)</Badge>}
                  </div>
                );
              })()}
              <div className="max-h-[55vh] overflow-y-auto space-y-3 border rounded-md p-2 bg-muted/10">
                {(() => {
                  const segMap = new Map(segmentos.map((s) => [s.id, s.nome]));
                  // Grupo = Segmento; Subgrupo = Gerente
                  const grupos = new Map<string, Map<string, VendedorRow[]>>();
                  preview.forEach((r) => {
                    const gNome = (r.segmento_id && segMap.get(r.segmento_id)) || "Sem segmento";
                    const sNome = r.gerente_nome || "Sem gerente";
                    if (!grupos.has(gNome)) grupos.set(gNome, new Map());
                    const sub = grupos.get(gNome)!;
                    if (!sub.has(sNome)) sub.set(sNome, []);
                    sub.get(sNome)!.push(r);
                  });
                  const gruposArr = Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                  return gruposArr.map(([grupo, subs]) => {
                    const totalGrupo = Array.from(subs.values()).reduce((acc, arr) => acc + arr.length, 0);
                    const subsArr = Array.from(subs.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                    return (
                      <div key={grupo} className="rounded-md border bg-background">
                        <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/40 rounded-t-md">
                          <span className="text-xs font-semibold">📁 {grupo}</span>
                          <Badge variant="secondary" className="text-[10px]">{totalGrupo}</Badge>
                        </div>
                        <div className="p-2 space-y-2">
                          {subsArr.map(([sub, rows]) => {
                            const gerWa = rows.find((x) => x.gerente_whatsapp)?.gerente_whatsapp || "";
                            const gerWaDigits = gerWa.replace(/\D/g, "");
                            return (
                            <div key={sub} className="rounded border bg-muted/10">
                              <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/20 gap-2">
                                <span className="text-[11px] font-medium flex items-center gap-1.5 truncate">
                                  <span>👤 {sub}</span>
                                  {gerWaDigits.length >= 10 && (
                                    <a
                                      href={`https://web.whatsapp.com/send?phone=${gerWaDigits}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-muted-foreground hover:text-primary tabular-nums"
                                    >
                                      · {gerWa}
                                    </a>
                                  )}
                                </span>
                                <Badge variant="outline" className="text-[10px]">{rows.length}</Badge>
                              </div>
                              <div className="divide-y">
                                {rows.map((r) => (
                                  <div key={`${r.kind}-${r.id}`} className="text-xs px-2 py-1.5 flex items-center justify-between gap-2">
                                    <span className="truncate flex items-center gap-1.5">
                                      <Badge variant={r.kind === "empresa" ? "default" : "secondary"} className="text-[9px] px-1 py-0">
                                        {r.kind === "empresa" ? "empresa" : "vendedor"}
                                      </Badge>
                                      <span className="font-medium truncate">{r.nome_fantasia || r.nome || r.id}</span>
                                    </span>
                                    <a
                                      href={`https://web.whatsapp.com/send?phone=${(r.whatsapp || r.telefone || "").replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-primary shrink-0 tabular-nums"
                                    >
                                      {r.whatsapp || r.telefone || "—"}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={handlePreview} disabled={loadingPreview}>
                  <Loader2 className={`h-3 w-3 mr-1 ${loadingPreview ? "animate-spin" : "hidden"}`} />
                  Recalcular
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Mensagem */}
      <div className="space-y-2 border-t pt-3">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> Mensagem a enviar
        </Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="usar_pre_def"
            checked={usarMensagemPreDefinida}
            onCheckedChange={(v) => handleConfigChange("usarMensagemPreDefinida", !!v)}
          />
          <label htmlFor="usar_pre_def" className="text-xs">
            Usar <b>texto e/ou mídia de um bloco anterior</b> (Mensagem Pré Definida, Gerar Mídia IA, Upload, etc.)
          </label>
        </div>
        {usarMensagemPreDefinida ? (
          <div className="space-y-2 rounded-md border p-2 bg-muted/10">
            <div className="space-y-1">
              <Label className="text-[11px]">Variável do <b>texto</b> (opcional)</Label>
              <Input
                className="h-8 text-xs"
                value={preDefinidaVar}
                onChange={(e) => handleConfigChange("preDefinidaVar", e.target.value)}
                placeholder="last_mensagem_pre_definida"
              />
              <p className="text-[10px] text-muted-foreground">
                Ex.: <code>last_mensagem_pre_definida</code>, <code>resposta_ia</code>, ou qualquer variável do fluxo. Deixe vazio para enviar só a mídia.
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Variável da <b>mídia</b> (imagem/vídeo, opcional)</Label>
              <Input
                className="h-8 text-xs"
                value={config.mediaVar || ""}
                onChange={(e) => handleConfigChange("mediaVar", e.target.value)}
                placeholder="last_generated_media_url"
              />
              <p className="text-[10px] text-muted-foreground">
                Padrão: <code>last_generated_media_url</code> (gerada pelo bloco anterior). Aceita URL vinda de qualquer bloco.
              </p>
            </div>
            <Textarea
              className="text-xs min-h-[60px]"
              placeholder="Opcional: texto adicional a enviar junto (usa {{variavel}})."
              value={message}
              onChange={(e) => handleConfigChange("message", e.target.value)}
            />
          </div>
        ) : (
          <Textarea
            className="text-xs min-h-[80px]"
            placeholder="Escreva a mensagem. Use {{variavel}} para interpolar."
            value={message}
            onChange={(e) => handleConfigChange("message", e.target.value)}
          />
        )}

        <div className="grid grid-cols-1 gap-2 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">Texto <b>ANTES</b> do conteúdo (opcional)</Label>
            <Textarea
              className="text-xs min-h-[60px]"
              placeholder="Ex.: Olá {{gerente.nome}}, segue material para {{vendedor.nome}}:"
              value={config.textoAntes || ""}
              onChange={(e) => handleConfigChange("textoAntes", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Texto <b>DEPOIS</b> do conteúdo (opcional)</Label>
            <Textarea
              className="text-xs min-h-[60px]"
              placeholder="Ex.: Qualquer dúvida, chame o gerente {{gerente.nome}} ({{gerente.whatsapp}})."
              value={config.textoDepois || ""}
              onChange={(e) => handleConfigChange("textoDepois", e.target.value)}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Variáveis por destinatário: <code>{`{{vendedor.nome}}`}</code>, <code>{`{{vendedor.whatsapp}}`}</code>, <code>{`{{vendedor.telefone}}`}</code>, <code>{`{{gerente.nome}}`}</code>, <code>{`{{gerente.whatsapp}}`}</code>, <code>{`{{gerente.telefone}}`}</code>, <code>{`{{empresa.nome}}`}</code>, <code>{`{{empresa.nome_fantasia}}`}</code>, <code>{`{{empresa.whatsapp}}`}</code>, <code>{`{{empresa.telefone}}`}</code>, <code>{`{{empresa.email}}`}</code>, <code>{`{{empresa.cidade}}`}</code>, <code>{`{{empresa.uf}}`}</code>, <code>{`{{empresa.cnpj}}`}</code>. Também aceita qualquer <code>{`{{variavel}}`}</code> do fluxo.
          </p>
        </div>
      </div>


      <Alert>
        <MessageSquare className="h-4 w-4" />
        <AlertDescription className="text-[11px]">
          Para <b>simular sem enviar de verdade</b>, deixe o botão <b>Modo real</b> do simulador desligado. A pré-visualização mostrará cada destinatário, o texto interpolado e a mídia.
        </AlertDescription>
      </Alert>

      {/* Envio de contato */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="enviar_contato"
            checked={enviarContato}
            onCheckedChange={(v) => handleConfigChange("enviarContato", !!v)}
          />
          <label htmlFor="enviar_contato" className="text-xs font-semibold">
            Enviar contato logo após a mensagem
          </label>
        </div>
        {enviarContato && (
          <div className="space-y-2 rounded-md border p-3">
            <div className="space-y-1">
              <Label className="text-xs">Qual contato compartilhar?</Label>
              <Select
                value={config.contatoTipo || "gerente_do_vendedor"}
                onValueChange={(v) => handleConfigChange("contatoTipo", v)}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gerente_do_vendedor" className="text-xs">Gerente do vendedor (dinâmico por destinatário)</SelectItem>
                  <SelectItem value="fixo" className="text-xs">Contato fixo (mesmo para todos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(config.contatoTipo || "gerente_do_vendedor") === "gerente_do_vendedor" && (
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Fallback quando o vendedor não tem gerente vinculado</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    className="h-8 text-xs"
                    placeholder="Nome fallback"
                    value={config.fallbackNome || ""}
                    onChange={(e) => handleConfigChange("fallbackNome", e.target.value)}
                  />
                  <Input
                    className="h-8 text-xs"
                    placeholder="WhatsApp fallback"
                    value={config.fallbackWhatsapp || ""}
                    onChange={(e) => handleConfigChange("fallbackWhatsapp", e.target.value)}
                  />
                </div>
              </div>
            )}
            {(config.contatoTipo || "gerente_do_vendedor") === "fixo" && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  className="h-8 text-xs"
                  placeholder="Nome do contato"
                  value={config.contatoNome || ""}
                  onChange={(e) => handleConfigChange("contatoNome", e.target.value)}
                />
                <Input
                  className="h-8 text-xs"
                  placeholder="WhatsApp (com DDD)"
                  value={config.contatoWhatsapp || ""}
                  onChange={(e) => handleConfigChange("contatoWhatsapp", e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resumo ao gerente */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="enviar_resumo_gerente"
            checked={config.enviarResumoGerente !== false}
            onCheckedChange={(v) => handleConfigChange("enviarResumoGerente", !!v)}
          />
          <label htmlFor="enviar_resumo_gerente" className="text-xs font-semibold">
            Ao finalizar, enviar resumo ao(s) gerente(s)
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground pl-6">
          Envia ao WhatsApp de cada gerente: data/hora, a mensagem enviada (com XXX no lugar das variáveis personalizadas) e a lista de destinatários.
        </p>

        <div className="space-y-1 pl-6 pt-2">
          <Label className="text-xs">Números adicionais que também recebem o resumo (opcional)</Label>
          <Textarea
            className="text-xs min-h-[60px]"
            placeholder="Ex.: 5511999998888, 5511777776666 (um por linha ou separados por vírgula)"
            value={config.resumoNumerosExtras || ""}
            onChange={(e) => handleConfigChange("resumoNumerosExtras", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Use para enviar o mesmo resumo a diretores, supervisores ou grupos fixos. Aceita DDI+DDD+Número.
          </p>
        </div>
      </div>



      <div className="space-y-1 border-t pt-3">
        <Label className="text-xs">Delay entre envios (segundos)</Label>
        <Input
          type="number"
          min={0}
          max={60}
          className="h-8 text-xs"
          value={config.delaySeconds ?? 3}
          onChange={(e) => handleConfigChange("delaySeconds", Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
        />
        <Label className="text-xs pt-2 block">Variável de saída</Label>
        <Input
          className="h-8 text-xs"
          value={config.outputVariable || "broadcast_vendedores_resultado"}
          onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
        />
      </div>

      {/* Aguardar resposta */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-start gap-2">
          <Checkbox
            id="aguardar_resposta"
            checked={!!config.aguardarResposta}
            onCheckedChange={(v) => handleConfigChange("aguardarResposta", !!v)}
          />
          <label htmlFor="aguardar_resposta" className="text-xs leading-tight">
            <b>Aguardar resposta da empresa antes de continuar</b>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Cria um registro de acompanhamento por destinatário. Quando a empresa responde no WhatsApp, o cadastro é marcado automaticamente como "já respondeu" e aparece no Monitor de Respostas.
            </p>
          </label>
        </div>
        {config.aguardarResposta && (
          <div className="pl-6 space-y-1">
            <Label className="text-xs">Prazo máximo para resposta (horas)</Label>
            <Input
              type="number"
              min={1}
              max={720}
              className="h-8 text-xs w-32"
              value={config.timeoutHoras ?? 24}
              onChange={(e) => handleConfigChange("timeoutHoras", Math.max(1, Math.min(720, parseInt(e.target.value) || 24)))}
            />
            <p className="text-[10px] text-muted-foreground">Após esse prazo, os que não responderem são marcados como "sem resposta".</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BroadcastVendedoresConfig;

