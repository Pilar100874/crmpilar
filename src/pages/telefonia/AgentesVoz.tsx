import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bot, KeyRound, PhoneCall, PhoneIncoming, Headset, Plus, Save, Trash2, Server, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEstabelecimento } from "@/lib/aip/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { meuRamal } from "@/components/telefonia/IaAjudaAtendente";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkflowCard, WorkflowCardGrid } from "@/components/ui/workflow-card";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const db = supabase as any;

type Agente = {
  id?: string; nome: string; ativo: boolean; modos: string[]; ramal_ia: string; ramal_transferencia: string;
  saudacao: string; prompt: string; qualidade: "gratuita" | "premium"; stt_provedor: string;
  llm_provedor: string; llm_modelo: string; tts_provedor: string; voz: string; updated_at?: string;
};
type Chamada = {
  id: string; modo: string; numero: string | null; ramal_monitorado: string | null; status: string;
  transcricao: { papel: string; texto: string }[]; sugestoes: { texto: string }[]; iniciada_em: string; duracao_seg: number | null;
};

const NOVO: Agente = {
  nome: "Atendente virtual", ativo: true, modos: ["receber"], ramal_ia: "", ramal_transferencia: "",
  saudacao: "Olá! Sou a assistente virtual da Pilar. Como posso ajudar?", prompt: "", qualidade: "gratuita",
  stt_provedor: "deepgram", llm_provedor: "openai", llm_modelo: "", tts_provedor: "elevenlabs", voz: "",
};

const MODOS = [
  { id: "receber", rotulo: "Atender recebidas", icone: PhoneIncoming, desc: "Atende quem liga para a empresa e transfere quando preciso." },
  { id: "ligar", rotulo: "Fazer ligações", icone: PhoneCall, desc: "Liga para contatos (Disparo em massa) e transfere ao atendente." },
  { id: "assistir", rotulo: "Ajudar o atendente", icone: Headset, desc: "Escuta a ligação e sugere respostas ao atendente." },
];

const CHAVES = [
  { id: "deepgram", nome: "Deepgram", uso: "Transforma a fala do cliente em texto" },
  { id: "openai", nome: "OpenAI", uso: "Inteligência da conversa (GPT)" },
  { id: "anthropic", nome: "Anthropic", uso: "Inteligência da conversa (Claude)" },
  { id: "elevenlabs", nome: "ElevenLabs", uso: "Voz natural da IA" },
  { id: "cartesia", nome: "Cartesia", uso: "Voz natural da IA (mais rápida)" },
];

const ROTULO_STATUS: Record<string, string> = { em_andamento: "Em andamento", finalizada: "Finalizada", erro: "Erro" };

