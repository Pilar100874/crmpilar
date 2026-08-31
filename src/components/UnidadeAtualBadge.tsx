import { useEffect, useState } from "react";
import { Building2, AlertTriangle, Check, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UnidadeOpcao {
  id: string;
  nome: string;
}

/**
 * Mostra a unidade/filial na qual o usuário está operando.
 * Os módulos de portaria só permitem movimentações dessa unidade.
 * Administradores podem trocar de unidade pelo próprio badge.
 */
export default function UnidadeAtualBadge({ className = "" }: { className?: string }) {
  const { unidadeId, unidadeNome, isAdmin, carregando } = useUnidadeAtual();
  const [unidades, setUnidades] = useState<UnidadeOpcao[]>([]);
  const [selecionada, setSelecionada] = useState<{ id: string | null; nome: string | null }>({
    id: null,
    nome: null,
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setSelecionada({ id: unidadeId, nome: unidadeNome });
  }, [unidadeId, unidadeNome]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("unidades")
        .select("id, nome")
        .order("nome", { ascending: true });
      setUnidades((data ?? []) as UnidadeOpcao[]);
    })();
  }, [isAdmin]);

  const trocarUnidade = async (u: UnidadeOpcao) => {
    if (u.id === selecionada.id) return;
    setSalvando(true);
    const { data: auth } = await supabase.auth.getUser();
    const authId = auth?.user?.id;
    if (!authId) {
      setSalvando(false);
      return;
    }
    const { error } = await supabase
      .from("usuarios")
      .update({ unidade_id: u.id })
      .eq("auth_user_id", authId);
    setSalvando(false);
    if (error) {
      toast({ title: "Não foi possível trocar de unidade", description: error.message, variant: "destructive" });
      return;
    }
    setSelecionada({ id: u.id, nome: u.nome });
    toast({ title: "Unidade alterada", description: `Você está operando em ${u.nome}.` });
    // Recarrega para que todas as telas do módulo usem a nova unidade
    setTimeout(() => window.location.reload(), 400);
  };

  if (carregando) return null;

  if (isAdmin) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors ${className}`}
            title="Trocar unidade de operação (administradores acessam todas)"
          >
            {salvando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-primary" />
            )}
            <span className="truncate max-w-[180px]">
              {selecionada.nome ? selecionada.nome : "Selecionar unidade"}
            </span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover z-50 max-h-72 overflow-y-auto">
          <DropdownMenuLabel className="text-xs">Unidade de operação</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {unidades.length === 0 ? (
            <DropdownMenuItem disabled className="text-xs">Nenhuma unidade cadastrada</DropdownMenuItem>
          ) : (
            unidades.map((u) => (
              <DropdownMenuItem key={u.id} onSelect={() => trocarUnidade(u)} className="text-sm">
                <Check className={`mr-2 h-3.5 w-3.5 ${u.id === selecionada.id ? "opacity-100 text-primary" : "opacity-0"}`} />
                {u.nome}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
            Como administrador você visualiza todas as unidades; novos registros são criados na unidade selecionada.
          </DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (!unidadeId) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs text-destructive ${className}`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Sem unidade vinculada — peça ao administrador</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground ${className}`}
      title="Você só acessa registros desta unidade"
    >
      <Building2 className="h-3.5 w-3.5 text-primary" />
      <span className="truncate max-w-[180px]">{unidadeNome}</span>
    </span>
  );
}
