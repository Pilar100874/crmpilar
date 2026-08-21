import { supabase } from "@/integrations/supabase/client";

/** Tipos de veículo padrão do cadastro de Logística (fonte única da verdade). */
export const TIPOS_VEICULO_LOGISTICA = [
  "Pessoa",
  "Celular",
  "Carro",
  "Van",
  "Caminhão Leve",
  "Caminhão Médio",
  "Caminhão Pesado",
  "Moto",
  "Bicicleta",
  "Outro",
] as const;

/**
 * Lista os tipos de veículo existentes no cadastro de Logística,
 * combinando os tipos padrão com os já usados nos veículos cadastrados.
 */
export async function listarTiposVeiculoLogistica(): Promise<string[]> {
  const { data } = await supabase.from("veiculos").select("tipo_veiculo");
  const usados = (data ?? [])
    .map((r: any) => (r.tipo_veiculo as string | null)?.trim())
    .filter((t): t is string => !!t);
  // Somente os tipos realmente usados no cadastro de veículos da Logística
  const todos = Array.from(new Set(usados));
  return todos.sort((a, b) => a.localeCompare(b, "pt-BR"));
}
