import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Copy, MoreVertical, Receipt, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AtendimentoClientCard } from "@/components/atendimento/AtendimentoClientCard";

interface OrcamentosEmpresaListProps {
  orcamentos: any[];
  selectedOrcamentoId: string | null;
  onSelectOrcamento: (orcamento: any) => void;
  onDuplicate?: (orcamentoId: string) => void;
  onDelete?: (orcamentoId: string) => void;
}

interface GrupoEmpresa {
  id: string;
  nome: string;
  contato: string;
  orcamentos: any[];
}

export function OrcamentosEmpresaList({
  orcamentos,
  selectedOrcamentoId,
  onSelectOrcamento,
  onDuplicate,
  onDelete,
}: OrcamentosEmpresaListProps) {
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

  return (
    <div className="space-y-2">
      {grupos.map((grupo) => {
        const aberto = gruposAbertos.has(grupo.id);
        const total = grupo.orcamentos.reduce((soma, orcamento) => soma + Number(orcamento.valor_total || 0), 0);

        return (
          <div key={grupo.id} className="space-y-1.5">
            <AtendimentoClientCard
              title={`Orçamento - ${grupo.contato}`}
              customerName={grupo.contato}
              sideLabel="Meu Cliente"
              onClick={() => alternarGrupo(grupo.id)}
              indicators={<><Badge className="min-w-7 justify-center px-1.5">{grupo.orcamentos.length}</Badge>{aberto ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}</>}
            >
              {grupo.orcamentos[0]?.created_at && (
                <Badge variant="outline" className="gap-1 bg-background/70">
                  {format(new Date(grupo.orcamentos[0].created_at), "dd/MM/yyyy", { locale: ptBR })}
                </Badge>
              )}
              <Badge variant="outline">Orçamento</Badge>
              <Badge variant="outline" className="gap-1 bg-background/70">
                <Receipt className="h-3.5 w-3.5" />
                {grupo.orcamentos.length > 1 ? `${grupo.orcamentos.length} orçamentos` : "Orçamento"}
              </Badge>
            </AtendimentoClientCard>

            {aberto && (
              <div className="ml-8 space-y-1.5 border-l-2 border-primary/20 py-1 pl-3">
                {grupo.orcamentos.map((orcamento) => {
                  const selecionado = selectedOrcamentoId === orcamento.id;
                  return (
                    <div
                      key={orcamento.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectOrcamento(orcamento)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectOrcamento(orcamento);
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
                          <span className="text-xs font-semibold text-primary">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(orcamento.valor_total || 0)}
                          </span>
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
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}