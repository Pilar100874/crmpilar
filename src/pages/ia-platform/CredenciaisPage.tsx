import { useCallback, useEffect, useMemo, useState } from "react";
import { db, useEstabelecimento } from "@/lib/aip/db";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  History,
} from "lucide-react";
import { toast } from "sonner";

export const PROVEDORES = [
  {
    id: "playwright",
    nome: "Playwright",
    icone: "🎭",
    rotulo_segredo: "Token / senha do serviço de execução",
    campos: [
      { chave: "base_url", rotulo: "Endpoint do runner (opcional)" },
      { chave: "projeto", rotulo: "Projeto / suíte padrão" },
    ],
  },
  {
    id: "remotion",
    nome: "Remotion",
    icone: "🎬",
    rotulo_segredo: "Remotion API Key / License Key",
    campos: [
      { chave: "regiao", rotulo: "Região Lambda (ex.: us-east-1)" },
      { chave: "bucket", rotulo: "Bucket de renderização" },
    ],
  },
  {
    id: "higgsfield",
    nome: "Higgsfield",
    icone: "✨",
    rotulo_segredo: "Higgsfield API Key",
    campos: [{ chave: "workspace", rotulo: "Workspace / conta" }],
  },
  {
    id: "claude_code",
    nome: "Claude Code",
    icone: "🤖",
    rotulo_segredo: "Anthropic API Key (sk-ant-...)",
    campos: [
      { chave: "modelo", rotulo: "Modelo padrão" },
      { chave: "workspace", rotulo: "Workspace Anthropic" },
    ],
  },
  {
    id: "outro",
    nome: "Outro",
    icone: "🔐",
    rotulo_segredo: "Segredo",
    campos: [{ chave: "base_url", rotulo: "Endpoint" }],
  },
] as const;

interface Credencial {
  id: string;
  provedor: string;
  nome: string;
  descricao: string | null;
  ambiente: string;
  dados: Record<string, string> | null;
  mascara: string | null;
  versao: number;
  rotacionado_em: string | null;
  rotacao_dias: number | null;
  expira_em: string | null;
  ultimo_uso: string | null;
  ativo: boolean;
  created_at: string;
}

const AMBIENTES = [
  { id: "producao", rotulo: "Produção" },
  { id: "homologacao", rotulo: "Homologação" },
  { id: "desenvolvimento", rotulo: "Desenvolvimento" },
];

