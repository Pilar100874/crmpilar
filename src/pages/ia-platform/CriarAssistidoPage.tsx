import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, useEstabelecimento, useAipTable } from "@/lib/aip/db";
import { AipSkill, AipTool, AipMcp, MODELOS_IA } from "@/lib/aip/types";
import ReferenciasPicker, { ReferenciaSelecionada } from "@/components/ia-platform/wizard/ReferenciasPicker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  MessageSquare,
  Sparkle,
  Upload,
  Video,
  Wand2,
  Plus,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type PassoId =
  | "tipo"
  | "basico"
  | "referencias"
  | "conhecimento"
  | "ferramentas"
  | "execucao"
  | "agenda"
  | "revisao";

interface TipoCriacao {
  id: string;
  titulo: string;
  subtitulo: string;
  icone: typeof Wand2;
  passos: PassoId[];
  modelo: string;
  exemploObjetivo: string;
  dica: string;
  criaRotina: boolean;
}

const TIPOS: TipoCriacao[] = [
  {
    id: "rotina",
    titulo: "Rotina agendada",
    subtitulo: "Algo que roda sozinho todo dia, semana ou mês.",
    icone: CalendarClock,
    passos: ["tipo", "basico", "conhecimento", "ferramentas", "execucao", "agenda", "revisao"],
    modelo: "claude-sonnet-4-5",
    exemploObjetivo:
      "Todo dia às 8h, resumir as vendas do dia anterior e enviar o resumo no WhatsApp do time comercial.",
    dica: "Descreva como se estivesse pedindo para um assistente humano: o que fazer, com quais dados e para quem entregar.",
    criaRotina: true,
  },
  {
    id: "imagem",
    titulo: "Criação de imagens",
    subtitulo: "Posts, banners e fotos de produto.",
    icone: ImageIcon,
    passos: ["tipo", "basico", "referencias", "conhecimento", "execucao", "revisao"],
    modelo: "google/gemini-3.6-flash",
    exemploObjetivo:
      "Criar imagens quadradas de produto com fundo escuro, luz suave e espaço no topo para o título.",
    dica: "Envie fotos de referência: o resultado fica muito mais parecido com a sua marca.",
    criaRotina: false,
  },
  {
    id: "video",
    titulo: "Criação de vídeos",
    subtitulo: "Clipes curtos para redes sociais e campanhas.",
    icone: Video,
    passos: ["tipo", "basico", "referencias", "conhecimento", "ferramentas", "execucao", "revisao"],
    modelo: "claude-sonnet-4-5",
    exemploObjetivo:
      "Gerar vídeos de 10 segundos no formato 9:16 apresentando o produto, com movimento suave de câmera.",
    dica: "Vídeos demoram mais: acompanhe a execução pelo monitor do servidor.",
    criaRotina: false,
  },
  {
    id: "texto",
    titulo: "Textos e respostas",
    subtitulo: "Rascunhos de e-mail, respostas e resumos.",
    icone: MessageSquare,
    passos: ["tipo", "basico", "conhecimento", "ferramentas", "execucao", "revisao"],
    modelo: "claude-sonnet-4-5",
    exemploObjetivo:
      "Escrever respostas cordiais para clientes seguindo as políticas internas da empresa.",
    dica: "Anexe as instruções da empresa em .md para o agente seguir o mesmo tom sempre.",
    criaRotina: false,
  },
  {
    id: "pesquisa",
    titulo: "Pesquisa e coleta de dados",
    subtitulo: "Buscar informações em sites, portais e no sistema.",
    icone: Sparkle,
    passos: ["tipo", "basico", "conhecimento", "ferramentas", "execucao", "agenda", "revisao"],
    modelo: "claude-sonnet-4-5",
    exemploObjetivo:
      "Buscar novas oportunidades publicadas hoje e trazer órgão, objeto, valor e prazo de cada uma.",
    dica: "Escolha as ferramentas de busca/navegação no passo de ferramentas.",
    criaRotina: true,
  },
];

const FREQUENCIAS = [
  { id: "diaria", rotulo: "Todo dia", cron: (h: string, m: string) => `${m} ${h} * * *` },
  { id: "uteis", rotulo: "Dias úteis (seg a sex)", cron: (h: string, m: string) => `${m} ${h} * * 1-5` },
  { id: "semanal", rotulo: "Uma vez por semana (segunda)", cron: (h: string, m: string) => `${m} ${h} * * 1` },
  { id: "mensal", rotulo: "Uma vez por mês (dia 1º)", cron: (h: string, m: string) => `${m} ${h} 1 * *` },
  { id: "hora", rotulo: "A cada hora", cron: (_h: string, m: string) => `${m} * * * *` },
];

