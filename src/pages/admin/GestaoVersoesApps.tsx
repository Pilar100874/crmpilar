import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import {
  Upload,
  Download,
  Trash2,
  Smartphone,
  RefreshCw,
  PackageCheck,
  MonitorSmartphone,
} from "lucide-react";

const APPS = [
  { valor: "fone", nome: "Pilar Fone" },
  { valor: "sms", nome: "Pilar SMS" },
  { valor: "hub", nome: "Pilar Hub" },
  { valor: "automacao", nome: "Pilar Automação" },
  { valor: "remotas", nome: "Pilar Remotas" },
  { valor: "coletor", nome: "Coletor Pilar" },
] as const;

type AppValor = (typeof APPS)[number]["valor"];

const nomeApp = (v: string) => APPS.find((a) => a.valor === v)?.nome || v;

interface Release {
  id: string;
  app: string;
  versao: string;
  arquivo_nome: string | null;
  arquivo_url: string;
  tamanho_bytes: number | null;
  notas: string | null;
  obrigatorio: boolean;
  publicado: boolean;
  created_at: string;
}

interface Equipamento {
  id: string;
  app: AppValor;
  nome: string;
  detalhe: string;
  versao: string | null;
  ultimoContato: string | null;
}

const formatarTamanho = (bytes?: number | null) => {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

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
  const [releases, setReleases] = useState<Release[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [excluir, setExcluir] = useState<Release | null>(null);
  const [filtroApp, setFiltroApp] = useState<string>("todos");

  const [app, setApp] = useState<AppValor>("hub");
  const [versao, setVersao] = useState("");
  const [notas, setNotas] = useState("");
  const [obrigatorio, setObrigatorio] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregarReleases = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_releases")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Não foi possível carregar as versões");
      return;
    }
    setReleases((data || []) as Release[]);
  }, []);

  const carregarEquipamentos = useCallback(async () => {
    const [tv, sms, coletor] = await Promise.all([
      supabase.from("tv_devices").select("id,nome,local,versao_app,ultima_comunicacao"),
      supabase
        .from("sms_devices")
        .select("id,nome,tipo_dispositivo,versao_app,ultimo_heartbeat,ultimo_ping"),
      supabase
        .from("coletor_dispositivos")
        .select("id,hostname,plataforma,versao,ultimo_contato,unidade_nome"),
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
        app: d.tipo_dispositivo === "hub" ? "hub" : "sms",
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
      }),
    );

    lista.sort((a, b) => a.nome.localeCompare(b.nome));
    setEquipamentos(lista);
  }, []);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    await Promise.all([carregarReleases(), carregarEquipamentos()]);
    setCarregando(false);
  }, [carregarReleases, carregarEquipamentos]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /** Última versão publicada de cada aplicativo. */
  const ultimaVersao = useMemo(() => {
    const mapa: Record<string, string> = {};
    releases
      .filter((r) => r.publicado)
      .forEach((r) => {
        if (!mapa[r.app] || menorQue(mapa[r.app], r.versao)) mapa[r.app] = r.versao;
      });
    return mapa;
  }, [releases]);

  const enviarVersao = async () => {
    if (!arquivo) return toast.error("Escolha o arquivo do aplicativo");
    if (!versao.trim()) return toast.error("Informe o número da versão");

    setEnviando(true);
    try {
      const caminho = `${app}/${versao.trim()}/${arquivo.name}`;
      const { error: upErro } = await supabase.storage
        .from("apks")
        .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type || undefined });
      if (upErro) throw upErro;

      const { data: assinada, error: urlErro } = await supabase.storage
        .from("apks")
        .createSignedUrl(caminho, 60 * 60 * 24 * 365);
      if (urlErro) throw urlErro;

      const { data: sessao } = await supabase.auth.getUser();
      const { error } = await supabase.from("app_releases").upsert(
        {
          app,
          versao: versao.trim(),
          arquivo_nome: arquivo.name,
          arquivo_url: assinada?.signedUrl || caminho,
          tamanho_bytes: arquivo.size,
          notas: notas.trim() || null,
          obrigatorio,
          publicado: true,
          created_by: sessao?.user?.id ?? null,
        },
        { onConflict: "estabelecimento_id,app,versao" },
      );
      if (error) throw error;

      toast.success(`${nomeApp(app)} ${versao.trim()} publicado`);
      setVersao("");
      setNotas("");
      setObrigatorio(false);
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      await carregarReleases();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar a versão");
    } finally {
      setEnviando(false);
    }
  };

  const alternarPublicado = async (r: Release) => {
    const { error } = await supabase
      .from("app_releases")
      .update({ publicado: !r.publicado })
      .eq("id", r.id);
    if (error) return toast.error("Não foi possível alterar a publicação");
    await carregarReleases();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await supabase.from("app_releases").delete().eq("id", excluir.id);
    if (error) toast.error("Não foi possível excluir a versão");
    else toast.success("Versão removida");
    setExcluir(null);
    await carregarReleases();
  };

  const releasesFiltrados = releases.filter((r) => filtroApp === "todos" || r.app === filtroApp);
  const equipamentosFiltrados = equipamentos.filter(
    (e) => filtroApp === "todos" || e.app === filtroApp,
  );
  const desatualizados = equipamentos.filter((e) =>
    menorQue(e.versao, ultimaVersao[e.app]),
  ).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      <header className="border-b bg-gradient-to-r from-primary/15 to-primary/5 p-4 sm:rounded-xl sm:border sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
              <PackageCheck className="h-6 w-6 text-primary" />
              Versões dos Aplicativos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Envie novos pacotes e acompanhe a versão instalada em cada equipamento.
            </p>
          </div>
          <Button variant="outline" onClick={recarregar} disabled={carregando} className="w-full sm:w-auto">
            <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Badge variant="secondary">{releases.length} versões enviadas</Badge>
          <Badge variant="secondary">{equipamentos.length} equipamentos</Badge>
          {desatualizados > 0 && (
            <Badge variant="destructive">{desatualizados} desatualizados</Badge>
          )}
        </div>
      </header>

      <div className="w-full sm:w-72">
        <Label className="mb-1 block text-xs">Filtrar por aplicativo</Label>
        <Select value={filtroApp} onValueChange={setFiltroApp}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os aplicativos</SelectItem>
            {APPS.map((a) => (
              <SelectItem key={a.valor} value={a.valor}>
                {a.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="versoes">
        <TabsList className="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
          <TabsTrigger value="versoes" className="min-w-0">
            <Upload className="mr-2 h-4 w-4" /> Versões
          </TabsTrigger>
          <TabsTrigger value="equipamentos" className="min-w-0">
            <MonitorSmartphone className="mr-2 h-4 w-4" /> Equipamentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="versoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enviar nova versão</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs">Aplicativo</Label>
                <Select value={app} onValueChange={(v) => setApp(v as AppValor)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPS.map((a) => (
                      <SelectItem key={a.valor} value={a.valor}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Versão</Label>
                <Input
                  value={versao}
                  onChange={(e) => setVersao(e.target.value)}
                  placeholder="1.4.0"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs">Arquivo do aplicativo</Label>
                <Input
                  ref={inputRef}
                  type="file"
                  accept=".apk,.exe,.AppImage,.iso,.msi"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                />
                {arquivo && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {arquivo.name} · {formatarTamanho(arquivo.size)}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs">Novidades desta versão</Label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  placeholder="O que mudou nesta versão"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={obrigatorio} onCheckedChange={setObrigatorio} />
                <span className="text-sm text-muted-foreground">Atualização obrigatória</span>
              </div>
              <div className="flex justify-end">
                <Button onClick={enviarVersao} disabled={enviando} className="w-full sm:w-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  {enviando ? "Enviando…" : "Publicar versão"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Versões enviadas</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 sm:pt-0">
              <div className="space-y-3 md:hidden">
                {releasesFiltrados.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma versão enviada ainda.</p>
                )}
                {releasesFiltrados.map((r) => (
                  <article key={r.id} className="space-y-3 rounded-lg border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold">{nomeApp(r.app)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">v{r.versao}</Badge>
                          {r.obrigatorio && <Badge variant="destructive">obrigatória</Badge>}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" onClick={() => window.open(r.arquivo_url, "_blank", "noopener")}>
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Baixar versão</span>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setExcluir(r)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Excluir versão</span>
                        </Button>
                      </div>
                    </div>
                    <div className="min-w-0 text-xs text-muted-foreground">
                      <p className="truncate font-mono">{r.arquivo_nome || "Arquivo"} · {formatarTamanho(r.tamanho_bytes)}</p>
                      <p className="mt-1">Enviado em {formatarData(r.created_at)}</p>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-sm text-muted-foreground">Versão publicada</span>
                      <Switch checked={r.publicado} onCheckedChange={() => alternarPublicado(r)} />
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aplicativo</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Publicada</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releasesFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nenhuma versão enviada ainda.
                      </TableCell>
                    </TableRow>
                  )}
                  {releasesFiltrados.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{nomeApp(r.app)}</TableCell>
                      <TableCell>
                        {r.versao}
                        {r.obrigatorio && (
                          <Badge variant="destructive" className="ml-2">
                            obrigatória
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate font-mono text-xs">
                        {r.arquivo_nome} · {formatarTamanho(r.tamanho_bytes)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatarData(r.created_at)}
                      </TableCell>
                      <TableCell>
                        <Switch checked={r.publicado} onCheckedChange={() => alternarPublicado(r)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(r.arquivo_url, "_blank", "noopener")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setExcluir(r)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipamentos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equipamentos e versões instaladas</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 sm:pt-0">
              <div className="space-y-3 md:hidden">
                {equipamentosFiltrados.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum equipamento encontrado.</p>
                )}
                {equipamentosFiltrados.map((e) => {
                  const disponivel = ultimaVersao[e.app];
                  const atrasado = menorQue(e.versao, disponivel);
                  return (
                    <article key={e.id} className="space-y-3 rounded-lg border bg-background p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{e.nome}</p>
                          <p className="truncate text-xs text-muted-foreground">{e.detalhe}</p>
                        </div>
                        <Badge variant={atrasado ? "destructive" : "secondary"} className="shrink-0">
                          {atrasado ? "Desatualizado" : "Atualizado"}
                        </Badge>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                        <div><dt className="text-xs text-muted-foreground">Aplicativo</dt><dd>{nomeApp(e.app)}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">Instalada</dt><dd>{e.versao || "desconhecida"}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">Disponível</dt><dd>{disponivel || "—"}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">Último contato</dt><dd>{formatarData(e.ultimoContato)}</dd></div>
                      </dl>
                    </article>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Aplicativo</TableHead>
                    <TableHead>Instalada</TableHead>
                    <TableHead>Disponível</TableHead>
                    <TableHead>Último contato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipamentosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum equipamento encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                  {equipamentosFiltrados.map((e) => {
                    const disponivel = ultimaVersao[e.app];
                    const atrasado = menorQue(e.versao, disponivel);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            {e.nome}
                          </div>
                          <span className="text-xs text-muted-foreground">{e.detalhe}</span>
                        </TableCell>
                        <TableCell>{nomeApp(e.app)}</TableCell>
                        <TableCell>
                          <Badge variant={atrasado ? "destructive" : "secondary"}>
                            {e.versao || "desconhecida"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {disponivel || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatarData(e.ultimoContato)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir ? `${nomeApp(excluir.app)} ${excluir.versao}` : undefined}
      />
    </div>
  );
}
