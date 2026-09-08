export type ShellyModelo = {
  id: string;
  nome: string;
  geracao: "gen1" | "gen2";
  funcao: "entrada" | "saida" | "ambos";
  canais: number;
  descricao: string;
};

/**
 * Catálogo dos modelos Shelly suportados pelo módulo de Portaria.
 * Apenas os modelos simples realmente usados no início:
 *  - Shelly 1 Gen3  → saída (relé 1 canal: portão / fechadura)
 *  - Shelly i4 Gen3 → entrada (4 entradas digitais: campainha / botão)
 */
export const SHELLY_MODELOS: ShellyModelo[] = [
  {
    id: "shelly-1-gen3",
    nome: "Shelly 1 Gen3",
    geracao: "gen2",
    funcao: "saida",
    canais: 1,
    descricao: "Relé seco 1 canal — fechadura / portão",
  },
  {
    id: "shelly-i4-gen3",
    nome: "Shelly i4 Gen3",
    geracao: "gen2",
    funcao: "entrada",
    canais: 4,
    descricao: "4 entradas digitais — campainha / botão",
  },
  {
    id: "outro",
    nome: "Outro modelo Shelly",
    geracao: "gen2",
    funcao: "ambos",
    canais: 1,
    descricao: "Configuração manual",
  },
];

export const getShellyModelo = (id?: string | null) =>
  SHELLY_MODELOS.find((m) => m.id === id) ?? null;

/** Porta padrão sugerida por tipo de dispositivo da portaria. */
export const PORTAS_PADRAO_DISPOSITIVO: Record<string, number> = {
  shelly: 80, // interface web / API RPC do Shelly
  idface: 80, // painel web / API HTTP do Control iD iDFace Max
};

export const portaPadraoDispositivo = (tipo?: string | null, modelo?: string | null): number => {
  if (tipo === "shelly" && modelo) {
    const m = getShellyModelo(modelo);
    if (m && m.geracao === "gen1") return 80;
  }
  return PORTAS_PADRAO_DISPOSITIVO[tipo ?? "shelly"] ?? 80;
};

export const rotuloShelly = (modeloId?: string | null, funcao?: string | null) => {
  const m = getShellyModelo(modeloId);
  const f = funcao === "entrada" ? "Entrada" : "Saída";
  return m ? `${f} · ${m.nome}` : `${f} · Shelly`;
};
