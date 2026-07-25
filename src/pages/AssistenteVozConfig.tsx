import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import {
  Mic, Plus, Pencil, Trash2, Wrench, Settings2, MessageSquare,
  ExternalLink, MessagesSquare, PieChart, Lightbulb, Search, Save,
} from "lucide-react";
import { PROGRAMAS_DISPONIVEIS, EXEMPLOS_COMANDOS_VOZ } from "@/lib/voz/programasDisponiveis";
import { GatilhoLivePreview } from "@/components/voz/GatilhoLivePreview";
import { TestarGatilhoDialog } from "@/components/voz/TestarGatilhoDialog";

type TipoAcao =
  | "abrir_programa"
  | "popup_tela"
  | "conversa"
  | "navegar"
  | "consultar_metrica"
  | "responder"
  | "disparar_bot"
  | "comando_tv";

interface Comando {
  id: string;
  frase_gatilho: string;
  descricao: string | null;
  tipo_acao: TipoAcao;
  payload: any;
  resposta_falada: string | null;
  ativo: boolean;
}

const FERRAMENTAS_NATIVAS = [
  { id: "navegar_para", nome: "Navegar entre telas", desc: "Permite abrir telas via voz (ex: \"abrir dashboard\")." },
  { id: "consultar_metrica", nome: "Consultar métricas", desc: "Veículos online, empresas, orçamentos, TVs, etc." },
  { id: "disparar_bot", nome: "Disparar automações", desc: "Rodar bots/campanhas por voz (pede confirmação)." },
  { id: "enviar_comando_tv", nome: "Comandos para TVs", desc: "Refresh, reiniciar, limpar cache nas TVs." },
];

const VOZES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer", "coral", "sage"];
const METRICAS = [
  "veiculos_online", "empresas_total", "contatos_total", "orcamentos_hoje",
  "orcamentos_mes", "tv_dispositivos_online", "alertas_ponto_hoje", "atendimentos_abertos",
];
const COMANDOS_TV = ["refresh", "reiniciar_app", "limpar_cache"];

const PROVEDORES_CONVERSA = [
  { id: "interno", label: "IA interna (padrão do sistema)" },
  { id: "chatgpt", label: "ChatGPT (OpenAI)" },
  { id: "claude", label: "Claude / Cloud Code (Anthropic)" },
  { id: "cursor", label: "Cursor" },
];

const LABEL_TIPO: Record<TipoAcao, string> = {
  abrir_programa: "Abrir Programa",
  popup_tela: "Popup em tela",
  conversa: "Conversa livre",
  navegar: "Abrir tela (rota)",
  consultar_metrica: "Consultar métrica",
  responder: "Apenas responder",
  disparar_bot: "Disparar automação",
  comando_tv: "Comando nas TVs",
};

// Chave usada para o modo "Personalizar Menu" salvar as escolhas do usuário localmente
const MENU_CUSTOM_KEY = "pilar:menu-customizacao";

function telasDoUsuarioEstaoSalvas(): boolean {
  try {
    const v = localStorage.getItem(MENU_CUSTOM_KEY);
    return !!v && v !== "null" && v !== "undefined";
  } catch {
    return false;
  }
}

