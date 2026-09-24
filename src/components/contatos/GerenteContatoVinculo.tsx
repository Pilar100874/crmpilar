import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { carregarGerentesEAdministradores } from "@/lib/cadastros/gerentes";

interface Props {
  contatoId?: string | null;
  estabelecimentoId?: string | null;
}

/** Vínculo de gerentes responsáveis pelo contato (tabela customer_vinculos). */
export function GerenteContatoVinculo({ contatoId, estabelecimentoId }: Props) {
  const [gerentes, setGerentes] = useState<{ id: string; nome: string }[]>([]);
  const [vinculados, setVinculados] = useState<string[]>([]);
  const [salvando, setSalvando] = useState<string | null>(null);

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

  const alternar = async (gerenteId: string) => {
    if (!contatoId) return;
    setSalvando(gerenteId);
    try {
      if (vinculados.includes(gerenteId)) {
        const { error } = await supabase
          .from("customer_vinculos" as any)
          .delete()
          .eq("customer_id", contatoId)
          .eq("usuario_id", gerenteId);
        if (error) throw error;
        setVinculados((v) => v.filter((id) => id !== gerenteId));
        toast.success("Gerente desvinculado");
      } else {
        const { error } = await supabase
          .from("customer_vinculos" as any)
          .insert({ customer_id: contatoId, usuario_id: gerenteId, estabelecimento_id: estabelecimentoId } as any);
        if (error) throw error;
        setVinculados((v) => [...v, gerenteId]);
        toast.success("Gerente vinculado");
      }
    } catch (e: any) {
      toast.error("Erro ao salvar vínculo: " + (e?.message || e));
    } finally {
      setSalvando(null);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Gerentes Vinculados ({vinculados.length})</h3>
        <p className="text-xs text-muted-foreground">Clique em um gerente para vincular ou desvincular deste contato.</p>
      </div>
      {!contatoId ? (
        <p className="text-sm text-muted-foreground">Salve o contato primeiro para vincular um gerente.</p>
      ) : (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/40 border border-border/40">
          {gerentes.map((g) => (
            <Badge
              key={g.id}
              variant={vinculados.includes(g.id) ? "default" : "outline"}
              className={`cursor-pointer ${salvando === g.id ? "opacity-50" : ""}`}
              onClick={() => salvando || alternar(g.id)}
            >
              {g.nome}
            </Badge>
          ))}
          {gerentes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum gerente cadastrado</p>}
        </div>
      )}
    </Card>
  );
}
