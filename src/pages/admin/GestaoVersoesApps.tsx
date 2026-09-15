import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { enviarComando, getEstabelecimentoId, getUsuarioId } from "@/services/tvSignage/tvSignageService";
import { toast } from "sonner";
import { Smartphone, RefreshCw, PackageCheck, Send, CircleCheck, TriangleAlert, Laptop } from "lucide-react";

const APPS = [
  { valor: "sms", nome: "Pilar SMS" },
  { valor: "hub", nome: "Pilar Coletor" },
  { valor: "automacao", nome: "Pilar Automação" },
  { valor: "remotas", nome: "Pilar Remotas" },
  { valor: "coletor", nome: "Coletor Pilar" },
] as const;

type AppValor = (typeof APPS)[number]["valor"];

const nomeApp = (v: string) => APPS.find((a) => a.valor === v)?.nome || v;

/** Manifestos públicos das versões mais novas — a mesma fonte usada na tela de downloads. */
const MANIFESTOS: Record<string, string> = {
  remotas: "/apps/android-tv-signage-latest.json",
  sms: "/coletor/sms-version.json",
  hub: "/coletor/hub-version.json",
  automacao: "/apps/pilar-automacao-latest.json",
  coletor: "/coletor/version.json",
};

interface VersaoPublicada {
  versao: string;
  url: string;
}

interface Equipamento {
  id: string;
  app: AppValor;
  nome: string;
  detalhe: string;
  versao: string | null;
  ultimoContato: string | null;
  statusAtualizacao?: string | null;
  resultadoAtualizacao?: string | null;
}

interface ComandoAtualizacao {
  id: string;
  equipamentoId: string;
  status: string;
  criadoEm: string;
  mensagem?: string | null;
}

const formatarData = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR");
};

/** Compara versões no formato x.y.z. Retorna true quando a é menor que b. */
const menorQue = (a?: string | null, b?: string | null) => {
  if (!a || !b) return false;
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
};

