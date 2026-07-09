// Utilitários para o grupo de campos "CNPJ" (auto-preenchimento pela Receita).
// Um campo CNPJ do usuário gera múltiplos sub-campos preenchíveis no documento,
// todos compartilhando o mesmo cnpjGroup para autofill coordenado.

import { serializeFillable, type FillableTipo } from "@/lib/editores/mergeEngine";

export interface CnpjSubfield {
  key: string;   // chave na resposta da BrasilAPI
  label: string; // rótulo exibido no formulário
}

export const CNPJ_SUBFIELDS: CnpjSubfield[] = [
  { key: "cnpj", label: "CNPJ" },
  { key: "razao_social", label: "Razão Social" },
  { key: "nome_fantasia", label: "Nome Fantasia" },
  { key: "logradouro", label: "Logradouro" },
  { key: "numero", label: "Número" },
  { key: "complemento", label: "Complemento" },
  { key: "bairro", label: "Bairro" },
  { key: "cep", label: "CEP" },
  { key: "municipio", label: "Município" },
  { key: "uf", label: "UF" },
  { key: "ddd_telefone_1", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "inscricao_estadual", label: "Inscrição Estadual" },
  { key: "descricao_situacao_cadastral", label: "Situação" },
  { key: "data_inicio_atividade", label: "Data de Abertura" },
  { key: "cnae_fiscal_descricao", label: "CNAE Principal" },
];

export const CNPJ_GROUP_PAYLOAD_PREFIX = "__CNPJ_GROUP__:";

export function buildCnpjGroupPayload(group: string, keys: string[]): string {
  return CNPJ_GROUP_PAYLOAD_PREFIX + JSON.stringify({ group, keys });
}

export function parseCnpjGroupPayload(s: string): { group: string; keys: string[] } | null {
  if (!s.startsWith(CNPJ_GROUP_PAYLOAD_PREFIX)) return null;
  try { return JSON.parse(s.slice(CNPJ_GROUP_PAYLOAD_PREFIX.length)); } catch { return null; }
}

export interface FillableAttrs {
  tipo: FillableTipo;
  token: string;
  label: string;
  opcoes: string;
  cnpjSubfield: string;
  cnpjGroup: string;
}

/** Gera os atributos de fillableField para cada sub-campo selecionado. */
export function buildCnpjGroupFields(group: string, keys: string[]): FillableAttrs[] {
  const labelMap = new Map(CNPJ_SUBFIELDS.map(s => [s.key, s.label]));
  return keys.map((k) => {
    const subLabel = labelMap.get(k) || k;
    const label = `${group} - ${subLabel}`;
    const tipo: FillableTipo = k === "cnpj" ? "cnpj" : "texto";
    return {
      tipo,
      token: serializeFillable({ tipo, label }),
      label,
      opcoes: "",
      cnpjSubfield: k,
      cnpjGroup: group,
    };
  });
}
