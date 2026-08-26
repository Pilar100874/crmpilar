/**
 * Utilitários para leitura da NF-e a partir do código de barras / QR Code.
 *
 * A chave de acesso (44 dígitos) é o padrão nacional da Receita/SEFAZ e já carrega
 * os dados fiscais principais, que extraímos localmente (sem certificado digital).
 */

export interface NfeDados {
  chave: string;
  uf: string;
  emissao: string; // AA/MM
  cnpj_emitente: string;
  modelo: string;
  serie: string;
  numero: string;
  tipo_emissao: string;
  digito: string;
  consulta_url: string;
}

const UFS: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA",
  "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS",
  "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

/** Extrai os 44 dígitos da chave a partir de qualquer texto lido (código de barras ou URL do QR Code). */
export function extrairChaveNfe(texto: string): string | null {
  if (!texto) return null;
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 44) return digitos;
  const m = digitos.match(/\d{44}/);
  return m ? m[0] : null;
}

export function formatarChave(chave: string) {
  return (chave.match(/.{1,4}/g) ?? []).join(" ");
}

export function formatarCnpj(c: string) {
  return c.length === 14
    ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
    : c;
}

/** Valida o dígito verificador (módulo 11) da chave de acesso. */
export function chaveValida(chave: string): boolean {
  if (!/^\d{44}$/.test(chave)) return false;
  const base = chave.slice(0, 43);
  let peso = 2;
  let soma = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return dv === Number(chave[43]);
}

export function parseChaveNfe(chave: string): NfeDados | null {
  if (!/^\d{44}$/.test(chave)) return null;
  const uf = UFS[chave.slice(0, 2)] ?? chave.slice(0, 2);
  const aa = chave.slice(2, 4);
  const mm = chave.slice(4, 6);
  return {
    chave,
    uf,
    emissao: `${mm}/20${aa}`,
    cnpj_emitente: formatarCnpj(chave.slice(6, 20)),
    modelo: chave.slice(20, 22),
    serie: String(Number(chave.slice(22, 25))),
    numero: String(Number(chave.slice(25, 34))),
    tipo_emissao: chave.slice(34, 35),
    digito: chave.slice(43),
    consulta_url: "https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=completa&tipoConteudo=XbSeqxE8pl8=",
  };
}