export default function AssistenteVozConfig() {
  const [comandos, setComandos] = useState<Comando[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Comando> | null>(null);
  const [confirmDel, setConfirmDel] = useState<Comando | null>(null);
  const [buscaPrograma, setBuscaPrograma] = useState("");

  // Confirmação "Salvar telas do usuário antes de rodar?"
  const [savePrompt, setSavePrompt] = useState<null | { onDecide: (v: "salvar" | "continuar" | "cancelar") => void }>(null);

  const carregar = async () => {
    setLoading(true);
    const { data: cmds } = await supabase.from("assistente_voz_comandos").select("*").order("frase_gatilho");
    setComandos((cmds || []) as any);
    const { data: userRes } = await supabase.auth.getUser();
    if (userRes?.user) {
      const { data: cfg } = await supabase.from("assistente_voz_config")
        .select("*").eq("auth_user_id", userRes.user.id).maybeSingle();
      setConfig(cfg || {
        auth_user_id: userRes.user.id,
        wake_word_ativo: false,
        responder_por_voz: true,
        voz: "alloy",
        wake_word: "ei pilar",
        ferramentas_desativadas: [],
      });
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const persistirComando = async () => {
    if (!editing?.frase_gatilho || !editing?.tipo_acao) {
      toast.error("Frase e tipo são obrigatórios");
      return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const { data: usuario } = await supabase.from("usuarios")
      .select("estabelecimento_id").eq("auth_user_id", userRes!.user!.id).maybeSingle();
    if (!usuario?.estabelecimento_id) {
      toast.error("Estabelecimento não identificado");
      return;
    }
    const body: any = {
      frase_gatilho: editing.frase_gatilho.toLowerCase().trim(),
      descricao: editing.descricao || null,
      tipo_acao: editing.tipo_acao,
      payload: editing.payload || {},
      resposta_falada: editing.resposta_falada || null,
      ativo: editing.ativo ?? true,
      estabelecimento_id: usuario.estabelecimento_id,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("assistente_voz_comandos").update(body).eq("id", editing.id));
    } else {
      body.created_by = userRes!.user!.id;
      ({ error } = await supabase.from("assistente_voz_comandos").insert(body));
    }
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo");
    setEditing(null);
    carregar();
  };

  const salvarComando = async () => {
    // Condição: só pode rodar/salvar se as telas do usuário estiverem salvas.
    if (!telasDoUsuarioEstaoSalvas()) {
      setSavePrompt({
        onDecide: async (decisao) => {
          setSavePrompt(null);
          if (decisao === "cancelar") return;
          if (decisao === "salvar") {
            try {
              localStorage.setItem(MENU_CUSTOM_KEY, JSON.stringify({ salvoEm: Date.now() }));
              toast.success("Telas do usuário salvas");
            } catch {
              toast.error("Não foi possível salvar as telas do usuário");
              return;
            }
          }
          await persistirComando();
        },
      });
      return;
    }
    await persistirComando();
  };

  const excluir = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("assistente_voz_comandos").delete().eq("id", confirmDel.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Comando removido");
    setConfirmDel(null);
    carregar();
  };

  const salvarConfig = async (patch: any) => {
    const novo = { ...config, ...patch };
    setConfig(novo);
    const { error } = await supabase.from("assistente_voz_config").upsert(novo, { onConflict: "auth_user_id" });
    if (error) toast.error(error.message);
    else toast.success("Configuração salva");
  };

  const toggleFerramenta = async (id: string, ativa: boolean) => {
    const atuais: string[] = config?.ferramentas_desativadas || [];
    const novas = ativa ? atuais.filter((x) => x !== id) : Array.from(new Set([...atuais, id]));
    salvarConfig({ ferramentas_desativadas: novas });
  };

  const programasFiltrados = useMemo(() => {
    const q = buscaPrograma.trim().toLowerCase();
    if (!q) return PROGRAMAS_DISPONIVEIS;
    return PROGRAMAS_DISPONIVEIS.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q),
    );
  }, [buscaPrograma]);

  const programasPorCategoria = useMemo(() => {
    const m = new Map<string, typeof PROGRAMAS_DISPONIVEIS>();
    for (const p of programasFiltrados) {
      const arr = m.get(p.categoria) || [];
      arr.push(p);
      m.set(p.categoria, arr);
    }
    return Array.from(m.entries());
  }, [programasFiltrados]);

  const novoGatilho = () =>
    setEditing({ tipo_acao: "abrir_programa", ativo: true, payload: { requer_tela_salva: true } });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Mic className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Assistente de Voz "Pilar"</h1>
          <p className="text-sm text-muted-foreground">Comandos customizados, ferramentas nativas e preferências.</p>
        </div>
      </div>

      <Tabs defaultValue="comandos">
        <TabsList>
          <TabsTrigger value="comandos"><MessageSquare className="w-4 h-4 mr-2" />Gatilhos</TabsTrigger>
          <TabsTrigger value="exemplos"><Lightbulb className="w-4 h-4 mr-2" />Exemplos de voz</TabsTrigger>
          <TabsTrigger value="ferramentas"><Wrench className="w-4 h-4 mr-2" />Ferramentas nativas</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="w-4 h-4 mr-2" />Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="comandos" className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Frases faladas pelo usuário que disparam ações. Escolha uma tela e escreva o que deseja que aconteça.
            </p>
            <Button onClick={novoGatilho}>
              <Plus className="w-4 h-4 mr-2" /> Novo gatilho
            </Button>
          </div>

          {loading && <Card className="p-8 text-center text-sm text-muted-foreground">Carregando…</Card>}

          {!loading && comandos.length === 0 && (
            <Card className="p-10 text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">Nenhum gatilho customizado ainda.</p>
              <Button onClick={novoGatilho}>
                <Plus className="w-4 h-4 mr-2" /> Criar primeiro gatilho
              </Button>
            </Card>
          )}

          <div className="grid gap-2">
            {comandos.map((c) => (
              <Card key={c.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">"{c.frase_gatilho}"</span>
                    <Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                    <Badge variant="outline">{LABEL_TIPO[c.tipo_acao as TipoAcao] || c.tipo_acao}</Badge>
                    {c.payload?.requer_tela_salva && (
                      <Badge variant="outline" className="text-xs">
                        <Save className="w-3 h-3 mr-1" /> Exige telas salvas
                      </Badge>
                    )}
                  </div>
                  {c.descricao && <p className="text-sm text-muted-foreground truncate mt-1">{c.descricao}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDel(c)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="exemplos" className="space-y-3">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">O que dá para fazer falando com o Pilar?</p>
                <p className="text-muted-foreground">
                  Segue uma lista de exemplos que o assistente entende. Você pode falar variações delas —
                  não precisa ser exatamente igual. Use como inspiração ao criar seus próprios gatilhos.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {EXEMPLOS_COMANDOS_VOZ.map((grupo) => (
              <Card key={grupo.categoria} className="p-4">
                <div className="font-medium mb-2">{grupo.categoria}</div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {grupo.frases.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Mic className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ferramentas" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Desative ferramentas que você não quer que o assistente use.
          </p>
          <div className="grid gap-2">
            {FERRAMENTAS_NATIVAS.map((f) => {
              const desativadas: string[] = config?.ferramentas_desativadas || [];
              const ativa = !desativadas.includes(f.id);
              return (
                <Card key={f.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-medium">{f.nome}</div>
                    <div className="text-sm text-muted-foreground">{f.desc}</div>
                  </div>
                  <Switch checked={ativa} onCheckedChange={(v) => toggleFerramenta(f.id, v)} />
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-3">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Responder por voz</div>
                <div className="text-sm text-muted-foreground">Além do texto, fala a resposta.</div>
              </div>
              <Switch checked={!!config?.responder_por_voz}
                onCheckedChange={(v) => salvarConfig({ responder_por_voz: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Wake word (escuta contínua)</div>
                <div className="text-sm text-muted-foreground">Ativa por palavra-chave sem apertar o botão.</div>
              </div>
              <Switch checked={!!config?.wake_word_ativo}
                onCheckedChange={(v) => salvarConfig({ wake_word_ativo: v })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Palavra de ativação</Label>
                <Input value={config?.wake_word || ""} onChange={(e) => setConfig({ ...config, wake_word: e.target.value })}
                  onBlur={() => salvarConfig({ wake_word: config.wake_word })} />
              </div>
              <div>
                <Label>Voz</Label>
                <Select value={config?.voz || "alloy"} onValueChange={(v) => salvarConfig({ voz: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VOZES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo Novo/Editar Gatilho */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar gatilho" : "Novo gatilho de voz"}</DialogTitle>
            <DialogDescription>
              Defina a frase falada, escolha o tipo de ação e diga por escrito o que deve acontecer.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Frase gatilho *</Label>
                <Input
                  placeholder='ex: "cadastrar CNPJ", "quem vendeu mais hoje"'
                  value={editing.frase_gatilho || ""}
                  onChange={(e) => setEditing({ ...editing, frase_gatilho: e.target.value })}
                />
              </div>

              <div>
                <Label>Descrição (opcional)</Label>
                <Input
                  value={editing.descricao || ""}
                  onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
                />
              </div>

              <div>
                <Label>Tipo de ação *</Label>
                <Select
                  value={editing.tipo_acao}
                  onValueChange={(v: TipoAcao) =>
                    setEditing({ ...editing, tipo_acao: v, payload: { requer_tela_salva: editing.payload?.requer_tela_salva ?? true } })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abrir_programa">
                      <div className="flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Abrir Programa</div>
                    </SelectItem>
                    <SelectItem value="popup_tela">
                      <div className="flex items-center gap-2"><PieChart className="w-4 h-4" /> Popup em tela</div>
                    </SelectItem>
                    <SelectItem value="conversa">
                      <div className="flex items-center gap-2"><MessagesSquare className="w-4 h-4" /> Conversa livre</div>
                    </SelectItem>
                    <SelectItem value="consultar_metrica">Consultar métrica (avançado)</SelectItem>
                    <SelectItem value="disparar_bot">Disparar automação (avançado)</SelectItem>
                    <SelectItem value="comando_tv">Comando nas TVs (avançado)</SelectItem>
                    <SelectItem value="responder">Apenas responder texto</SelectItem>
                    <SelectItem value="navegar">Abrir tela por rota (legado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ABRIR PROGRAMA */}
              {editing.tipo_acao === "abrir_programa" && (
                <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                  <div>
                    <Label>Programa (tela do sistema) *</Label>
                    <div className="relative mt-1">
                      <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome, categoria ou rota…"
                        className="pl-8"
                        value={buscaPrograma}
                        onChange={(e) => setBuscaPrograma(e.target.value)}
                      />
                    </div>
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-md border bg-background">
                      {programasPorCategoria.map(([cat, lista]) => (
                        <div key={cat}>
                          <div className="px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground bg-muted/50">
                            {cat}
                          </div>
                          {lista.map((p) => {
                            const selected = editing.payload?.path === p.path;
                            return (
                              <button
                                key={p.path}
                                type="button"
                                onClick={() =>
                                  setEditing({
                                    ...editing,
                                    payload: { ...editing.payload, path: p.path, label: p.label },
                                  })
                                }
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center justify-between gap-2 ${
                                  selected ? "bg-primary/10 text-primary" : ""
                                }`}
                              >
                                <span>{p.label}</span>
                                <span className="text-xs text-muted-foreground">{p.path}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                      {programasPorCategoria.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Nenhum programa encontrado.
                        </div>
                      )}
                    </div>
                    {editing.payload?.label && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selecionado: <span className="font-medium text-foreground">{editing.payload.label}</span> ({editing.payload.path})
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Instrução (opcional) — o que fazer depois de abrir?</Label>
                    <Textarea
                      rows={3}
                      placeholder="ex: cadastrar o CNPJ 12.345.678/0001-90 com nome Empresa X"
                      value={editing.payload?.instrucao || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, payload: { ...editing.payload, instrucao: e.target.value } })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Escreva em linguagem natural. O assistente lê essa instrução ao abrir a tela.
                    </p>
                  </div>
                </div>
              )}

              {/* POPUP EM TELA */}
              {editing.tipo_acao === "popup_tela" && (
                <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                  <div>
                    <Label>O que trazer no popup? *</Label>
                    <Textarea
                      rows={3}
                      placeholder="ex: qual gerente vendeu mais no mês / qual vendedor vendeu mais hoje"
                      value={editing.payload?.prompt || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, payload: { ...editing.payload, prompt: e.target.value } })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3 bg-background">
                    <div>
                      <div className="font-medium text-sm">Mostrar resultado em gráfico</div>
                      <div className="text-xs text-muted-foreground">
                        Quando aplicável, o popup exibe um gráfico junto da resposta.
                      </div>
                    </div>
                    <Switch
                      checked={!!editing.payload?.mostrar_grafico}
                      onCheckedChange={(v) =>
                        setEditing({ ...editing, payload: { ...editing.payload, mostrar_grafico: v } })
                      }
                    />
                  </div>
                </div>
              )}

              {/* CONVERSA LIVRE */}
              {editing.tipo_acao === "conversa" && (
                <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                  <div>
                    <Label>Contexto inicial (opcional)</Label>
                    <Textarea
                      rows={2}
                      placeholder="ex: você é um consultor comercial focado em pós-venda"
                      value={editing.payload?.contexto || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, payload: { ...editing.payload, contexto: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <Label>Provedor de IA</Label>
                    <Select
                      value={editing.payload?.provedor || "interno"}
                      onValueChange={(v) =>
                        setEditing({ ...editing, payload: { ...editing.payload, provedor: v } })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROVEDORES_CONVERSA.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3 bg-background">
                    <div>
                      <div className="font-medium text-sm">Sempre responder de forma resumida</div>
                      <div className="text-xs text-muted-foreground">
                        Ideal quando a resposta vai ser lida em voz alta.
                      </div>
                    </div>
                    <Switch
                      checked={editing.payload?.resumir ?? true}
                      onCheckedChange={(v) =>
                        setEditing({ ...editing, payload: { ...editing.payload, resumir: v } })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Legado / avançado */}
              {editing.tipo_acao === "navegar" && (
                <div>
                  <Label>Rota (ex: /relatorios)</Label>
                  <Input value={editing.payload?.path || ""}
                    onChange={(e) => setEditing({ ...editing, payload: { ...editing.payload, path: e.target.value } })} />
                </div>
              )}
              {editing.tipo_acao === "consultar_metrica" && (
                <div>
                  <Label>Métrica</Label>
                  <Select value={editing.payload?.metrica || ""}
                    onValueChange={(v) => setEditing({ ...editing, payload: { metrica: v } })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{METRICAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {editing.tipo_acao === "disparar_bot" && (
                <div>
                  <Label>Nome da automação</Label>
                  <Input value={editing.payload?.nome_automacao || ""}
                    onChange={(e) => setEditing({ ...editing, payload: { nome_automacao: e.target.value } })} />
                </div>
              )}
              {editing.tipo_acao === "comando_tv" && (
                <div>
                  <Label>Comando</Label>
                  <Select value={editing.payload?.comando || ""}
                    onValueChange={(v) => setEditing({ ...editing, payload: { comando: v } })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{COMANDOS_TV.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Resposta falada (opcional)</Label>
                <Textarea rows={2} value={editing.resposta_falada || ""}
                  onChange={(e) => setEditing({ ...editing, resposta_falada: e.target.value })} />
              </div>

              <div className="rounded-md border p-3 bg-background flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Só rodar se as telas do usuário estiverem salvas</div>
                  <div className="text-xs text-muted-foreground">
                    Se não estiverem, o assistente pergunta se deseja salvar antes de executar.
                  </div>
                </div>
                <Switch
                  checked={editing.payload?.requer_tela_salva ?? true}
                  onCheckedChange={(v) =>
                    setEditing({ ...editing, payload: { ...editing.payload, requer_tela_salva: v } })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                <span className="text-sm">Ativo</span>
              </div>

              <GatilhoLivePreview
                tipo={editing.tipo_acao}
                payload={editing.payload}
                frase={editing.frase_gatilho || ""}
                resposta={editing.resposta_falada}
                provedorLabel={PROVEDORES_CONVERSA.find((p) => p.id === editing.payload?.provedor)?.label}
              />

            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={salvarComando}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação: telas do usuário não estão salvas */}
      <AlertDialog open={!!savePrompt} onOpenChange={(o) => !o && savePrompt?.onDecide("cancelar")}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar suas telas antes?</AlertDialogTitle>
            <AlertDialogDescription>
              As telas do usuário ainda não foram salvas. Deseja salvar antes de continuar? Você pode
              salvar, seguir sem salvar ou cancelar a ação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => savePrompt?.onDecide("cancelar")}>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => savePrompt?.onDecide("continuar")}>
              Não salvar e continuar
            </Button>
            <AlertDialogAction onClick={() => savePrompt?.onDecide("salvar")}>
              Salvar e continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        onConfirm={excluir}
        title="Excluir gatilho?"
        description={confirmDel ? `"${confirmDel.frase_gatilho}" será removido.` : ""}
      />
    </div>
  );
}
