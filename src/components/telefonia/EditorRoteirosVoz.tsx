import { useCallback, useEffect, useState } from "react";
import { Copy, Download, GitBranch, Loader2, Monitor, PhoneCall, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimuladorTelaVoz } from "./SimuladorTelaVoz";
import { FluxoRoteiroVoz } from "./FluxoRoteiroVoz";
import { CriarComIaDialog, DiagnosticoRoteiroCard, MapaConversa, ModelosProntosDialog } from "./AjudantesRoteiro";
import { MODELOS_ROTEIRO, roteiroDoModelo } from "@/lib/voz/qualidadeRoteiro";
import { corrigirTodas, validarPergunta } from "@/lib/voz/validacaoPergunta";
import { adicionarResposta } from "@/lib/voz/aprimorarRoteiro";
import type { AcaoCondicao } from "@/lib/voz/roteirosLigacao";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SimuladorLigacaoVoz, type AgenteSim } from "./SimuladorLigacaoVoz";
import {
  DEPARTAMENTOS, ROTEIROS, carregarRoteirosSalvos, compilarRoteiro, ehDeFabrica, roteiroDeFabrica,
  type CampoRoteiro, type RoteiroBaseId, type RoteiroSalvo,
} from "@/lib/voz/roteirosLigacao";

const db = supabase as any;
const CAMPOS: { id: CampoRoteiro; rotulo: string }[] = [
  { id: "produto", rotulo: "Produto" }, { id: "condicao", rotulo: "Condição" },
  { id: "desconto", rotulo: "Desconto máximo" }, { id: "aviso", rotulo: "Aviso (financeiro)" },
];

