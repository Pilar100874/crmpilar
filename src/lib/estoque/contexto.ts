import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Estabelecimento e usuário interno (usuarios.id) da sessão atual. */
export function useContextoInterno() {
  const [ctx, setCtx] = useState<{ estabelecimentoId: string | null; usuarioId: string | null }>({ estabelecimentoId: null, usuarioId: null });
  useEffect(() => {
    (async () => {
      const [{ data: e }, { data: u }] = await Promise.all([
        supabase.rpc("get_auth_user_estabelecimento_id"),
        supabase.rpc("get_current_usuario_id_safe"),
      ]);
      setCtx({ estabelecimentoId: (e as string) ?? null, usuarioId: (u as string) ?? null });
    })();
  }, []);
  return ctx;
}

export const brl = (n?: number | null) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const qtd = (n?: number | null) => (Number(n) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
export const dataBr = (d?: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
export const nomeEmpresa = (e?: { nome_fantasia?: string | null; nome?: string | null } | null) => e?.nome_fantasia || e?.nome || "—";

export function baixarCsv(nome: string, linhas: (string | number)[][]) {
  const csv = linhas.map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = nome; a.click();
}
