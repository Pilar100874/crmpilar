import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Filter, MoreVertical, Receipt, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePendenciasAtendimento, ordenarPendentesPrimeiro } from "@/hooks/usePendenciasAtendimento";
import { AtendimentoClientCard } from "@/components/atendimento/AtendimentoClientCard";
import { AtendimentoCardIndicators, type AtendimentoIndicatorData } from "@/components/atendimento/AtendimentoCardIndicators";
import { AtendimentoHoraBadge, AtendimentoInfoBadge } from "@/components/atendimento/AtendimentoCardBadges";

interface OrcamentosEmpresaListProps {
  orcamentos: any[];
  tarefasAgenda?: any[];
  selectedOrcamentoId: string | null;
  onSelectOrcamento: (orcamento: any) => void;
  onSelectEmpresa?: (orcamentoReferencia: any) => void;
  onDuplicate?: (orcamentoId: string) => void;
  onDelete?: (orcamentoId: string) => void;
  emailsNaoLidosPerEmail?: Record<string, number>;
  chatsNaoLidosPerPhone?: Record<string, number>;
  indicadoresPorContato?: Map<string, AtendimentoIndicatorData>;
  /**
   * "grupos": cartão da empresa que expande para a lista de orçamentos.
   * "direto": lista somente os orçamentos, com filtro por etapa, sem cartão de contato.
   */
  modo?: "grupos" | "direto";
}

interface GrupoEmpresa {
  id: string;
  nome: string;
  contato: string;
  orcamentos: any[];
}

const ETAPA_LABELS: Record<string, string> = {
  orcamento: "Orçamento",
  negociacao: "Negociação",
  aprovacao_gerencia: "Aprovação Gerência",
  perdido: "Perdido",
  finalizado: "Finalizado",
  ganho: "Ganho",
};

const rotuloEtapa = (etapa?: string) => (etapa ? ETAPA_LABELS[etapa] || etapa : "Sem etapa");

const formatarValor = (valor: any) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor || 0));

