import { useCallback, useEffect, useState } from "react";
import { Bot, KeyRound, PhoneCall, PhoneIncoming, Headset, Plus, Save, Trash2, Server, RefreshCw } from "lucide-react";
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

const db = supabase as any;

type Agente = {
  id?: string; nome: string; ativo: boolean; modos: string[]; ramal_ia: string; ramal_transferencia: string;
  saudacao: string; prompt: string; qualidade: "gratuita" | "premium"; stt_provedor: string;
  llm_provedor: string; llm_modelo: string; tts_provedor: string; voz: string;
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
  { id: "receber", rotulo: "Atender recebidas", icone: PhoneIncoming },
  { id: "ligar", rotulo: "Fazer ligações", icone: PhoneCall },
  { id: "assistir", rotulo: "Ajudar o atendente", icone: Headset },
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

  const carregar = useCallback(async () => {
    if (!empresa) return;
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
    const { id, ...dados } = atual;
    const corpo = { ...dados, estabelecimento_id: empresa, updated_at: new Date().toISOString() };
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
    setAtual(NOVO); setExcluir(false); void carregar();
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

  const alternarModo = (m: string) =>
    setAtual((a) => ({ ...a, modos: a.modos.includes(m) ? a.modos.filter((x) => x !== m) : [...a.modos, m] }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Bot className="h-6 w-6 text-primary" /> Agentes de Voz</h1>
          <p className="text-sm text-muted-foreground">IA que atende, liga e ajuda nas ligações da central telefônica.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void carregar()}><RefreshCw className="mr-1 h-4 w-4" /> Atualizar</Button>
      </div>

      <Tabs defaultValue="agente">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="agente">Agente</TabsTrigger>
          <TabsTrigger value="chaves">Chaves</TabsTrigger>
          <TabsTrigger value="chamadas">Chamadas</TabsTrigger>
          <TabsTrigger value="servidor">Servidor</TabsTrigger>
        </TabsList>

        <TabsContent value="agente" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {agentes.map((a) => (
              <Button key={a.id} size="sm" variant={a.id === atual.id ? "default" : "outline"} onClick={() => setAtual(a)}>{a.nome}</Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setAtual(NOVO)}><Plus className="mr-1 h-4 w-4" /> Novo agente</Button>
          </div>
          <Card>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
              <div className="space-y-1"><Label>Nome</Label><Input value={atual.nome} onChange={(e) => setAtual({ ...atual, nome: e.target.value })} /></div>
              <div className="flex items-end gap-2"><Switch checked={atual.ativo} onCheckedChange={(v) => setAtual({ ...atual, ativo: v })} /><Label>Ativo</Label></div>
              <div className="space-y-1"><Label>Ramal da IA na central</Label><Input placeholder="ex.: 7000" value={atual.ramal_ia} onChange={(e) => setAtual({ ...atual, ramal_ia: e.target.value })} /></div>
              <div className="space-y-1"><Label>Transferir para o ramal</Label><Input placeholder="ex.: 2001" value={atual.ramal_transferencia} onChange={(e) => setAtual({ ...atual, ramal_transferencia: e.target.value })} /></div>
              <div className="space-y-2 md:col-span-2">
                <Label>O que este agente faz</Label>
                <div className="flex flex-wrap gap-2">
                  {MODOS.map((m) => (
                    <Button key={m.id} type="button" size="sm" variant={atual.modos.includes(m.id) ? "default" : "outline"} onClick={() => alternarModo(m.id)}>
                      <m.icone className="mr-1 h-4 w-4" /> {m.rotulo}
                    </Button>
                  ))}
                </div>
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
              <div className="flex gap-2 md:col-span-2">
                <Button onClick={() => void salvar()}><Save className="mr-1 h-4 w-4" /> Salvar</Button>
                {atual.id && <Button variant="outline" onClick={() => setExcluir(true)}><Trash2 className="mr-1 h-4 w-4" /> Excluir</Button>}
              </div>
            </CardContent>
          </Card>
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
              <p className="pl-4 text-muted-foreground">No app, use uma chave do tipo "Pilar Voz" criada em Chaves dos aplicativos e informe o IP da central e a senha do ramal.</p>
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
