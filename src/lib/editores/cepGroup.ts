// Utilitários para o grupo de campos "CEP" (auto-preenchimento pelo ViaCEP).
// Similar ao cnpjGroup: um campo CEP gera múltiplos sub-campos preenchíveis,
// todos compartilhando o mesmo cepGroup para autofill coordenado.

import { serializeFillable, type FillableTipo } from "@/lib/editores/mergeEngine";

export interface CepSubfield {
  key: string;   // chave na resposta do ViaCEP
  label: string; // rótulo exibido no formulário
}

export const CEP_SUBFIELDS: CepSubfield[] = [
  { key: "cep", label: "CEP" },
  { key: "logradouro", label: "Logradouro" },
  { key: "complemento", label: "Complemento" },
  { key: "bairro", label: "Bairro" },
  { key: "localidade", label: "Município" },
  { key: "uf", label: "UF" },
];

export const CEP_GROUP_PAYLOAD_PREFIX = "__CEP_GROUP__:";

export function buildCepGroupPayload(group: string, keys: string[]): string {
  return CEP_GROUP_PAYLOAD_PREFIX + JSON.stringify({ group, keys });
}

export function parseCepGroupPayload(s: string): { group: string; keys: string[] } | null {
  if (!s.startsWith(CEP_GROUP_PAYLOAD_PREFIX)) return null;
  try { return JSON.parse(s.slice(CEP_GROUP_PAYLOAD_PREFIX.length)); } catch { return null; }
}

export interface CepFillableAttrs {
  tipo: FillableTipo;
  token: string;
  label: string;
  opcoes: string;
  cepSubfield: string;
  cepGroup: string;
}

/** Gera os atributos de fillableField para cada sub-campo selecionado. */
export function buildCepGroupFields(group: string, keys: string[]): CepFillableAttrs[] {
  const labelMap = new Map(CEP_SUBFIELDS.map(s => [s.key, s.label]));
  return keys.map((k) => {
    const subLabel = labelMap.get(k) || k;
    const label = `${group} - ${subLabel}`;
    const tipo: FillableTipo = k === "cep" ? "cep" : "texto";
    return {
      tipo,
      token: serializeFillable({ tipo, label }),
      label,
      opcoes: "",
      cepSubfield: k,
      cepGroup: group,
    };
  });
}
