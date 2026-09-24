import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { carregarGerentesEAdministradores } from "@/lib/cadastros/gerentes";
import { FilteredCheckboxList } from "@/components/common/FilteredCheckboxList";

interface Props {
  contatoId?: string | null;
  estabelecimentoId?: string | null;
}

/** Vínculo de gerentes responsáveis pelo contato (tabela customer_vinculos). */
export function GerenteContatoVinculo({ contatoId, estabelecimentoId }: Props) {
  const [gerentes, setGerentes] = useState<{ id: string; nome: string }[]>([]);
  const [vinculados, setVinculados] = useState<string[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!estabelecimentoId) return;
    carregarGerentesEAdministradores(estabelecimentoId).then(setGerentes).catch(console.error);
  }, [estabelecimentoId]);

  useEffect(() => {
    if (!contatoId) return;
    supabase
      .from("customer_vinculos" as any)
      .select("usuario_id")
      .eq("customer_id", contatoId)
      .then(({ data }) => setVinculados(((data as any[]) || []).map((v) => v.usuario_id).filter(Boolean)));
  }, [contatoId]);

  const disponiveis = gerentes.filter((g) => !vinculados.includes(g.id));
  const gerentesVinculados = gerentes.filter((g) => vinculados.includes(g.id));

  const adicionarSelecionados = async () => {
    if (!contatoId || selecionados.length === 0) return;
    setSalvando(true);
    try {
      const ids = [...selecionados];
      setSelecionados([]);
      for (const id of ids) {
        const { error } = await supabase
          .from("customer_vinculos" as any)
          .insert({ customer_id: contatoId, usuario_id: id, estabelecimento_id: estabelecimentoId } as any);
        if (error) throw error;
        setVinculados((v) => [...v, id]);
      }
      toast.success(ids.length > 1 ? `${ids.length} gerentes vinculados` : "Gerente vinculado");
    } catch (e: any) {
      toast.error("Erro ao salvar vínculo: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (gerenteId: string) => {
    if (!contatoId) return;
    try {
      const { error } = await supabase
        .from("customer_vinculos" as any)
        .delete()
        .eq("customer_id", contatoId)
        .eq("usuario_id", gerenteId);
      if (error) throw error;
      setVinculados((v) => v.filter((id) => id !== gerenteId));
      toast.success("Gerente desvinculado");
    } catch (e: any) {
      toast.error("Erro ao remover vínculo: " + (e?.message || e));
    }
  };

  if (!contatoId) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Salve o contato primeiro para vincular um gerente.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Busca e Seleção de Gerentes (topo) */}
      <Card className="p-4">
        <Label className="text-xs">Vincular Gerentes</Label>
        <p className="text-xs text-muted-foreground mt-1">Marque um ou mais gerentes e clique em adicionar para vincular todos de uma vez.</p>

        <div className="mt-3">
          <FilteredCheckboxList
            items={disponiveis.map((g) => ({ id: g.id, label: g.nome }))}
            selected={selecionados}
            onToggle={(id, checked) =>
              setSelecionados((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
            }
            idPrefix="vinculo-gerente"
            emptyText="Nenhum gerente disponível para vincular."
            searchPlaceholder="Buscar por nome..."
          />
        </div>

        <div className="flex justify-end mt-3">
          <Button size="sm" disabled={selecionados.length === 0 || salvando} onClick={adicionarSelecionados}>
            Adicionar Selecionados ({selecionados.length})
          </Button>
        </div>
      </Card>

      {/* Lista de Vinculados (abaixo) */}
      {gerentesVinculados.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Gerentes Vinculados ({gerentesVinculados.length})
          </h3>
          <div className="space-y-2">
            {gerentesVinculados.map((g) => (
              <div key={g.id} className="group flex items-center justify-between p-2 border rounded-md hover:bg-accent/50">
                <div className="font-medium text-sm">{g.nome}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() => remover(g.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
