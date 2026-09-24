import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { carregarGerentesEAdministradores, type UsuarioGerente } from "@/lib/cadastros/gerentes";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TransferenciaValor {
  novoGerenteId: string | null;
  novoVendedorId: string | null;
}

interface Props {
  /** 'vendedor' = empresa do tipo vendedor; 'gerente' = usuário gerente/admin */
  tipo: "vendedor" | "gerente";
  id: string;
  valor: TransferenciaValor;
  onChange: (v: TransferenciaValor) => void;
  onEmpresasCount?: (n: number) => void;
}

/** Conta quantas empresas estão vinculadas ao vendedor/gerente. */
export async function contarEmpresasVinculadas(tipo: "vendedor" | "gerente", id: string) {
  const col = tipo === "vendedor" ? "vendedor_id" : "usuario_id";
  const { data } = await supabase.from("empresa_vinculos").select("empresa_id").eq(col, id);
  return new Set((data || []).map((r: any) => r.empresa_id)).size;
}

/** Transfere a carteira (empresas vinculadas) antes da inativação. */
export async function transferirCarteira(tipo: "vendedor" | "gerente", id: string, v: TransferenciaValor) {
  if (!v.novoGerenteId) throw new Error("Selecione o novo gerente que vai assumir as empresas.");
  if (tipo === "vendedor") {
    const { error } = await supabase
      .from("empresa_vinculos")
      .update({ usuario_id: v.novoGerenteId, vendedor_id: v.novoVendedorId, auto_via_vendedor_id: null } as any)
      .eq("vendedor_id", id);
    if (error) throw error;
    await supabase.from("gerente_vendedores").delete().eq("vendedor_empresa_id", id);
  } else {
    const { error } = await supabase
      .from("empresa_vinculos")
      .update({ usuario_id: v.novoGerenteId } as any)
      .eq("usuario_id", id);
    if (error) throw error;
    const { error: e2 } = await supabase
      .from("gerente_vendedores")
      .update({ gerente_usuario_id: v.novoGerenteId } as any)
      .eq("gerente_usuario_id", id);
    if (e2) throw e2;
  }
}

export function TransferenciaCarteira({ tipo, id, valor, onChange, onEmpresasCount }: Props) {
  const [gerentes, setGerentes] = useState<UsuarioGerente[]>([]);
  const [vendedores, setVendedores] = useState<Array<{ id: string; nome: string }>>([]);
  const [qtd, setQtd] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const est = await getEstabelecimentoId();
      const n = await contarEmpresasVinculadas(tipo, id);
      setQtd(n);
      onEmpresasCount?.(n);
      if (est) {
        const lista = await carregarGerentesEAdministradores(est);
        setGerentes(lista.filter((g) => g.id !== id));
      }
      if (tipo === "vendedor" && !valor.novoGerenteId) {
        const { data } = await supabase
          .from("gerente_vendedores")
          .select("gerente_usuario_id")
          .eq("vendedor_empresa_id", id)
          .limit(1);
        const g = data?.[0]?.gerente_usuario_id;
        if (g) onChange({ novoGerenteId: g, novoVendedorId: null });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, id]);

  useEffect(() => {
    if (tipo !== "vendedor" || !valor.novoGerenteId) { setVendedores([]); return; }
    (async () => {
      const { data: gv } = await supabase
        .from("gerente_vendedores")
        .select("vendedor_empresa_id")
        .eq("gerente_usuario_id", valor.novoGerenteId!);
      const ids = (gv || []).map((r: any) => r.vendedor_empresa_id).filter((v: string) => v !== id);
      if (!ids.length) { setVendedores([]); return; }
      const { data: emp } = await supabase
        .from("empresas")
        .select("id, nome_fantasia, nome, ativo")
        .in("id", ids);
      setVendedores(
        (emp || [])
          .filter((e: any) => e.ativo !== false)
          .map((e: any) => ({ id: e.id, nome: e.nome_fantasia || e.nome || "Sem nome" })),
      );
    })();
  }, [tipo, id, valor.novoGerenteId]);

  if (qtd === null) return <p className="text-xs text-muted-foreground">Verificando empresas vinculadas...</p>;
  if (qtd === 0) return null;

  return (
    <div className="space-y-3 rounded-md border border-warning/40 bg-warning/5 p-3">
      <p className="text-sm text-foreground">
        {tipo === "vendedor" ? "Este vendedor" : "Este gerente"} tem <strong>{qtd}</strong>{" "}
        {qtd === 1 ? "empresa vinculada" : "empresas vinculadas"}. Indique quem vai assumir antes de inativar.
      </p>
      <div className="space-y-1">
        <Label className={!valor.novoGerenteId ? "text-destructive" : ""}>Novo gerente *</Label>
        <Select
          value={valor.novoGerenteId || ""}
          onValueChange={(v) => onChange({ novoGerenteId: v, novoVendedorId: null })}
        >
          <SelectTrigger className={!valor.novoGerenteId ? "border-destructive" : ""}>
            <SelectValue placeholder="Selecione o gerente" />
          </SelectTrigger>
          <SelectContent>
            {gerentes.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {tipo === "vendedor" && valor.novoGerenteId && (
        <div className="space-y-1">
          <Label>Passar para outro vendedor deste gerente?</Label>
          <Select
            value={valor.novoVendedorId || "__none__"}
            onValueChange={(v) => onChange({ ...valor, novoVendedorId: v === "__none__" ? null : v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Não — deixar só com o gerente</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {vendedores.length === 0 && (
            <p className="text-xs text-muted-foreground">Esse gerente não tem outros vendedores vinculados.</p>
          )}
        </div>
      )}
    </div>
  );
}