export default function GestaoVersoesApps() {
  const [versoes, setVersoes] = useState<Record<string, VersaoPublicada>>({});
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroApp, setFiltroApp] = useState<string>("todos");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [comandos, setComandos] = useState<ComandoAtualizacao[]>([]);
  const [disparando, setDisparando] = useState(false);

  const carregarVersoes = useCallback(async () => {
    const entradas = await Promise.all(
      Object.entries(MANIFESTOS).map(async ([appSlug, caminho]) => {
        try {
          const resp = await fetch(caminho, { cache: "no-store" });
          if (!resp.ok) return null;
          const json = await resp.json();
          const versao = json.versionName || json.version || "";
          const url = json.url || json.downloadUrl || "";
          if (!versao || !url) return null;
          return [appSlug, { versao, url }] as const;
        } catch {
          return null;
        }
      }),
    );
    const mapa: Record<string, VersaoPublicada> = {};
    entradas.forEach((e) => {
      if (e) mapa[e[0]] = e[1];
    });
    setVersoes(mapa);
  }, []);

  const carregarEquipamentos = useCallback(async () => {
    const [tv, sms, coletor] = await Promise.all([
      supabase.from("tv_devices").select("id,nome,local,versao_app,ultima_comunicacao"),
      supabase
        .from("sms_devices")
        .select("id,nome,tipo_dispositivo,versao_app,ultimo_heartbeat,ultimo_ping"),
      supabase
        .from("coletor_dispositivos")
        .select("id,hostname,plataforma,versao,ultimo_contato,unidade_nome,comando_status,comando_resultado"),
    ]);

    const lista: Equipamento[] = [];

    (tv.data || []).forEach((d: any) =>
      lista.push({
        id: `tv-${d.id}`,
        app: "remotas",
        nome: d.nome || "Tela sem nome",
        detalhe: d.local || "—",
        versao: d.versao_app,
        ultimoContato: d.ultima_comunicacao,
      }),
    );

    (sms.data || []).forEach((d: any) =>
      lista.push({
        id: `sms-${d.id}`,
        app: d.tipo_dispositivo === "hub" ? "hub" : d.tipo_dispositivo === "automacao" ? "automacao" : "sms",
        nome: d.nome || "Aparelho sem nome",
        detalhe: d.tipo_dispositivo || "celular",
        versao: d.versao_app,
        ultimoContato: d.ultimo_heartbeat || d.ultimo_ping,
      }),
    );

    (coletor.data || []).forEach((d: any) =>
      lista.push({
        id: `col-${d.id}`,
        app: "coletor",
        nome: d.hostname || "Computador sem nome",
        detalhe: [d.plataforma, d.unidade_nome].filter(Boolean).join(" · ") || "—",
        versao: d.versao,
        ultimoContato: d.ultimo_contato,
        statusAtualizacao: d.comando_status,
        resultadoAtualizacao: d.comando_resultado,
      }),
    );

    lista.sort((a, b) => a.nome.localeCompare(b.nome));
    setEquipamentos(lista);
  }, []);

  const carregarComandos = useCallback(async () => {
    const [celulares, telas] = await Promise.all([
      supabase.from("app_update_commands" as any).select("id,device_id,status,resultado,created_at").order("created_at", { ascending: false }).limit(300),
      supabase.from("tv_commands").select("id,device_id,status,resultado,created_at").eq("tipo", "atualizar_versao").order("created_at", { ascending: false }).limit(300),
    ]);
    setComandos([
      ...((celulares.data || []) as any[]).map((c) => ({ id: c.id, equipamentoId: `sms-${c.device_id}`, status: c.status, criadoEm: c.created_at, mensagem: c.resultado?.mensagem || null })),
      ...((telas.data || []) as any[]).map((c) => ({ id: c.id, equipamentoId: `tv-${c.device_id}`, status: c.status, criadoEm: c.created_at, mensagem: c.resultado?.mensagem || null })),
    ]);
  }, []);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    await Promise.all([carregarVersoes(), carregarEquipamentos(), carregarComandos()]);
    setCarregando(false);
  }, [carregarVersoes, carregarEquipamentos, carregarComandos]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /** Última versão publicada de cada aplicativo. */
  const ultimaVersao = useMemo(() => {
    const mapa: Record<string, string> = {};
    Object.entries(versoes).forEach(([appSlug, v]) => {
      mapa[appSlug] = v.versao;
    });
    return mapa;
  }, [versoes]);

  const equipamentosFiltrados = equipamentos.filter(
    (e) => filtroApp === "todos" || e.app === filtroApp,
  );
  const desatualizados = equipamentos.filter((e) =>
    menorQue(e.versao, ultimaVersao[e.app]),
  ).length;

  const atualizaveis = equipamentosFiltrados.filter((e) =>
    ["remotas", "sms", "hub", "automacao", "coletor"].includes(e.app) && Boolean(ultimaVersao[e.app]),
  );
  const ultimoComando = (id: string) => comandos
    .filter((c) => c.equipamentoId === id)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0];
  const alternarSelecao = (id: string) => setSelecionados((atuais) =>
    atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id],
  );
  const selecionarDesatualizados = () => setSelecionados(
    atualizaveis.filter((e) => menorQue(e.versao, ultimaVersao[e.app])).map((e) => e.id),
  );

  const enviarAtualizacoes = async (ids = selecionados) => {
    const alvos = atualizaveis.filter((e) => ids.includes(e.id));
    if (!alvos.length) return toast.error("Selecione pelo menos um aparelho");
    setDisparando(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const usuarioId = await getUsuarioId();
      if (!estabelecimentoId) throw new Error("Empresa do usuário não encontrada");
      for (const equipamento of alvos) {
        const publicada = versoes[equipamento.app];
        if (!publicada) continue;
        const deviceId = equipamento.id.replace(/^(tv|sms|col)-/, "");
        if (equipamento.app === "coletor") {
          const { error } = await supabase
            .from("coletor_dispositivos")
            .update({
              comando: "atualizar_versao",
              comando_solicitado_em: new Date().toISOString(),
              comando_status: "pendente",
              comando_resultado: null,
            })
            .eq("id", deviceId);
          if (error) throw error;
        } else if (equipamento.app === "remotas") {
          const { error } = await enviarComando(deviceId, "atualizar_versao", { forcar: true, versao: publicada.versao });
          if (error) throw error;
        } else {
          const { error } = await supabase.from("app_update_commands" as any).insert({
            estabelecimento_id: estabelecimentoId,
            device_id: deviceId,
            app: equipamento.app,
            versao_alvo: publicada.versao,
            arquivo_url: publicada.url,
            criado_por: usuarioId,
          });
          if (error) throw error;
        }
      }
      toast.success(`Atualização enviada para ${alvos.length} aparelho${alvos.length === 1 ? "" : "s"}`);
      setSelecionados([]);
      await carregarComandos();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar a atualização");
    } finally {
      setDisparando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-4 p-3 sm:p-5 lg:p-6">
      <header className="border bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-4 shadow-sm sm:rounded-lg sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
              <PackageCheck className="h-6 w-6 text-primary" />
              Central de Atualizações
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe os aparelhos e envie a versão mais nova remotamente. Os downloads ficam na tela de Apps.
            </p>
          </div>
          <Button variant="outline" onClick={recarregar} disabled={carregando} className="w-full sm:w-auto">
            <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-md border bg-background/70 p-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <div><p className="text-xl font-bold leading-none">{equipamentos.length}</p><p className="mt-1 text-xs text-muted-foreground">Equipamentos</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-md border bg-background/70 p-3">
            {desatualizados > 0 ? <TriangleAlert className="h-5 w-5 text-destructive" /> : <CircleCheck className="h-5 w-5 text-primary" />}
            <div><p className="text-xl font-bold leading-none">{desatualizados}</p><p className="mt-1 text-xs text-muted-foreground">Desatualizados</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-md border bg-background/70 p-3">
            <PackageCheck className="h-5 w-5 text-primary" />
            <div><p className="text-xl font-bold leading-none">{Object.keys(versoes).length}</p><p className="mt-1 text-xs text-muted-foreground">Versões publicadas</p></div>
          </div>
        </div>
      </header>

      <div className="grid gap-3 rounded-lg border bg-card p-3 lg:grid-cols-[minmax(220px,288px)_1fr] lg:items-end">
        <div className="w-full">
          <Label className="mb-1.5 block text-xs">Filtrar por aplicativo</Label>
          <Select value={filtroApp} onValueChange={setFiltroApp}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os aplicativos</SelectItem>
              {APPS.map((a) => <SelectItem key={a.valor} value={a.valor}>{a.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:justify-end">
          <Button variant="outline" className="w-full lg:w-auto" onClick={selecionarDesatualizados}>Selecionar desatualizados</Button>
          <Button className="w-full lg:w-auto" onClick={() => enviarAtualizacoes()} disabled={disparando || selecionados.length === 0}>
            <Send className="mr-2 h-4 w-4" />
            {disparando ? "Enviando…" : `Enviar atualização (${selecionados.length})`}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-lg">
        <CardHeader className="border-b bg-muted/25 pb-4">
          <div>
            <CardTitle className="text-base">Telas remotas, celulares e coletores</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{equipamentosFiltrados.length} equipamento{equipamentosFiltrados.length === 1 ? "" : "s"} no filtro atual</p>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-1">
            {atualizaveis.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum equipamento encontrado.</p>}
            {atualizaveis.map((e) => {
              const disponivel = ultimaVersao[e.app];
              const atrasado = menorQue(e.versao, disponivel);
               const comando = ultimoComando(e.id);
               const statusComando = comando?.status || e.statusAtualizacao;
               const mensagemComando = comando?.mensagem || e.resultadoAtualizacao;
              return (
                <article key={e.id} className="grid gap-3 rounded-lg border bg-background p-3 shadow-sm xl:grid-cols-[auto_minmax(170px,1fr)_100px_100px_minmax(150px,1fr)_auto_auto] xl:items-center xl:gap-4">
                  <div className="flex min-w-0 items-center gap-3 xl:contents">
                    <Checkbox checked={selecionados.includes(e.id)} onCheckedChange={() => alternarSelecao(e.id)} aria-label={`Selecionar ${e.nome}`} />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary xl:hidden">{e.app === "coletor" ? <Laptop className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}</div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{e.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{nomeApp(e.app)} · {e.detalhe}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm xl:contents">
                    <div><p className="text-xs text-muted-foreground">Instalada</p><p>{e.versao || "desconhecida"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Disponível</p><p>{disponivel || "—"}</p></div>
                    <div className="col-span-2 xl:col-span-1"><p className="text-xs text-muted-foreground">Último contato</p><p className="truncate">{formatarData(e.ultimoContato)}</p></div>
                    <div className="flex flex-wrap items-center gap-2 xl:block">
                      <Badge variant={atrasado ? "destructive" : "secondary"}>{atrasado ? "Desatualizado" : "Atualizado"}</Badge>
                      {statusComando && <Badge variant="outline" className="xl:mt-1">{statusComando}</Badge>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full xl:w-auto" onClick={() => enviarAtualizacoes([e.id])} disabled={disparando}>
                    <Send className="mr-2 h-4 w-4" /> Enviar
                  </Button>
                  {mensagemComando && <p className="text-xs text-muted-foreground md:col-span-2 xl:col-span-full xl:ml-10">{mensagemComando}</p>}
                </article>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Em celulares Android, o sistema pode solicitar a confirmação da instalação no próprio aparelho. O Pilar Fone continua com atualização manual no próprio aplicativo.</p>
        </CardContent>
      </Card>
    </div>
  );
}
