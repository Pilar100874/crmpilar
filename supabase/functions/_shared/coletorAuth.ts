import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const ChaveColetorSchema = z.string().trim().min(1).max(120).transform((valor) => valor.toUpperCase());

export async function validarChaveColetor(sb: any, chaveInformada: unknown) {
  const chaveValidada = ChaveColetorSchema.safeParse(chaveInformada);
  if (!chaveValidada.success) {
    return { erro: "chave obrigatória", status: 401 } as const;
  }

  const { data, error } = await sb
    .from("automacao_app_chaves")
    .select("id, estabelecimento_id, bloqueado, app")
    .eq("chave", chaveValidada.data)
    .maybeSingle();

  if (error) return { erro: "falha ao validar a chave", status: 500 } as const;
  if (!data) return { erro: "chave não encontrada", status: 403 } as const;
  if (data.bloqueado) return { erro: "chave bloqueada", status: 403 } as const;
  if (data.app !== "coletor") return { erro: "esta chave é de outro aplicativo", status: 403 } as const;

  await sb
    .from("automacao_app_chaves")
    .update({ ultima_comunicacao: new Date().toISOString() })
    .eq("id", data.id);

  return { estabelecimentoId: data.estabelecimento_id as string } as const;
}