import { useMemo, useState } from "react";
import { ArrowDown, CalendarDays, GitBranch, Hand, Play, Zap, Monitor, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { explicarRegra, fluxoMovimentacao, origemFluxo, ORIGEM_DATA, type EtapaFluxo, type RegraCatalogo } from "@/lib/calendario/regrasAgenda";
import { rotuloGatilho } from "@/lib/calendario/regrasAutomacao";
import { cn } from "@/lib/utils";

function Etapa({ etapa, raiz = false }: { etapa: EtapaFluxo; raiz?: boolean }) {
  const Icone = etapa.tipo === "condicao" ? GitBranch : etapa.tipo === "resultado" ? CalendarDays : etapa.modo === "usuario" ? Hand : Zap;
  return (
    <li className="min-w-0 space-y-3">
      {!raiz && <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ArrowDown className="h-4 w-4 shrink-0" />{etapa.rotulo || "Em seguida"}</div>}
      <article className={cn("min-w-0 rounded-md border bg-card p-3 sm:p-4", etapa.tipo === "condicao" ? "border-warning/50 bg-warning/5" : etapa.tipo === "resultado" ? "border-success/40 bg-success/5" : etapa.modo === "usuario" ? "border-primary/40" : "border-border")}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant={etapa.modo === "usuario" ? "default" : "secondary"} className="gap-1 text-[10px]">
            {etapa.modo === "usuario" ? <Hand className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
            {etapa.modo === "usuario" ? "Interação do usuário" : "Automático"}
          </Badge>
          {etapa.tipo === "condicao" && <span className="text-[10px] font-semibold uppercase text-warning">Condição</span>}
          {etapa.tipo === "resultado" && <span className="text-[10px] font-semibold uppercase text-success">Resultado</span>}
        </div>
        <h3 className="flex items-start gap-2 text-sm font-semibold leading-snug"><Icone className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 break-words">{etapa.titulo}</span></h3>
        <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">{etapa.detalhe}</p>
      </article>
      {etapa.filhos?.length ? <ol className={cn("grid min-w-0 gap-4 border-l-2 border-border pl-3 sm:pl-5", etapa.id === "decidir" && "lg:grid-cols-2")}>
        {etapa.filhos.map(filho => <Etapa key={filho.id} etapa={filho} />)}
      </ol> : null}
    </li>
  );
}

export function FluxoVisualRegrasAgenda({ regras }: { regras: RegraCatalogo[] }) {
  const [gatilho, setGatilho] = useState("tarefa_arrastada");
  const [origem, setOrigem] = useState("Calendário");
  const origens = useMemo(() => Array.from(new Set(regras.map(origemFluxo))).sort((a, b) => a === ORIGEM_DATA ? 1 : b === ORIGEM_DATA ? -1 : a.localeCompare(b)), [regras]);
  const origemAtual = origens.includes(origem) ? origem : origens[0];
  const daOrigem = regras.filter(r => origemFluxo(r) === origemAtual);
  const opcoes = Array.from(new Set(daOrigem.map(r => r.gatilho)));
  const atual = opcoes.includes(gatilho) ? gatilho : opcoes[0];
  const diretas = daOrigem.filter(r => r.gatilho === atual);
  const fluxo = useMemo(() => fluxoMovimentacao(regras), [regras]);
  return (
    <div className="min-w-0 space-y-5 pt-3">
      <h2 className="flex items-center gap-2 text-base font-semibold"><GitBranch className="h-5 w-5 text-primary" />Fluxo visual</h2>
      <nav aria-label="Telas que disparam os fluxos" className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {origens.map(item => <Button key={item} variant={item === origemAtual ? "default" : "outline"} className="h-auto min-h-12 min-w-0 justify-start gap-2 whitespace-normal px-3 py-2 text-left" aria-pressed={item === origemAtual} onClick={() => { setOrigem(item); setGatilho(item === "Calendário" ? "tarefa_arrastada" : ""); }}>
          {item === ORIGEM_DATA ? <Clock className="h-4 w-4 shrink-0" /> : <Monitor className="h-4 w-4 shrink-0" />}
          <span className="min-w-0 flex-1 break-words text-xs">{item}</span><span className="shrink-0 text-xs">{regras.filter(r => origemFluxo(r) === item).length}</span>
        </Button>)}
      </nav>
      <div className="space-y-1 border-b pb-3"><h3 className="font-semibold">{origemAtual}</h3>{origemAtual === ORIGEM_DATA && <p className="text-xs leading-relaxed text-muted-foreground">Data atual, mudança de dia e horário vencido. A realocação de pendências é verificada ao abrir ou atualizar a agenda; este fluxo não indica execução com a agenda fechada.</p>}</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={atual} onValueChange={setGatilho}><SelectTrigger className="w-full sm:max-w-sm" aria-label="Escolher acontecimento do organograma"><Play className="mr-2 h-4 w-4 shrink-0 text-primary" /><SelectValue placeholder="Escolha um acontecimento" /></SelectTrigger><SelectContent>{opcoes.map(v => <SelectItem key={v} value={v}>{rotuloGatilho(v)}</SelectItem>)}</SelectContent></Select>
        <div className="flex flex-wrap gap-2"><Badge variant="secondary" className="gap-1"><Zap className="h-3 w-3" />Automático</Badge><Badge className="gap-1"><Hand className="h-3 w-3" />Interação do usuário</Badge></div>
      </div>
      {atual === "tarefa_arrastada" ? <ol aria-label="Organograma da movimentação de tarefas" className="min-w-0"><Etapa etapa={fluxo} raiz /></ol> : <ol className="min-w-0 space-y-6" aria-label="Organograma das regras configuradas">
        {diretas.map(r => {
          const explicacao = explicarRegra(r);
          const temCondicao = Object.keys(r.condicoes || {}).length > 0;
          const automatico = ["agenda_aberta", "horario_vencido", "sem_contato_dias", "email_aberto", "email_recebido", "whatsapp_recebido", "ligacao_recebida"].includes(r.gatilho);
          return <Etapa key={r.id} raiz etapa={{ id: r.id, titulo: r.nome, detalhe: explicacao.disparador, modo: automatico ? "automatico" : "usuario", filhos: [
            { id: `${r.id}-condicao`, titulo: "Quando a regra se aplica?", detalhe: r.ativa ? explicacao.condicao : "Esta regra não está em execução na configuração salva. O caminho abaixo descreve seu comportamento configurado, sem ativá-la.", modo: "automatico", tipo: "condicao", filhos: [
              { id: `${r.id}-resultado`, rotulo: "Condições atendidas", titulo: "O que acontece", detalhe: explicacao.resultado, modo: explicacao.modo, tipo: "resultado" },
              ...(temCondicao || !r.ativa ? [{ id: `${r.id}-nao`, rotulo: "Condições não atendidas", titulo: "Esta regra não é aplicada", detalhe: "Não realiza a ação deste caminho. As demais regras continuam seguindo suas próprias condições.", modo: "automatico" as const, tipo: "resultado" as const }] : []),
            ] },
          ] }} />;
        })}
      </ol>}
      <div className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">Mapa explicativo das regras da agenda e automações cadastradas. Não executa ações nem ativa regras; relações salvas não significam execução em cadeia.</div>
    </div>
  );
}