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

export const rotuloShelly = (modeloId?: string | null, funcao?: string | null) => {
  const m = getShellyModelo(modeloId);
  const f = funcao === "entrada" ? "Entrada" : "Saída";
  return m ? `${f} · ${m.nome}` : `${f} · Shelly`;
};