const formatar = (v?: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function diasParaExpirar(c: Credencial) {
  const alvo = c.expira_em
    ? new Date(c.expira_em)
    : c.rotacao_dias
      ? new Date(
          new Date(c.rotacionado_em ?? c.created_at).getTime() + c.rotacao_dias * 86400000,
        )
      : null;
  if (!alvo) return null;
  return Math.ceil((alvo.getTime() - Date.now()) / 86400000);
}

export default function CredenciaisPage() {
  const estabelecimentoId = useEstabelecimento();
  const [itens, setItens] = useState<Credencial[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [podeGerenciar, setPodeGerenciar] = useState(false);
  const [filtro, setFiltro] = useState<string>("todos");

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Credencial | null>(null);
  const [form, setForm] = useState<any>({ provedor: "claude_code", ambiente: "producao" });
  const [segredo, setSegredo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [rotacionar, setRotacionar] = useState<Credencial | null>(null);
  const [novoSegredo, setNovoSegredo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [excluir, setExcluir] = useState<Credencial | null>(null);
  const [historico, setHistorico] = useState<{ cred: Credencial; versoes: any[] } | null>(null);

  const carregar = useCallback(async () => {
    if (!estabelecimentoId) return;
    setCarregando(true);
    const { data } = await db
      .from("aip_credenciais")
      .select(
        "id, provedor, nome, descricao, ambiente, dados, mascara, versao, rotacionado_em, rotacao_dias, expira_em, ultimo_uso, ativo, created_at",
      )
      .eq("estabelecimento_id", estabelecimentoId)
      .order("provedor")
      .order("nome");
    setItens((data ?? []) as Credencial[]);
    setCarregando(false);
  }, [estabelecimentoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    db.rpc("aip_pode_gerenciar_credenciais").then(({ data }: any) => setPodeGerenciar(!!data));
  }, [estabelecimentoId]);

  const chamar = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("aip-credenciais", { body: payload });
    if (error) {
      const detalhe =
        (error as any)?.context && typeof (error as any).context.text === "function"
          ? await (error as any).context.text()
          : error.message;
      throw new Error(detalhe || error.message);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const provedorAtual = useMemo(
    () => PROVEDORES.find((p) => p.id === (form.provedor ?? "outro")) ?? PROVEDORES[4],
    [form.provedor],
  );

  const listaFiltrada = useMemo(
    () => (filtro === "todos" ? itens : itens.filter((i) => i.provedor === filtro)),
    [itens, filtro],
  );

  const abrirNovo = () => {
    setEditando(null);
    setForm({ provedor: "claude_code", ambiente: "producao", dados: {} });
    setSegredo("");
    setAberto(true);
  };

  const abrirEdicao = (c: Credencial) => {
    setEditando(c);
    setForm({ ...c, dados: c.dados ?? {} });
    setSegredo("");
    setAberto(true);
  };

  const salvar = async () => {
    if (!form.nome?.trim()) return toast.error("Informe um nome para a credencial");
    if (!editando && !segredo.trim()) return toast.error("Informe o segredo da credencial");
    setSalvando(true);
    try {
      await chamar({
        acao: "salvar",
        id: editando?.id,
        provedor: form.provedor,
        nome: form.nome,
        descricao: form.descricao ?? null,
        ambiente: form.ambiente,
        dados: form.dados ?? {},
        rotacao_dias: form.rotacao_dias ? Number(form.rotacao_dias) : null,
        expira_em: form.expira_em || null,
        segredo: segredo.trim() || undefined,
      });
      toast.success(editando ? "Credencial atualizada" : "Credencial criada com segurança");
      setAberto(false);
      carregar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const confirmarRotacao = async () => {
    if (!rotacionar || !novoSegredo.trim()) return toast.error("Informe o novo segredo");
    try {
      const r = await chamar({
        acao: "rotacionar",
        id: rotacionar.id,
        segredo: novoSegredo.trim(),
        motivo: motivo || undefined,
      });
      toast.success(`Segredo rotacionado (versão ${r.versao})`);
      setRotacionar(null);
      setNovoSegredo("");
      setMotivo("");
      carregar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const revelar = async (c: Credencial) => {
    try {
      const r = await chamar({ acao: "revelar", id: c.id });
      await navigator.clipboard?.writeText(r.segredo).catch(() => undefined);
      toast.success("Segredo copiado para a área de transferência (acesso registrado na auditoria)");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remover = async () => {
    if (!excluir) return;
    const { error } = await db.from("aip_credenciais").delete().eq("id", excluir.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Credencial excluída");
      carregar();
    }
    setExcluir(null);
  };

  const alternarAtivo = async (c: Credencial) => {
    const { error } = await db
      .from("aip_credenciais")
      .update({ ativo: !c.ativo })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else carregar();
  };

  const verHistorico = async (c: Credencial) => {
    const { data } = await db
      .from("aip_credencial_versoes")
      .select("id, versao, mascara, motivo, created_at")
      .eq("credencial_id", c.id)
      .order("versao", { ascending: false });
    setHistorico({ cred: c, versoes: data ?? [] });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Lock className="h-5 w-5 text-primary" /> Credenciais e Segredos
          </h1>
          <p className="text-sm text-muted-foreground">
            Cofre por organização para Playwright, Remotion, Higgsfield e Claude Code — com rotação
            e permissões por perfil.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os provedores</SelectItem>
              {PROVEDORES.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.icone} {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={abrirNovo} disabled={!podeGerenciar}>
            <Plus className="mr-1 h-4 w-4" /> Nova credencial
          </Button>
        </div>
      </div>

      {!podeGerenciar && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-2 p-4 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-600" />
            <span>
              Você tem acesso somente de leitura. Para criar, rotacionar ou excluir credenciais é
              necessário perfil <b>administrador</b>, <b>gestor</b> ou permissão explícita de
              gerenciamento de credenciais.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {carregando && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!carregando && listaFiltrada.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma credencial cadastrada.</p>
        )}
        {listaFiltrada.map((c) => {
          const prov = PROVEDORES.find((p) => p.id === c.provedor);
          const dias = diasParaExpirar(c);
          return (
            <Card key={c.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex min-w-0 items-center gap-2">
                    <span>{prov?.icone ?? "🔐"}</span>
                    <span className="truncate">{c.nome}</span>
                  </span>
                  <Switch
                    checked={c.ativo}
                    disabled={!podeGerenciar}
                    onCheckedChange={() => alternarAtivo(c)}
                  />
                </CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{prov?.nome ?? c.provedor}</Badge>
                  <Badge variant="outline">
                    {AMBIENTES.find((a) => a.id === c.ambiente)?.rotulo ?? c.ambiente}
                  </Badge>
                  <Badge variant="outline">v{c.versao}</Badge>
                  {dias !== null && (
                    <Badge variant={dias <= 0 ? "destructive" : dias <= 7 ? "default" : "outline"}>
                      {dias <= 0 ? "Rotação vencida" : `Rotacionar em ${dias}d`}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 font-mono text-foreground">
                  <KeyRound className="h-3.5 w-3.5" />
                  {c.mascara ?? "•••••"}
                </div>
                {c.descricao && <p className="line-clamp-2">{c.descricao}</p>}
                <p>Última rotação: {formatar(c.rotacionado_em)}</p>
                <p>Último uso: {formatar(c.ultimo_uso)}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => verHistorico(c)}>
                    <History className="mr-1 h-3.5 w-3.5" /> Histórico
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!podeGerenciar}
                    onClick={() => revelar(c)}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" /> Copiar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!podeGerenciar}
                    onClick={() => setRotacionar(c)}
                  >
                    <RefreshCw className="mr-1 h-3.5 w-3.5" /> Rotacionar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!podeGerenciar}
                    onClick={() => abrirEdicao(c)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive"
                    disabled={!podeGerenciar}
                    onClick={() => setExcluir(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Criar / editar */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar credencial" : "Nova credencial"}</DialogTitle>
            <DialogDescription>
              O segredo é cifrado no servidor e nunca fica acessível ao navegador.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Provedor</Label>
                  <Select
                    value={form.provedor}
                    onValueChange={(v) => setForm({ ...form, provedor: v, dados: {} })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVEDORES.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.icone} {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Ambiente</Label>
                  <Select
                    value={form.ambiente}
                    onValueChange={(v) => setForm({ ...form, ambiente: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AMBIENTES.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={form.nome ?? ""}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex.: Claude Code — produção"
                />
              </div>

              <div className="space-y-1">
                <Label>{provedorAtual.rotulo_segredo}</Label>
                <Input
                  type="password"
                  value={segredo}
                  onChange={(e) => setSegredo(e.target.value)}
                  placeholder={editando ? "Deixe em branco para manter o atual" : "••••••••"}
                />
              </div>

              {provedorAtual.campos.map((campo) => (
                <div key={campo.chave} className="space-y-1">
                  <Label>{campo.rotulo}</Label>
                  <Input
                    value={form.dados?.[campo.chave] ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        dados: { ...(form.dados ?? {}), [campo.chave]: e.target.value },
                      })
                    }
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Rotacionar a cada (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.rotacao_dias ?? ""}
                    onChange={(e) => setForm({ ...form, rotacao_dias: e.target.value })}
                    placeholder="90"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Expira em</Label>
                  <Input
                    type="date"
                    value={form.expira_em ? String(form.expira_em).slice(0, 10) : ""}
                    onChange={(e) => setForm({ ...form, expira_em: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Descrição</Label>
                <Textarea
                  rows={2}
                  value={form.descricao ?? ""}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotação */}
      <Dialog open={!!rotacionar} onOpenChange={(o) => !o && setRotacionar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rotacionar segredo</DialogTitle>
            <DialogDescription>
              A versão atual (v{rotacionar?.versao}) fica guardada no histórico e o novo valor passa
              a valer imediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Novo segredo</Label>
              <Input
                type="password"
                value={novoSegredo}
                onChange={(e) => setNovoSegredo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Motivo (opcional)</Label>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotacionar(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarRotacao}>Rotacionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico */}
      <Dialog open={!!historico} onOpenChange={(o) => !o && setHistorico(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de rotações — {historico?.cred.nome}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2">
              {(historico?.versoes ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma rotação registrada ainda.</p>
              )}
              {(historico?.versoes ?? []).map((v: any) => (
                <div key={v.id} className="rounded-md border border-border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">v{v.versao}</Badge>
                    <span className="text-xs text-muted-foreground">{formatar(v.created_at)}</span>
                  </div>
                  <p className="font-mono text-xs">{v.mascara ?? "•••••"}</p>
                  {v.motivo && <p className="text-xs text-muted-foreground">{v.motivo}</p>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={remover}
        itemName={excluir?.nome}
        description="A credencial e todo o histórico de rotações serão removidos permanentemente."
      />
    </div>
  );
}