const TITULOS: Record<PassoId, { titulo: string; ajuda: string }> = {
  tipo: { titulo: "O que você quer criar?", ajuda: "Escolha uma opção. Depois é só ir preenchendo." },
  basico: { titulo: "Conte o que precisa", ajuda: "Explique com suas palavras, sem termos técnicos." },
  referencias: { titulo: "Imagens de referência", ajuda: "Envie do computador ou escolha da galeria. É opcional." },
  conhecimento: { titulo: "Conhecimento", ajuda: "Instruções e materiais que o agente deve seguir." },
  ferramentas: { titulo: "Ferramentas", ajuda: "O que o agente pode acessar para trabalhar." },
  agenda: { titulo: "Quando deve rodar?", ajuda: "Escolha a frequência e o horário." },
  execucao: {
    titulo: "Como deve executar?",
    ajuda: "De uma vez só ou passo a passo, como no Claude Code.",
  },
  revisao: { titulo: "Revisão", ajuda: "Confira e crie. Você pode editar depois." },
};

interface EtapaExecucao {
  id: string;
  titulo: string;
  instrucao: string;
}

interface AipReceita {
  id: string;
  nome: string;
  tipo: string;
  objetivo: string | null;
  detalhes: string | null;
  modelo: string | null;
  skill_ids: string[];
  tool_ids: string[];
  mcp_ids: string[];
  referencias: ReferenciaSelecionada[];
  md_nome: string | null;
  md_conteudo: string | null;
  modo_execucao: "unica" | "etapas";
  etapas: EtapaExecucao[];
  agenda: { frequencia?: string; hora?: string; minuto?: string };
  updated_at: string;
}