function OrcamentoRow({
  orcamento,
  selecionado,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  orcamento: any;
  selecionado: boolean;
  onSelect: (orcamento: any) => void;
  onDuplicate?: (orcamentoId: string) => void;
  onDelete?: (orcamentoId: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(orcamento)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(orcamento);
        }
      }}
      className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selecionado ? "border-primary/30 bg-primary/10" : "border-transparent bg-card hover:bg-muted/60"
      }`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${selecionado ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
        <Receipt className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">Orçamento {String(orcamento.id).slice(0, 8).toUpperCase()}</p>
          <Badge variant="outline" className="shrink-0 text-[10px]">{orcamento.etapa || orcamento.status}</Badge>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-primary">{formatarValor(orcamento.valor_total)}</span>
          <span className="text-[10px] text-muted-foreground">{format(new Date(orcamento.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
        </div>
      </div>
      {(onDuplicate || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Ações do orçamento">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            {onDuplicate && (
              <DropdownMenuItem onClick={() => onDuplicate(orcamento.id)}>
                <Copy className="mr-2 h-4 w-4" /> Duplicar
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(orcamento.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function OrcamentosEmpresaList({
  orcamentos,
  tarefasAgenda = [],
  selectedOrcamentoId,
  onSelectOrcamento,
  onSelectEmpresa,
  onDuplicate,
  onDelete,
  emailsNaoLidosPerEmail = {},
  chatsNaoLidosPerPhone = {},
  indicadoresPorContato,
  modo = "grupos",
}: OrcamentosEmpresaListProps) {
  const pendencias = usePendenciasAtendimento();
  const grupos = useMemo<GrupoEmpresa[]>(() => {
    const mapa = new Map<string, GrupoEmpresa>();

    orcamentos.forEach((orcamento) => {
      const empresaId = orcamento.empresa_id || `sem-empresa-${orcamento.cliente_id || "geral"}`;
      const nome = orcamento.empresas?.nome_fantasia
        || orcamento.empresas?.nome
        || orcamento.customers?.nome
        || "Sem empresa";
      const contato = orcamento.customers?.nome || nome;
      const grupo = mapa.get(empresaId) || { id: empresaId, nome, contato, orcamentos: [] };
      grupo.orcamentos.push(orcamento);
      mapa.set(empresaId, grupo);
    });

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [orcamentos]);

  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());
  const [etapaFiltro, setEtapaFiltro] = useState<string>("");

  useEffect(() => {
    if (!selectedOrcamentoId) return;
    const grupoSelecionado = grupos.find((grupo) =>
      grupo.orcamentos.some((orcamento) => orcamento.id === selectedOrcamentoId),
    );
    if (!grupoSelecionado) return;
    setGruposAbertos((atuais) => {
      if (atuais.has(grupoSelecionado.id)) return atuais;
      const proximos = new Set(atuais);
      proximos.add(grupoSelecionado.id);
      return proximos;
    });
  }, [grupos, selectedOrcamentoId]);

  const alternarGrupo = (grupoId: string) => {
    setGruposAbertos((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(grupoId)) proximos.delete(grupoId);
      else proximos.add(grupoId);
      return proximos;
    });
  };

  const etapasDisponiveis = useMemo(() => {
    const vistas = new Set<string>();
    orcamentos.forEach((orcamento) => vistas.add(String(orcamento.etapa || orcamento.status || "")));
    return Array.from(vistas)
      .filter(Boolean)
      .sort((a, b) => rotuloEtapa(a).localeCompare(rotuloEtapa(b), "pt-BR"));
  }, [orcamentos]);

  const listaDireta = useMemo(() => {
    const filtrados = orcamentos.filter((orcamento) => !etapaFiltro || String(orcamento.etapa || orcamento.status || "") === etapaFiltro);
    return filtrados.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orcamentos, etapaFiltro]);

  if (modo === "direto") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Select
            value={etapaFiltro || "all"}
            onValueChange={(value) => setEtapaFiltro(value === "all" ? "" : value)}
          >
            <SelectTrigger
              className="h-9 flex-1 rounded-xl bg-background/70 text-xs dark:bg-card/70"
              aria-label="Filtrar orçamentos por etapa"
            >
              <Filter className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {etapasDisponiveis.map((etapa) => (
                <SelectItem key={etapa} value={etapa}>
                  {rotuloEtapa(etapa)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {listaDireta.length} {listaDireta.length === 1 ? "orçamento" : "orçamentos"}
          </span>
        </div>

        {listaDireta.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {orcamentos.length === 0 ? "Nenhum orçamento para este cliente" : "Nenhum orçamento com este filtro"}
          </p>
        ) : (
          <div className="space-y-1.5">
            {listaDireta.map((orcamento) => (
              <OrcamentoRow
                key={orcamento.id}
                orcamento={orcamento}
                selecionado={selectedOrcamentoId === orcamento.id}
                onSelect={onSelectOrcamento}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {ordenarPendentesPrimeiro(grupos, (g) => g.orcamentos[0]?.cliente_id, pendencias).map((grupo) => {
        const aberto = gruposAbertos.has(grupo.id);
        const total = grupo.orcamentos.reduce((soma, orcamento) => soma + Number(orcamento.valor_total || 0), 0);
        const clienteId = grupo.orcamentos[0]?.cliente_id;
        const tarefaAgenda = tarefasAgenda.find((tarefa) => tarefa.contact_id === clienteId);
        const email = String(grupo.orcamentos[0]?.customers?.email || "").toLowerCase();
        const telefone = String(grupo.orcamentos[0]?.customers?.telefone || "").replace(/\D/g, "");
        const diasAtraso = Number(tarefaAgenda?.diasAtraso || 0);
        const indicadores = clienteId ? indicadoresPorContato?.get(clienteId) : undefined;

        return (
          <div key={grupo.id} className="space-y-1.5">
            <AtendimentoClientCard
              title={tarefaAgenda?.title || `Orçamento - ${grupo.contato}`}
              companyName={grupo.nome !== grupo.contato ? grupo.nome : undefined}
              customerName={grupo.contato}
              sideLabel={tarefaAgenda?.linkedUsers?.[0]?.usuarios?.nome?.split(" ")[0] || "Meu Cliente"}
              onClick={() => {
                alternarGrupo(grupo.id);
                onSelectEmpresa?.(grupo.orcamentos[0]);
              }}
              indicators={<><AtendimentoCardIndicators {...(indicadores || { diasAtraso, emailsNaoLidos: emailsNaoLidosPerEmail[email] || 0, chatsPendentes: chatsNaoLidosPerPhone[telefone] || 0, orcamentosAbertos: grupo.orcamentos.length })} />{aberto ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}</>}
              historicoClienteId={clienteId}
              historicoClienteNome={grupo.contato}
            >
              <AtendimentoHoraBadge hora={tarefaAgenda?.time || ""} />
              {tarefaAgenda?.origem && <AtendimentoInfoBadge>{tarefaAgenda.origem}</AtendimentoInfoBadge>}
              <AtendimentoInfoBadge>{formatarValor(total)}</AtendimentoInfoBadge>
            </AtendimentoClientCard>

            {aberto && (
              <div className="ml-8 space-y-1.5 border-l-2 border-primary/20 py-1 pl-3">
                {grupo.orcamentos.map((orcamento) => (
                  <OrcamentoRow
                    key={orcamento.id}
                    orcamento={orcamento}
                    selecionado={selectedOrcamentoId === orcamento.id}
                    onSelect={onSelectOrcamento}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