/** Lista e editor dos roteiros de ligação da empresa: fábrica editável + novos, com regras "Se X, faça Y". */
export function EditorRoteirosVoz({ estabelecimentoId, agentes }: { estabelecimentoId: string | null; agentes: AgenteSim[] }) {
  const [lista, setLista] = useState<RoteiroSalvo[]>([]);
  const [atual, setAtualRaw] = useState<RoteiroSalvo | null>(null);
  const [original, setOriginal] = useState("");
  const [salvando, setSalvando] = useState(false);
  /** Abrir outro roteiro guarda a versão de partida (para avisar alterações não salvas). */
  const abrir = (r: RoteiroSalvo | null) => { setAtualRaw(r); setOriginal(r ? JSON.stringify(r) : ""); };
  const setAtual = (r: RoteiroSalvo | null | ((a: RoteiroSalvo | null) => RoteiroSalvo | null)) => setAtualRaw(r as never);
  const [excluir, setExcluir] = useState(false);
  const [simulando, setSimulando] = useState<RoteiroSalvo | null>(null);
  const [criarIa, setCriarIa] = useState(false);
  const [modelos, setModelos] = useState(false);
  const simulador = (
    <Dialog open={!!simulando} onOpenChange={(aberto) => { if (!aberto) setSimulando(null); }}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Simular roteiro</DialogTitle>
          <DialogDescription>Ligação de teste · {simulando?.nome || "Novo roteiro"}</DialogDescription>
        </DialogHeader>
        {simulando && (
          <Tabs defaultValue="tela">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tela"><Monitor className="mr-1 h-4 w-4" /> Teste em tela</TabsTrigger>
              <TabsTrigger value="ligacao"><PhoneCall className="mr-1 h-4 w-4" /> Ligação real</TabsTrigger>
            </TabsList>
            <TabsContent value="tela"><SimuladorTelaVoz roteiro={simulando} agente={agentes.find((a) => a.ativo && a.modos?.includes("ligar"))} onAprimorar={(...a) => aprimorar(...a)} onCorrigir={(n, m) => corrigir(n, m)} /></TabsContent>
            <TabsContent value="ligacao"><SimuladorLigacaoVoz estabelecimentoId={estabelecimentoId} agentes={agentes} roteiroSelecionado={simulando} onAprimorar={(...a) => aprimorar(...a)} /></TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );


  /** Grava a resposta na regra da etapa e salva o roteiro na hora (vale para disparo e Simulador). */
  const gravar = async (r: RoteiroSalvo) => {
    if (!estabelecimentoId) return null;
    const corpo = { estabelecimento_id: estabelecimentoId, chave: r.chave, departamento: r.departamento, nome: r.nome.trim() || "Novo roteiro",
      descricao: r.descricao, campos: r.campos, etapas: r.etapas, ativo: r.ativo, updated_at: new Date().toISOString() };
    const x = await db.from("voz_roteiros").upsert(corpo, { onConflict: "estabelecimento_id,chave" }).select().single();
    if (x.error) { toast.error(x.error.message); return null; }
    return { ...r, id: x.data.id } as RoteiroSalvo;
  };
  const aprimorar = async (etapa: number, resposta: string, acao: AcaoCondicao, texto?: string) => {
    if (!simulando) return;
    const novo = adicionarResposta(simulando, etapa, resposta, acao, texto);
    if (novo === simulando) return void toast.info("Essa resposta já está no roteiro");
    const salvo = await gravar(novo);
    if (!salvo) return;
    setSimulando(salvo);
    setAtual((a) => (a && a.chave === salvo.chave ? { ...a, id: salvo.id, etapas: salvo.etapas } : a));
    toast.success(`"${resposta}" adicionado à etapa ${etapa + 1}`); void carregar();
  };
  const corrigir = async (novo: RoteiroSalvo, mensagem: string) => {
    const salvo = await gravar(novo);
    if (!salvo) return;
    setSimulando(salvo);
    setAtual((a) => (a && a.chave === salvo.chave ? { ...a, id: salvo.id, etapas: salvo.etapas } : a));
    toast.success(mensagem); void carregar();
  };
  const aprimorarAtual = async (etapa: number, resposta: string, acao: AcaoCondicao, texto?: string) => {
    if (!atual) return;
    const n = adicionarResposta(atual, etapa, resposta, acao, texto);
    if (n === atual) return void toast.info("Essa resposta já está no roteiro");
    setAtual(n); toast.success(`"${resposta}" adicionado à pergunta ${etapa + 1} — salve para gravar`);
  };


  const carregar = useCallback(async () => {
    const salvos = await carregarRoteirosSalvos(db, estabelecimentoId);
    // Roteiros antigos de fábrica só aparecem se a empresa já os editou; os modelos por departamento os substituem.
    const fab = ROTEIROS.map((r) => salvos.find((s) => s.chave === r.id)).filter((x): x is RoteiroSalvo => !!x);
    setLista([...fab, ...salvos.filter((s) => !ehDeFabrica(s.chave))]);
  }, [estabelecimentoId]);
  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = async () => {
    if (!atual || !estabelecimentoId) return;
    if (!atual.nome.trim()) return toast.error("Dê um nome ao roteiro");
    if (!atual.etapas.some((e) => e.fala.trim())) return toast.error("Inclua pelo menos uma etapa com fala");
    const corpo = { estabelecimento_id: estabelecimentoId, chave: atual.chave, departamento: atual.departamento, nome: atual.nome.trim(),
      descricao: atual.descricao, campos: atual.campos, etapas: atual.etapas, ativo: atual.ativo, updated_at: new Date().toISOString() };
    setSalvando(true);
    const r = await db.from("voz_roteiros").upsert(corpo, { onConflict: "estabelecimento_id,chave" }).select().single();
    setSalvando(false);
    if (r.error) return toast.error(r.error.message);
    const salvo = { ...atual, id: r.data.id };
    toast.success("Roteiro salvo"); abrir(salvo); void carregar();
  };
  const remover = async () => {
    if (!atual?.id) return;
    await removerRoteiro(atual);
    abrir(null);
  };
  const [excluindoCard, setExcluindoCard] = useState<RoteiroSalvo | null>(null);
  const removerRoteiro = async (r: RoteiroSalvo) => {
    if (!r.id) return;
    const res = await db.from("voz_roteiros").delete().eq("id", r.id);
    if (res.error) return toast.error(res.error.message);
    toast.success(ehDeFabrica(r.chave) ? "Roteiro original restaurado" : "Roteiro excluído");
    setExcluir(false); setExcluindoCard(null); void carregar();
  };
  const novo = () => abrir({ chave: `custom_${Date.now().toString(36)}`, departamento: "comercial", nome: "", descricao: "", campos: ["condicao", "desconto"], ativo: true,
    etapas: [{ titulo: "Abertura", fala: "Diga o motivo da ligação em uma frase.", condicoes: [] }, { titulo: "Pergunta", fala: "", condicoes: [{ gatilho: "demonstrou interesse", acao: "transferir" }] }] });
  const [instalando, setInstalando] = useState(false);
  const instalarModelos = async () => {
    if (!estabelecimentoId) return;
    setInstalando(true);
    const linhas = MODELOS_ROTEIRO.map((m) => { const r = roteiroDoModelo(m); return { estabelecimento_id: estabelecimentoId, chave: `custom_modelo_${m.id}`, departamento: r.departamento,
      nome: r.nome, descricao: r.descricao, campos: r.campos, etapas: r.etapas, ativo: true, updated_at: new Date().toISOString() }; })
      .filter((l) => !lista.some((x) => x.chave === l.chave));
    const r = linhas.length ? await db.from("voz_roteiros").upsert(linhas, { onConflict: "estabelecimento_id,chave" }) : { error: null };
    setInstalando(false);
    if (r.error) return void toast.error(r.error.message);
    toast.success(linhas.length ? `${linhas.length} modelos instalados` : "Todos os modelos já estão instalados"); void carregar();
  };
  const duplicar = (r: RoteiroSalvo) => abrir({ ...structuredClone(r), id: undefined, chave: `custom_${Date.now().toString(36)}`, nome: `${r.nome} (cópia)` });

  if (!atual) return (
    <div className="space-y-3">
      {simulador}
      <DeleteConfirmDialog open={!!excluindoCard} onOpenChange={(v) => { if (!v) setExcluindoCard(null); }} onConfirm={() => { if (excluindoCard) void removerRoteiro(excluindoCard); }}
        title={excluindoCard && ehDeFabrica(excluindoCard.chave) ? "Restaurar roteiro original?" : "Excluir roteiro?"}
        description={excluindoCard && ehDeFabrica(excluindoCard.chave) ? `Suas alterações em "${excluindoCard.nome}" serão descartadas.` : `O roteiro "${excluindoCard?.nome ?? ""}" deixará de aparecer no disparo.`} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Edite as falas e as regras "Se o cliente..., faça..." de cada roteiro, ou crie novos.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={instalando} onClick={() => void instalarModelos()}>{instalando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />} Instalar modelos por departamento</Button>
          <Button size="sm" variant="outline" onClick={() => setModelos(true)}><Copy className="mr-1 h-4 w-4" /> Modelos prontos</Button>
          <Button size="sm" variant="outline" onClick={() => setCriarIa(true)}><Sparkles className="mr-1 h-4 w-4" /> Criar com IA</Button>
          <Button size="sm" onClick={novo}><Plus className="mr-1 h-4 w-4" /> Novo roteiro</Button>
        </div>
      </div>
      <CriarComIaDialog aberto={criarIa} onFechar={() => setCriarIa(false)} onCriado={(r) => { setCriarIa(false); abrir(r); setOriginal(""); }} />
      <ModelosProntosDialog aberto={modelos} onFechar={() => setModelos(false)} onEscolher={(r) => { setModelos(false); abrir(r); setOriginal(""); }} />
      {DEPARTAMENTOS.map((dep) => (
        <div key={dep.id} className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">{dep.rotulo}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {!lista.some((r) => r.departamento === dep.id) && <p className="text-xs text-muted-foreground sm:col-span-2">Nenhum roteiro. Use "Instalar modelos por departamento" ou "Modelos prontos".</p>}
            {lista.filter((r) => r.departamento === dep.id).map((r) => (
              <Card key={r.chave} className="flex min-w-0 flex-col gap-2 p-3">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{r.nome}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{r.descricao}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[10px]">{ehDeFabrica(r.chave) ? (r.id ? "Fábrica editado" : "Fábrica") : "Criado"}</Badge>
                    {!r.ativo && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground"><GitBranch className="mr-1 inline h-3 w-3" />{r.etapas.length} etapas · {r.etapas.reduce((n, e) => n + e.condicoes.length, 0)} regras</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => abrir(structuredClone(r))}>Editar</Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setSimulando(structuredClone(r))}><PhoneCall className="mr-1 h-3.5 w-3.5" /> Simular</Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => duplicar(r)}><Copy className="mr-1 h-3.5 w-3.5" /> Duplicar</Button>
                  {r.id && (
                    <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={() => setExcluindoCard(r)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> {ehDeFabrica(r.chave) ? "Restaurar" : "Excluir"}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const set = (p: Partial<RoteiroSalvo>) => setAtual({ ...atual, ...p });
  const fabrica = ehDeFabrica(atual.chave);
  const avisosTotais = atual.etapas.reduce((n, e) => n + validarPergunta(e).length, 0);

  const propriedades = (
    <div className="space-y-3">
      <div className="space-y-1"><Label>Departamento</Label>
        <Select value={atual.departamento} onValueChange={(v) => set({ departamento: v as RoteiroSalvo["departamento"] })} disabled={fabrica}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="z-[60]">{DEPARTAMENTOS.map((d) => <SelectItem key={d.id} value={d.id}>{d.rotulo}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label>Descrição</Label><Textarea rows={2} value={atual.descricao} onChange={(e) => set({ descricao: e.target.value })} /></div>
      <div className="space-y-1">
        <Label>Dados que o usuário preenche ao disparar</Label>
        <p className="text-xs text-muted-foreground">Marque só o que muda a cada campanha (ex.: produto da oferta, desconto). Quem dispara a campanha será obrigado a preencher.</p>
        <div className="grid gap-2">
          {CAMPOS.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <Switch checked={atual.campos.includes(c.id)} onCheckedChange={(v) => set({ campos: v ? [...atual.campos, c.id] : atual.campos.filter((x) => x !== c.id) })} />
              {c.rotulo}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Use nas falas: {"{produto}"}, {"{condicao}"}, {"{desconto}"}, {"{aviso}"}.</p>
      </div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={atual.ativo} onCheckedChange={(v) => set({ ativo: v })} /> Roteiro ativo (aparece na escolha do disparo em massa)</label>
      <p className="-mt-2 text-xs text-muted-foreground">Desligado = rascunho, não aparece para quem dispara.</p>
      <Card className="space-y-2 p-3">
        <p className="text-xs font-semibold text-foreground">Validação das perguntas</p>
        <p className="text-xs text-muted-foreground">{avisosTotais ? `${avisosTotais} ajuste(s) para que cada pergunta leve o cliente a uma resposta prevista no fluxo. Clique numa pergunta para ver.` : "Todas as perguntas conduzem o cliente a respostas previstas."}</p>
        {avisosTotais > 0 && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { setAtual(corrigirTodas(atual)); toast.success("Perguntas ajustadas"); }}>Corrigir o que for automático</Button>}
      </Card>
      <DiagnosticoRoteiroCard roteiro={atual} onCorrigir={(r) => { setAtual(r); toast.success("Regras de escape adicionadas"); }} />
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-xs font-semibold text-foreground">Mapa da conversa</summary>
        <div className="mt-2"><MapaConversa roteiro={atual} /></div>
      </details>
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-xs font-semibold text-foreground">Como a IA vai receber</summary>
        <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">{compilarRoteiro(atual, { descontoMax: 5, condicao: "frete grátis" })}</p>
      </details>
    </div>
  );
  const painelTeste = (
    <Tabs defaultValue="tela">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="tela"><Monitor className="mr-1 h-4 w-4" /> Em tela</TabsTrigger>
        <TabsTrigger value="ligacao"><PhoneCall className="mr-1 h-4 w-4" /> Ligação real</TabsTrigger>
      </TabsList>
      <TabsContent value="tela"><SimuladorTelaVoz roteiro={atual} agente={agentes.find((a) => a.ativo && a.modos?.includes("ligar"))} onAprimorar={(...a) => aprimorarAtual(...a)} onCorrigir={async (n, m) => { setAtual(n); toast.success(`${m} — salve para gravar`); }} /></TabsContent>
      <TabsContent value="ligacao"><SimuladorLigacaoVoz estabelecimentoId={estabelecimentoId} agentes={agentes} roteiroSelecionado={atual} onAprimorar={(...a) => aprimorarAtual(...a)} /></TabsContent>
    </Tabs>
  );

  return (
    <>
      <FluxoRoteiroVoz roteiro={atual} onChange={setAtual} onSalvar={() => void salvar()} salvando={salvando} sujo={JSON.stringify(atual) !== original}
        onFechar={() => setAtual(null)} painelTeste={painelTeste} propriedadesRoteiro={propriedades}
        acoesTopo={atual.id ? (
          <Button size="sm" variant="outline" className="h-8 px-2 text-xs sm:px-3" onClick={() => setExcluir(true)}>
            {fabrica ? <><RotateCcw className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Restaurar original</span></> : <><Trash2 className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Excluir</span></>}
          </Button>) : null} />
      <DeleteConfirmDialog open={excluir} onOpenChange={setExcluir} onConfirm={() => void remover()}
        title={fabrica ? "Restaurar roteiro original?" : "Excluir roteiro?"}
        description={fabrica ? "Suas alterações neste roteiro serão descartadas." : "O roteiro deixará de aparecer no disparo."} />
    </>
  );
}