export default function CriarAssistidoPage() {
  const navigate = useNavigate();
  const estabelecimentoId = useEstabelecimento();
  const { items: skills } = useAipTable<AipSkill>("aip_skills");
  const { items: tools } = useAipTable<AipTool>("aip_tools");
  const { items: mcps } = useAipTable<AipMcp>("aip_mcps");

  const [tipoId, setTipoId] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const [salvando, setSalvando] = useState(false);

  // Campos do formulário
  const [nome, setNome] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [detalhes, setDetalhes] = useState("");
  const [modelo, setModelo] = useState<string>(MODELOS_IA[1]);
  const [referencias, setReferencias] = useState<ReferenciaSelecionada[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [toolIds, setToolIds] = useState<string[]>([]);
  const [mcpIds, setMcpIds] = useState<string[]>([]);
  const [mdNome, setMdNome] = useState("");
  const [mdConteudo, setMdConteudo] = useState("");
  const [frequencia, setFrequencia] = useState("diaria");
  const [hora, setHora] = useState("08");
  const [minuto, setMinuto] = useState("00");
  const [modoExecucao, setModoExecucao] = useState<"unica" | "etapas">("unica");
  const [etapas, setEtapas] = useState<EtapaExecucao[]>([]);
  const [receitaId, setReceitaId] = useState<string | null>(null);
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [receitaExcluir, setReceitaExcluir] = useState<AipReceita | null>(null);
  const { items: receitas, create: criarReceita, update: atualizarReceita, remove: removerReceita } =
    useAipTable<AipReceita>("aip_receitas", { orderBy: "updated_at" });

  const tipo = useMemo(() => TIPOS.find((t) => t.id === tipoId) ?? null, [tipoId]);
  const passos: PassoId[] = tipo?.passos ?? ["tipo"];
  const passoAtual = passos[Math.min(indice, passos.length - 1)];
  const progresso = Math.round(((indice + 1) / passos.length) * 100);

  const cron = useMemo(() => {
    const f = FREQUENCIAS.find((x) => x.id === frequencia) ?? FREQUENCIAS[0];
    return f.cron(hora, minuto);
  }, [frequencia, hora, minuto]);

  const alternar = (lista: string[], setter: (v: string[]) => void, id: string) =>
    setter(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  const escolherTipo = (t: TipoCriacao) => {
    setTipoId(t.id);
    setModelo(t.modelo);
    setIndice(1);
  };

  const lerArquivoMd = async (arquivo?: File | null) => {
    if (!arquivo) return;
    const texto = await arquivo.text();
    setMdConteudo(texto);
    setMdNome(arquivo.name.replace(/\.md$/i, ""));
    toast.success("Arquivo carregado");
  };

  const podeAvancar = () => {
    if (passoAtual === "tipo") return Boolean(tipo);
    if (passoAtual === "basico") return nome.trim().length > 1 && objetivo.trim().length > 5;
    return true;
  };

  const avancar = () => {
    if (!podeAvancar()) return toast.warning("Preencha os campos obrigatórios para continuar");
    setIndice((i) => Math.min(i + 1, passos.length - 1));
  };
  const voltar = () => setIndice((i) => Math.max(i - 1, 0));

  const montarPrompt = () => {
    const partes = [objetivo.trim()];
    if (detalhes.trim()) partes.push(`\nDetalhes e preferências:\n${detalhes.trim()}`);
    if (referencias.length)
      partes.push(
        `\nImagens de referência (use como base fiel, sem alterar o produto):\n${referencias
          .map((r) => `- ${r.nome}: ${r.url}`)
          .join("\n")}`,
      );
    if (modoExecucao === "etapas" && etapas.length) {
      partes.push(
        `\nExecute passo a passo, na ordem, confirmando a conclusão de cada etapa antes de seguir:\n${etapas
          .map((e, i) => `${i + 1}. ${e.titulo}${e.instrucao ? ` — ${e.instrucao}` : ""}`)
          .join("\n")}`,
      );
    } else {
      partes.push("\nExecute tudo em uma única passada e devolva o resultado final.");
    }
    partes.push(
      "\nResponda sempre em português do Brasil. Se faltar alguma informação, liste o que precisa antes de executar.",
    );
    return partes.join("\n");
  };

  /** Dados que representam o que foi montado no assistente. */
  const snapshot = () => ({
    nome: nome.trim() || "Rascunho sem nome",
    tipo: tipo?.id ?? "rotina",
    objetivo,
    detalhes,
    modelo,
    skill_ids: skillIds,
    tool_ids: toolIds,
    mcp_ids: mcpIds,
    referencias,
    md_nome: mdNome,
    md_conteudo: mdConteudo,
    modo_execucao: modoExecucao,
    etapas,
    agenda: { frequencia, hora, minuto },
  });

  const salvarModelo = async () => {
    if (!tipo) return toast.warning("Escolha primeiro o que você quer criar");
    setSalvandoModelo(true);
    try {
      if (receitaId) {
        await atualizarReceita(receitaId, snapshot() as any);
      } else {
        const criada = await criarReceita(snapshot() as any);
        if (criada) setReceitaId(criada.id);
      }
    } finally {
      setSalvandoModelo(false);
    }
  };

  const carregarModelo = (r: AipReceita) => {
    setReceitaId(r.id);
    setTipoId(r.tipo);
    setNome(r.nome ?? "");
    setObjetivo(r.objetivo ?? "");
    setDetalhes(r.detalhes ?? "");
    setModelo(r.modelo ?? MODELOS_IA[1]);
    setSkillIds(r.skill_ids ?? []);
    setToolIds(r.tool_ids ?? []);
    setMcpIds(r.mcp_ids ?? []);
    setReferencias(r.referencias ?? []);
    setMdNome(r.md_nome ?? "");
    setMdConteudo(r.md_conteudo ?? "");
    setModoExecucao(r.modo_execucao ?? "unica");
    setEtapas(r.etapas ?? []);
    setFrequencia(r.agenda?.frequencia ?? "diaria");
    setHora(r.agenda?.hora ?? "08");
    setMinuto(r.agenda?.minuto ?? "00");
    setIndice(1);
    toast.success(`Modelo "${r.nome}" carregado`);
  };

  const novaEtapa = () =>
    setEtapas((e) => [
      ...e,
      { id: crypto.randomUUID(), titulo: `Etapa ${e.length + 1}`, instrucao: "" },
    ]);
  const atualizarEtapa = (id: string, campo: "titulo" | "instrucao", valor: string) =>
    setEtapas((e) => e.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)));
  const removerEtapa = (id: string) => setEtapas((e) => e.filter((x) => x.id !== id));

  const criar = async () => {
    if (!estabelecimentoId || !tipo) return;
    setSalvando(true);
    try {
      const idsSkills = [...skillIds];

      // Cria a skill a partir do material .md, quando informado.
      if (mdConteudo.trim()) {
        const { data: skill, error } = await db
          .from("aip_skills")
          .insert({
            estabelecimento_id: estabelecimentoId,
            nome: mdNome.trim() || `Instruções de ${nome.trim()}`,
            descricao: "Criada pelo assistente de criação",
            conteudo_md: mdConteudo,
            categoria: tipo.id,
            status: "ativo",
            ativo: true,
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        idsSkills.push(skill.id);
      }

      const { data: agente, error: erroAgente } = await db
        .from("aip_agents")
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: nome.trim(),
          descricao: objetivo.trim().slice(0, 300),
          categoria: tipo.id,
          modelo_ia: modelo,
          prompt_principal: montarPrompt(),
          skill_ids: idsSkills,
          tool_ids: toolIds,
          mcp_ids: mcpIds,
          tags: ["assistente-criacao", tipo.id],
          ativo: true,
        })
        .select()
        .single();
      if (erroAgente) throw new Error(erroAgente.message);

      /** Guarda o modelo usado (o "como foi feito") junto do que foi criado. */
      const registrarReceita = async (rotinaId?: string | null) => {
        const payload = {
          ...snapshot(),
          skill_ids: idsSkills,
          agent_id: agente.id,
          rotina_id: rotinaId ?? null,
        } as any;
        if (receitaId) await atualizarReceita(receitaId, payload);
        else {
          const criada = await criarReceita(payload);
          if (criada) setReceitaId(criada.id);
        }
      };

      if (tipo.criaRotina) {
        const { data: auth } = await supabase.auth.getUser();
        const { data: rotina, error: erroRotina } = await db
          .from("aip_rotinas")
          .insert({
            estabelecimento_id: estabelecimentoId,
            nome: nome.trim(),
            descricao: objetivo.trim().slice(0, 300),
            tipo_alvo: "agente",
            agent_id: agente.id,
            prompt: montarPrompt(),
            modelo,
            cron_expressao: cron,
            ativo: false,
            criado_por: auth?.user?.id ?? null,
          })
          .select()
          .single();
        if (erroRotina) throw new Error(erroRotina.message);
        await registrarReceita(rotina?.id ?? null);
        toast.success("Criado! A rotina foi salva desativada — faça um teste antes de ativar.");
        navigate("/ia-platform/rotinas");
        return;
      }

      await registrarReceita();
      toast.success("Agente criado com sucesso!");
      navigate("/ia-platform/agentes");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const Icone = tipo?.icone ?? Wand2;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Icone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">Criar com assistente</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Responda as perguntas em ordem e o sistema monta tudo para você. Não precisa saber
                nada de técnico.
              </p>
            </div>
          </div>
          {tipo && (
            <div className="mt-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  Passo {indice + 1} de {passos.length} · {TITULOS[passoAtual].titulo}
                </span>
                <Badge variant="secondary">{tipo.titulo}</Badge>
              </div>
              <Progress value={progresso} />
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{TITULOS[passoAtual].titulo}</CardTitle>
          <CardDescription>{TITULOS[passoAtual].ajuda}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 1. Tipo */}
          {passoAtual === "tipo" && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {TIPOS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => escolherTipo(t)}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                      tipoId === t.id ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <t.icone className="mb-2 h-6 w-6 text-primary" />
                    <p className="font-medium">{t.titulo}</p>
                    <p className="text-sm text-muted-foreground">{t.subtitulo}</p>
                  </button>
                ))}
              </div>

              {receitas.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <Save className="h-4 w-4" /> Modelos salvos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Continue de onde parou ou reaproveite uma montagem anterior.
                  </p>
                  <div className="space-y-1">
                    {receitas.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{r.nome}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {r.modelo ?? "—"} ·{" "}
                            {r.modo_execucao === "etapas"
                              ? `${(r.etapas ?? []).length} etapas`
                              : "execução única"}{" "}
                            · {(r.skill_ids ?? []).length} skills ·{" "}
                            {(r.tool_ids ?? []).length} tools · {(r.mcp_ids ?? []).length} MCPs
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => carregarModelo(r)}>
                          Abrir
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Excluir modelo"
                          onClick={() => setReceitaExcluir(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Básico */}
          {passoAtual === "basico" && tipo && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>{tipo.dica}</AlertDescription>
              </Alert>
              <div className="space-y-1.5">
                <Label htmlFor="nome">Dê um nome *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Resumo diário de vendas"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="objetivo">O que você quer que ele faça? *</Label>
                <Textarea
                  id="objetivo"
                  rows={4}
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder={tipo.exemploObjetivo}
                />
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  onClick={() => setObjetivo(tipo.exemploObjetivo)}
                >
                  Usar o exemplo acima
                </button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="detalhes">Alguma preferência ou regra? (opcional)</Label>
                <Textarea
                  id="detalhes"
                  rows={3}
                  value={detalhes}
                  onChange={(e) => setDetalhes(e.target.value)}
                  placeholder="Ex.: tom formal, sempre citar o prazo, não usar emojis."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo de IA</Label>
                <Select value={modelo} onValueChange={setModelo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELOS_IA.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Já vem preenchido com a melhor opção para este tipo. Só mude se souber o que quer.
                </p>
              </div>
            </div>
          )}

          {/* 3. Referências */}
          {passoAtual === "referencias" && (
            <ReferenciasPicker selecionadas={referencias} onChange={setReferencias} />
          )}

          {/* 4. Conhecimento */}
          {passoAtual === "conhecimento" && (
            <div className="space-y-5">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <BookOpen className="h-4 w-4" /> Skills já cadastradas (opcional)
                </p>
                {skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma skill cadastrada ainda.</p>
                ) : (
                  <ScrollArea className="max-h-48 rounded-lg border border-border p-2">
                    <div className="space-y-1">
                      {skills.map((s) => (
                        <label
                          key={s.id}
                          className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted"
                        >
                          <Checkbox
                            checked={skillIds.includes(s.id)}
                            onCheckedChange={() => alternar(skillIds, setSkillIds, s.id)}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{s.nome}</span>
                            <span className="block text-xs text-muted-foreground">
                              {s.descricao ?? "Sem descrição"}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <FileText className="h-4 w-4" /> Enviar um material em .md ou texto (opcional)
                </p>
                <p className="text-xs text-muted-foreground">
                  Use para manuais, políticas ou instruções da empresa. Vira uma skill nova
                  automaticamente.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" asChild>
                    <label className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" /> Escolher arquivo .md
                      <input
                        type="file"
                        accept=".md,.markdown,.txt"
                        className="hidden"
                        onChange={(e) => lerArquivoMd(e.target.files?.[0])}
                      />
                    </label>
                  </Button>
                  {mdConteudo && <Badge variant="secondary">{mdConteudo.length} caracteres</Badge>}
                </div>
                <Input
                  placeholder="Nome desse material (ex.: Política de atendimento)"
                  value={mdNome}
                  onChange={(e) => setMdNome(e.target.value)}
                />
                <Textarea
                  rows={6}
                  placeholder="Ou cole aqui o conteúdo…"
                  value={mdConteudo}
                  onChange={(e) => setMdConteudo(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* 5. Ferramentas */}
          {passoAtual === "ferramentas" && (
            <div className="space-y-5">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <Wrench className="h-4 w-4" /> Ferramentas (opcional)
                </p>
                {tools.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma ferramenta cadastrada ainda.</p>
                ) : (
                  <ScrollArea className="max-h-48 rounded-lg border border-border p-2">
                    <div className="space-y-1">
                      {tools.map((t) => (
                        <label
                          key={t.id}
                          className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted"
                        >
                          <Checkbox
                            checked={toolIds.includes(t.id)}
                            onCheckedChange={() => alternar(toolIds, setToolIds, t.id)}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{t.nome}</span>
                            <span className="block text-xs text-muted-foreground">
                              {t.descricao ?? t.categoria}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <Separator />

              <div>
                <p className="mb-2 text-sm font-medium">Servidores MCP (opcional)</p>
                {mcps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum MCP cadastrado ainda.</p>
                ) : (
                  <div className="space-y-1">
                    {mcps.map((m) => (
                      <label
                        key={m.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-muted"
                      >
                        <Checkbox
                          checked={mcpIds.includes(m.id)}
                          onCheckedChange={() => alternar(mcpIds, setMcpIds, m.id)}
                        />
                        <span className="text-sm">{m.nome}</span>
                        <Badge variant="outline" className="text-[11px]">
                          {m.status}
                        </Badge>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5.5 Execução */}
          {passoAtual === "execucao" && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    id: "unica" as const,
                    titulo: "De uma vez só",
                    texto: "O agente recebe o pedido e devolve o resultado final.",
                  },
                  {
                    id: "etapas" as const,
                    titulo: "Passo a passo (como no Claude Code)",
                    texto: "Você define as etapas e o agente cumpre uma de cada vez, em ordem.",
                  },
                ].map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      setModoExecucao(op.id);
                      if (op.id === "etapas" && etapas.length === 0) novaEtapa();
                    }}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-colors",
                      modoExecucao === op.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                    )}
                  >
                    <p className="font-medium">{op.titulo}</p>
                    <p className="text-sm text-muted-foreground">{op.texto}</p>
                  </button>
                ))}
              </div>

              {modoExecucao === "etapas" && (
                <div className="space-y-3">
                  {etapas.map((e, i) => (
                    <div key={e.id} className="space-y-2 rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{i + 1}</Badge>
                        <Input
                          value={e.titulo}
                          onChange={(ev) => atualizarEtapa(e.id, "titulo", ev.target.value)}
                          placeholder="Nome da etapa (ex.: Coletar dados)"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removerEtapa(e.id)}
                          aria-label="Remover etapa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        rows={2}
                        value={e.instrucao}
                        onChange={(ev) => atualizarEtapa(e.id, "instrucao", ev.target.value)}
                        placeholder="O que fazer nesta etapa"
                      />
                    </div>
                  ))}
                  <Button variant="outline" onClick={novaEtapa}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar etapa
                  </Button>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  O modelo de IA escolhido ({modelo}) e as skills, tools e MCPs selecionados ficam
                  gravados junto quando você salvar o modelo.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* 6. Agenda */}
          {passoAtual === "agenda" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Com que frequência?</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FREQUENCIAS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFrequencia(f.id)}
                      className={cn(
                        "rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors",
                        frequencia === f.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                      )}
                    >
                      {f.rotulo}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="hora">Hora</Label>
                  <Input
                    id="hora"
                    className="w-20"
                    value={hora}
                    onChange={(e) => setHora(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="08"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minuto">Minuto</Label>
                  <Input
                    id="minuto"
                    className="w-20"
                    value={minuto}
                    onChange={(e) => setMinuto(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="00"
                  />
                </div>
                <Badge variant="outline" className="font-mono">
                  {cron}
                </Badge>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  A rotina é criada <strong>desativada</strong>. Rode o teste (dry-run) na tela de
                  Rotinas e ative quando estiver satisfeito.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* 7. Revisão */}
          {passoAtual === "revisao" && tipo && (
            <div className="space-y-3 text-sm">
              {[
                ["Tipo", tipo.titulo],
                ["Nome", nome || "—"],
                ["Objetivo", objetivo || "—"],
                ["Preferências", detalhes || "—"],
                ["Modelo", modelo],
                ["Imagens de referência", `${referencias.length}`],
                ["Skills", `${skillIds.length}${mdConteudo ? " + 1 novo material" : ""}`],
                ["Ferramentas", `${toolIds.length} tools · ${mcpIds.length} MCPs`],
                [
                  "Execução",
                  modoExecucao === "etapas"
                    ? `Passo a passo (${etapas.length} etapas)`
                    : "De uma vez só",
                ],
                ...(tipo.criaRotina ? [["Agendamento", `${cron} (criada desativada)`]] : []),
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="flex flex-col gap-0.5 rounded-lg border border-border p-3">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</span>
                  <span className="whitespace-pre-wrap">{valor}</span>
                </div>
              ))}
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Tudo pode ser editado depois nas telas de Agentes e Rotinas.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={voltar} disabled={indice === 0 || salvando}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              {tipo && (
                <Button
                  variant="outline"
                  onClick={salvarModelo}
                  disabled={salvandoModelo || salvando}
                >
                  {salvandoModelo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {receitaId ? "Salvar alterações" : "Salvar modelo"}
                </Button>
              )}
              {passoAtual === "revisao" ? (
                <Button onClick={criar} disabled={salvando}>
                  {salvando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Criar agora
                </Button>
              ) : (
                <Button onClick={avancar} disabled={!tipo || salvando}>
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