export default function AgentesVoz() {
  const empresa = useEstabelecimento();
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [atual, setAtual] = useState<Agente>(NOVO);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [chavesSalvas, setChavesSalvas] = useState<Record<string, string>>({});
  const [valoresChave, setValoresChave] = useState<Record<string, string>>({});
  const [excluir, setExcluir] = useState(false);
  const [escolherTipo, setEscolherTipo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!empresa) { setCarregando(false); return; }
    const [a, c, k] = await Promise.all([
      db.from("voz_agentes").select("*").eq("estabelecimento_id", empresa).order("created_at"),
      db.from("voz_chamadas").select("*").eq("estabelecimento_id", empresa).order("iniciada_em", { ascending: false }).limit(30),
      db.from("aip_credenciais").select("id, provedor").eq("estabelecimento_id", empresa).in("provedor", CHAVES.map((x) => x.id)),
    ]);
    const lista = (a.data ?? []).map((x: any) => ({ ...NOVO, ...x, ramal_ia: x.ramal_ia ?? "", ramal_transferencia: x.ramal_transferencia ?? "", llm_modelo: x.llm_modelo ?? "", voz: x.voz ?? "" }));
    setAgentes(lista);
    setAtual((ant) => (ant.id ? lista.find((l: Agente) => l.id === ant.id) ?? ant : lista[0] ?? NOVO));
    setChamadas(c.data ?? []);
    setChavesSalvas(Object.fromEntries((k.data ?? []).map((x: any) => [x.provedor, x.id])));
    setCarregando(false);
  }, [empresa]);

  useEffect(() => { void carregar(); }, [carregar]);

  useEffect(() => {
    if (!empresa) return;
    const canal = supabase.channel("voz-chamadas")
      .on("postgres_changes", { event: "*", schema: "public", table: "voz_chamadas", filter: `estabelecimento_id=eq.${empresa}` }, () => void carregar())
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, [empresa, carregar]);

  const salvar = async () => {
    if (!empresa) return;
    if (!atual.nome.trim() || !atual.ramal_ia.trim()) return toast.error("Informe o nome e o ramal da IA");
    const ramalUsuario = await meuRamal();
    if (!ramalUsuario) return toast.error("Seu usuário não tem ramal configurado no cadastro");
    const { id, ...dados } = atual;
    const corpo = { ...dados, modos: [dados.modos[0] ?? "receber"], ramal_transferencia: ramalUsuario, estabelecimento_id: empresa, updated_at: new Date().toISOString() };
    const r = id ? await db.from("voz_agentes").update(corpo).eq("id", id).select().single()
      : await db.from("voz_agentes").insert(corpo).select().single();
    if (r.error) return toast.error(r.error.message);
    toast.success("Agente salvo");
    setAtual({ ...atual, id: r.data.id });
    void carregar();
  };

  const remover = async () => {
    if (!atual.id) return;
    const r = await db.from("voz_agentes").delete().eq("id", atual.id);
    if (r.error) return toast.error(r.error.message);
    toast.success("Agente excluído");
    setAtual(NOVO); setExcluir(false); setEditando(false); void carregar();
  };

  const salvarChave = async (provedor: string, nome: string) => {
    const segredo = valoresChave[provedor]?.trim();
    if (!segredo) return toast.error("Cole a chave antes de salvar");
    const { error, data } = await supabase.functions.invoke("aip-credenciais", {
      body: { acao: "salvar", id: chavesSalvas[provedor], provedor, nome: `${nome} (Agentes de Voz)`, segredo },
    });
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? "Não foi possível salvar a chave");
    toast.success(`Chave ${nome} salva com segurança`);
    setValoresChave((v) => ({ ...v, [provedor]: "" }));
    void carregar();
  };

  const novoDoTipo = (m: string) => {
    const t = MODOS.find((x) => x.id === m);
    setAtual({ ...NOVO, modos: [m], nome: t?.rotulo ?? NOVO.nome });
    setEscolherTipo(false);
    setEditando(true);
  };
  const abrir = (a: Agente) => { setAtual(a); setEditando(true); };
  const alternarAtivo = async (a: Agente) => {
    const r = await db.from("voz_agentes").update({ ativo: !a.ativo }).eq("id", a.id);
    if (r.error) return toast.error(r.error.message);
    toast.success(a.ativo ? "Agente desativado" : "Agente ativado");
    void carregar();
  };
  const duplicar = async (a: Agente) => {
    const { id, ...dados } = a as any;
    delete dados.created_at; delete dados.updated_at;
    const r = await db.from("voz_agentes").insert({ ...dados, nome: `${a.nome} (cópia)`, ativo: false, estabelecimento_id: empresa }).select().single();
    if (r.error) return toast.error(r.error.message);
    toast.success("Agente duplicado (inativo)");
    void carregar();
  };

  return (
    <div className="min-h-full animate-fade-in bg-background p-4 sm:p-6 md:p-8">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-bold text-foreground sm:text-lg">Agentes de Voz</h1>
        <Button variant="outline" size="sm" onClick={() => void carregar()}><RefreshCw className="mr-1 h-4 w-4" /> Atualizar</Button>
      </div>
      <p className="text-sm text-muted-foreground sm:text-base">IA que atende, liga e ajuda nas ligações da central telefônica.</p>

      <Tabs defaultValue="agente" className="mt-4 sm:mt-6">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="agente">Agente</TabsTrigger>
          <TabsTrigger value="chaves">Chaves</TabsTrigger>
          <TabsTrigger value="chamadas">Chamadas</TabsTrigger>
          <TabsTrigger value="servidor">Servidor</TabsTrigger>
        </TabsList>

        <TabsContent value="agente" className="space-y-4 sm:space-y-6 md:space-y-8">
          {!editando && (
            <>
              <Card className="cursor-pointer border-2 border-dashed border-primary/30 transition-all hover:shadow-lg" onClick={() => setEscolherTipo(true)}>
                <CardHeader className="p-3 sm:p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 sm:mb-4 sm:h-12 sm:w-12">
                    <Bot className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">Novo Agente de Voz</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Crie um agente para atender quem liga, fazer ligações ou ajudar o atendente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                  <Button className="h-9 w-full text-sm sm:h-10 sm:text-base">
                    <Plus className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                    Criar Novo Agente
                    <ArrowRight className="ml-1 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
                  </Button>
                </CardContent>
              </Card>

              {carregando && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="h-full animate-pulse">
                      <CardHeader className="p-3 sm:p-4">
                        <div className="mb-3 h-10 w-10 rounded-lg bg-muted sm:mb-4 sm:h-12 sm:w-12" />
                        <div className="mb-2 h-5 w-3/4 rounded bg-muted sm:h-6" />
                        <div className="h-3 w-full rounded bg-muted sm:h-4" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}

              {!carregando && agentes.length === 0 && (
                <div className="py-8 text-center sm:py-12">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted sm:mb-4 sm:h-20 sm:w-20">
                    <Bot className="h-8 w-8 text-muted-foreground sm:h-10 sm:w-10" />
                  </div>
                  <p className="px-4 text-sm text-muted-foreground sm:text-base">
                    Você ainda não tem agentes de voz. Clique no card acima para criar o primeiro!
                  </p>
                </div>
              )}

              {!carregando && MODOS.map((m) => {
                const doTipo = agentes.filter((a) => (a.modos[0] ?? "receber") === m.id);
                if (doTipo.length === 0) return null;
                return (
                  <div key={m.id} className="space-y-3 sm:space-y-4">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
                      <m.icone className="h-4 w-4 text-primary sm:h-5 sm:w-5" /> {m.rotulo}
                      <Badge variant="outline" className="text-xs">{doTipo.length}</Badge>
                    </h2>
                    <WorkflowCardGrid>
                      {doTipo.map((a) => (
                        <WorkflowCard key={a.id} id={a.id!} title={a.nome} description={a.prompt ? a.prompt.slice(0, 120) : m.desc}
                          isActive={a.ativo}
                          menuOpen={menuAberto === a.id} onMenuOpenChange={(o) => setMenuAberto(o ? a.id! : null)}
                          onEdit={() => abrir(a)} onOpenEditor={() => abrir(a)}
                          onDuplicate={() => void duplicar(a)}
                          onToggleActive={() => void alternarAtivo(a)}
                          onDelete={() => { setAtual(a); setExcluir(true); }}
                          customContent={
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="text-xs">Ramal IA {a.ramal_ia || "—"}</Badge>
                                <Badge variant="outline" className={`text-xs ${a.qualidade === "premium" ? "border-primary/20 bg-primary/10 text-primary" : ""}`}>
                                  {a.qualidade === "premium" ? "Premium" : "Gratuita"}
                                </Badge>
                              </div>
                              {a.updated_at && (
                                <div className="text-xs text-muted-foreground">
                                  Atualizado {formatDistanceToNow(new Date(a.updated_at), { addSuffix: true, locale: ptBR })}
                                </div>
                              )}
                            </>
                          } />
                      ))}
                    </WorkflowCardGrid>
                  </div>
                );
              })}
            </>
          )}
          <Dialog open={escolherTipo} onOpenChange={setEscolherTipo}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Agente de Voz</DialogTitle>
                <DialogDescription>Escolha o que este agente vai fazer. Ele fica com um único tipo.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-3">
                {MODOS.map((m) => (
                  <button key={m.id} type="button" onClick={() => novoDoTipo(m.id)}
                    className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-accent">
                    <m.icone className="h-6 w-6 text-primary" />
                    <span className="font-semibold">{m.rotulo}</span>
                    <span className="text-xs text-muted-foreground">{m.desc}</span>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          {editando && (
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0 p-3 sm:p-4">
              <Button variant="outline" size="sm" onClick={() => setEditando(false)}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
              {(() => { const m = MODOS.find((x) => x.id === (atual.modos[0] ?? "receber")) ?? MODOS[0]; return (
                <Badge variant="outline" className="gap-1"><m.icone className="h-3 w-3" /> {m.rotulo}</Badge>); })()}
              <CardTitle className="text-base sm:text-lg">{atual.id ? "Editar agente" : "Novo agente"}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 border-t p-3 pt-4 sm:p-4 md:grid-cols-2">
              <div className="space-y-1"><Label>Nome</Label><Input value={atual.nome} onChange={(e) => setAtual({ ...atual, nome: e.target.value })} /></div>
              <div className="flex items-end gap-2"><Switch checked={atual.ativo} onCheckedChange={(v) => setAtual({ ...atual, ativo: v })} /><Label>Ativo</Label></div>
              <div className="space-y-1"><Label>Ramal da IA na central</Label><Input placeholder="ex.: 7000" value={atual.ramal_ia} onChange={(e) => setAtual({ ...atual, ramal_ia: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Transferir para o ramal</Label>
                <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">Sempre o ramal do seu usuário (cadastro de usuários). A IA transfere as ligações para ele automaticamente.</p>
              </div>
              <div className="space-y-1 md:col-span-2"><Label>Saudação</Label><Input value={atual.saudacao} onChange={(e) => setAtual({ ...atual, saudacao: e.target.value })} /></div>
              <div className="space-y-1 md:col-span-2">
                <Label>Instruções para a IA</Label>
                <Textarea rows={6} placeholder="Ex.: Você atende a Pilar. Informe horários, agende visitas e transfira para vendas quando pedirem orçamento."
                  value={atual.prompt} onChange={(e) => setAtual({ ...atual, prompt: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Qualidade da voz</Label>
                <Select value={atual.qualidade} onValueChange={(v: any) => setAtual({ ...atual, qualidade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gratuita">Gratuita (IA inclusa, mais lenta)</SelectItem>
                    <SelectItem value="premium">Premium (voz natural, usa suas chaves)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {atual.qualidade === "premium" ? (
                <>
                  <div className="space-y-1">
                    <Label>Inteligência</Label>
                    <Select value={atual.llm_provedor} onValueChange={(v) => setAtual({ ...atual, llm_provedor: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="openai">OpenAI</SelectItem><SelectItem value="anthropic">Anthropic</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Modelo (opcional)</Label><Input placeholder="ex.: gpt-4o-mini" value={atual.llm_modelo} onChange={(e) => setAtual({ ...atual, llm_modelo: e.target.value })} /></div>
                  <div className="space-y-1">
                    <Label>Voz</Label>
                    <Select value={atual.tts_provedor} onValueChange={(v) => setAtual({ ...atual, tts_provedor: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="elevenlabs">ElevenLabs</SelectItem><SelectItem value="cartesia">Cartesia</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Código da voz</Label><Input placeholder="ID da voz no serviço" value={atual.voz} onChange={(e) => setAtual({ ...atual, voz: e.target.value })} /></div>
                </>
              ) : (
                <div className="space-y-1">
                  <Label>Voz</Label>
                  <Select value={atual.voz || "alloy"} onValueChange={(v) => setAtual({ ...atual, voz: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["alloy", "nova", "shimmer", "echo", "onyx", "fable"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-t pt-4 md:col-span-2">
                <Button onClick={() => void salvar()}><Save className="mr-1 h-4 w-4" /> Salvar</Button>
                {atual.id && <Button variant="outline" onClick={() => setExcluir(true)}><Trash2 className="mr-1 h-4 w-4" /> Excluir</Button>}
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="chaves">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Chaves dos serviços pagos</CardTitle>
              <CardDescription>Usadas só na qualidade Premium. Ficam guardadas cifradas e nunca aparecem de novo na tela.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {CHAVES.map((c) => (
                <div key={c.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[200px_1fr_auto] md:items-center">
                  <div>
                    <p className="font-medium">{c.nome} {chavesSalvas[c.id] && <Badge variant="secondary" className="ml-1">Salva</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{c.uso}</p>
                  </div>
                  <Input type="password" autoComplete="off" placeholder={chavesSalvas[c.id] ? "•••••••• (cole para trocar)" : "Cole a chave aqui"}
                    value={valoresChave[c.id] ?? ""} onChange={(e) => setValoresChave((v) => ({ ...v, [c.id]: e.target.value }))} />
                  <Button size="sm" onClick={() => void salvarChave(c.id, c.nome)}>Salvar</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chamadas" className="space-y-3">
          {chamadas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma chamada da IA ainda.</p>}
          {chamadas.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {MODOS.find((m) => m.id === c.modo)?.rotulo ?? c.modo}
                  <span className="text-sm font-normal text-muted-foreground">{c.numero || (c.ramal_monitorado && `Ramal ${c.ramal_monitorado}`)}</span>
                  <Badge variant={c.status === "em_andamento" ? "default" : "secondary"}>{ROTULO_STATUS[c.status] ?? c.status}</Badge>
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {new Date(c.iniciada_em).toLocaleString("pt-BR")}{c.duracao_seg != null && ` · ${c.duracao_seg}s`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {c.sugestoes?.length > 0 && (
                  <div className="rounded-md border border-primary/40 bg-primary/10 p-2 text-sm">
                    <p className="text-xs font-semibold text-primary">Sugestão para o atendente</p>
                    {c.sugestoes[c.sugestoes.length - 1].texto}
                  </div>
                )}
                <div className="max-h-56 space-y-1 overflow-y-auto text-sm">
                  {(c.transcricao ?? []).map((f, i) => (
                    <p key={i}><span className="font-semibold">{f.papel === "agente" ? "IA" : "Cliente"}:</span> {f.texto}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="servidor">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" /> Como ligar a IA na central</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>1. Na central UCM, crie um ramal para a IA (o mesmo informado no agente), com codec PCMU/PCMA.</p>
              <p>2. Instale o aplicativo <b>Pilar Voz</b> num Android ligado no Wi‑Fi da central (ou rode o servidor <b>voice-agent-server</b> num computador da mesma rede).</p>
              <p className="pl-4 text-muted-foreground">No app, use uma chave do tipo "Pilar Voz" criada no botão Chaves da tela Aplicativos e downloads e informe o IP da central e a senha do ramal.</p>
              <Button size="sm" variant="outline" onClick={() => fetch("/coletor/voz-version.json", { cache: "no-store" }).then((r) => r.json()).then((j) => window.open(j.downloadUrl, "_blank", "noopener")).catch(() => toast.error("Aplicativo ainda não publicado"))}>Baixar app Pilar Voz (Android)</Button>
              <p>3. Preencha o endereço da central, a senha do ramal e a chave do servidor (a mesma do motor de agentes).</p>
              <p>4. Para atender recebidas, coloque o ramal da IA na fila ou URA desejada.</p>
              <p className="text-muted-foreground">O Railway não recebe o áudio do telefone de fora; por isso o servidor precisa ficar perto da central (ou ligado a ela por VPN).</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteConfirmDialog open={excluir} onOpenChange={setExcluir} onConfirm={() => void remover()} title="Excluir agente de voz?" />
    </div>
  );
}
