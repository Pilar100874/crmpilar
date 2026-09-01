export type ShellyModelo = {
  id: string;
  nome: string;
  geracao: "gen1" | "gen2";
  funcao: "entrada" | "saida" | "ambos";
  canais: number;
  descricao: string;
};

/** Catálogo dos modelos Shelly suportados pelo módulo de Portaria. */
export const SHELLY_MODELOS: ShellyModelo[] = [
  // ---- Gen3 / Gen4 (RPC) — relés (saída) ----
  { id: "shelly-1-gen3", nome: "Shelly 1 Gen3", geracao: "gen2", funcao: "saida", canais: 1, descricao: "Relé seco 1 canal — fechadura / portão" },
  { id: "shelly-1pm-gen3", nome: "Shelly 1PM Gen3", geracao: "gen2", funcao: "saida", canais: 1, descricao: "Relé 1 canal com medição de consumo" },
  { id: "shelly-1-mini-gen3", nome: "Shelly 1 Mini Gen3", geracao: "gen2", funcao: "saida", canais: 1, descricao: "Relé compacto 1 canal" },
  { id: "shelly-1pm-mini-gen3", nome: "Shelly 1PM Mini Gen3", geracao: "gen2", funcao: "saida", canais: 1, descricao: "Relé compacto com medição" },
  { id: "shelly-2pm-gen3", nome: "Shelly 2PM Gen3", geracao: "gen2", funcao: "saida", canais: 2, descricao: "Relé 2 canais / persiana" },
  { id: "shelly-plus-1", nome: "Shelly Plus 1", geracao: "gen2", funcao: "saida", canais: 1, descricao: "Relé seco 1 canal (Gen2)" },
  { id: "shelly-plus-1pm", nome: "Shelly Plus 1PM", geracao: "gen2", funcao: "saida", canais: 1, descricao: "Relé 1 canal com medição (Gen2)" },
  { id: "shelly-plus-2pm", nome: "Shelly Plus 2PM", geracao: "gen2", funcao: "saida", canais: 2, descricao: "Relé 2 canais / persiana (Gen2)" },
  { id: "shelly-pro-1", nome: "Shelly Pro 1", geracao: "gen2", funcao: "saida", canais: 1, descricao: "Relé DIN 1 canal" },
  { id: "shelly-pro-1pm", nome: "Shelly Pro 1PM", geracao: "gen2", funcao: "saida", canais: 1, descricao: "Relé DIN 1 canal com medição" },
  { id: "shelly-pro-2", nome: "Shelly Pro 2", geracao: "gen2", funcao: "saida", canais: 2, descricao: "Relé DIN 2 canais" },
  { id: "shelly-pro-2pm", nome: "Shelly Pro 2PM", geracao: "gen2", funcao: "saida", canais: 2, descricao: "Relé DIN 2 canais com medição" },
  { id: "shelly-pro-3", nome: "Shelly Pro 3", geracao: "gen2", funcao: "saida", canais: 3, descricao: "Relé DIN 3 canais" },
  { id: "shelly-pro-4pm", nome: "Shelly Pro 4PM", geracao: "gen2", funcao: "saida", canais: 4, descricao: "Relé DIN 4 canais com medição" },

  // ---- Entradas / detectores ----
  { id: "shelly-i4-gen3", nome: "Shelly i4 Gen3", geracao: "gen2", funcao: "entrada", canais: 4, descricao: "4 entradas digitais — campainha / botão" },
  { id: "shelly-plus-i4", nome: "Shelly Plus i4", geracao: "gen2", funcao: "entrada", canais: 4, descricao: "4 entradas digitais (Gen2)" },
  { id: "shelly-plus-i4dc", nome: "Shelly Plus i4DC", geracao: "gen2", funcao: "entrada", canais: 4, descricao: "4 entradas digitais 12/24V DC" },
  { id: "shelly-blu-button", nome: "Shelly BLU Button 1", geracao: "gen2", funcao: "entrada", canais: 1, descricao: "Botão Bluetooth (via gateway)" },
  { id: "shelly-plus-uni", nome: "Shelly Plus Uni", geracao: "gen2", funcao: "ambos", canais: 2, descricao: "2 saídas + entradas digitais/analógicas" },

  // ---- Gen1 (legado) ----
  { id: "shelly-1", nome: "Shelly 1 (Gen1)", geracao: "gen1", funcao: "saida", canais: 1, descricao: "Relé seco 1 canal — legado" },
  { id: "shelly-1pm", nome: "Shelly 1PM (Gen1)", geracao: "gen1", funcao: "saida", canais: 1, descricao: "Relé 1 canal com medição — legado" },
  { id: "shelly-1l", nome: "Shelly 1L (Gen1)", geracao: "gen1", funcao: "saida", canais: 1, descricao: "Relé sem neutro — legado" },
  { id: "shelly-2-5", nome: "Shelly 2.5 (Gen1)", geracao: "gen1", funcao: "saida", canais: 2, descricao: "Relé 2 canais / persiana — legado" },
  { id: "shelly-4pro", nome: "Shelly 4Pro (Gen1)", geracao: "gen1", funcao: "saida", canais: 4, descricao: "Relé DIN 4 canais — legado" },
  { id: "shelly-uni", nome: "Shelly Uni (Gen1)", geracao: "gen1", funcao: "ambos", canais: 2, descricao: "2 saídas + entradas — legado" },
  { id: "shelly-em", nome: "Shelly EM (Gen1)", geracao: "gen1", funcao: "saida", canais: 1, descricao: "Medidor com relé — legado" },
  { id: "shelly-plug-s", nome: "Shelly Plug S", geracao: "gen1", funcao: "saida", canais: 1, descricao: "Tomada inteligente" },
  { id: "outro", nome: "Outro modelo Shelly", geracao: "gen2", funcao: "ambos", canais: 4, descricao: "Configuração manual" },
];

export const getShellyModelo = (id?: string | null) =>
  SHELLY_MODELOS.find((m) => m.id === id) ?? null;

export const rotuloShelly = (modeloId?: string | null, funcao?: string | null) => {
  const m = getShellyModelo(modeloId);
  const f = funcao === "entrada" ? "Entrada" : "Saída";
  return m ? `${f} · ${m.nome}` : `${f} · Shelly`;
};
