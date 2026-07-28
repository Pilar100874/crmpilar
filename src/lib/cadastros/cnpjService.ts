// Serviço unificado de consulta de CNPJ.
// - Cache in-memory por CNPJ (dedup de requisições em voo)
// - AbortController para cancelar requisições anteriores
// - Fallback BrasilAPI → edge function `consultar-cnpj` para complementos (e-mail/telefone)
// - Normaliza para um shape rico com todos os campos exigidos pelo padrão de cadastro

import { supabase } from "@/integrations/supabase/client";
import { validateCNPJ } from "@/lib/validators";

export interface CnaeItem {
  codigo: string;
  descricao: string;
}

export interface CnpjResultado {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  dataAbertura: string; // YYYY-MM-DD
  naturezaJuridica: string;
  capitalSocial: number | null;
  porte: string;
  regimeTributario: string;
  optanteMei: boolean | null;
  optanteSimples: boolean | null;
  cnaePrincipal: CnaeItem | null;
  cnaesSecundarios: CnaeItem[];
  email: string;
  telefone: string; // apenas dígitos com 55
  cep: string; // apenas dígitos
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  pais: string;
}

const cache = new Map<string, Promise<CnpjResultado | null>>();
const inflight = new Map<string, AbortController>();

function normalizeTelefone(raw?: string | null): string {
  if (!raw) return "";
  let tel = String(raw).split(/[,;]/)[0].trim().replace(/\D/g, "");
  if (!tel) return "";
  if (!tel.startsWith("55")) tel = "55" + tel;
  return tel.substring(0, 13);
}

async function fetchBrasilApi(cnpj: string, signal: AbortSignal): Promise<any | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchEdgeFallback(cnpj: string): Promise<any | null> {
  try {
    const { data, error } = await supabase.functions.invoke("consultar-cnpj", { body: { cnpj } });
    if (error) return null;
    return data?.empresaData || data?.empresa || data?.data || data || null;
  } catch {
    return null;
  }
}

function normalize(cnpj: string, brasil: any, fallback: any | null): CnpjResultado {
  const secundarios: CnaeItem[] = Array.isArray(brasil?.cnaes_secundarios)
    ? brasil.cnaes_secundarios.map((c: any) => ({
        codigo: String(c.codigo ?? ""),
        descricao: String(c.descricao ?? ""),
      })).filter((c: CnaeItem) => c.codigo)
    : [];

  const cnaePrincipal: CnaeItem | null = brasil?.cnae_fiscal
    ? {
        codigo: String(brasil.cnae_fiscal),
        descricao: String(brasil.cnae_fiscal_descricao || ""),
      }
    : null;

  const logradouro = [brasil?.descricao_tipo_de_logradouro, brasil?.logradouro]
    .filter(Boolean)
    .join(" ")
    .trim();

  const email = (brasil?.email && String(brasil.email).trim()) || (fallback?.email && String(fallback.email).trim()) || "";
  const tel = normalizeTelefone(brasil?.ddd_telefone_1 || fallback?.telefone || fallback?.phone);

  return {
    cnpj,
    razaoSocial: brasil?.razao_social || brasil?.nome_fantasia || "",
    nomeFantasia: brasil?.nome_fantasia || brasil?.razao_social || "",
    situacaoCadastral: brasil?.descricao_situacao_cadastral || brasil?.situacao_cadastral || "",
    dataAbertura: brasil?.data_inicio_atividade || "",
    naturezaJuridica: brasil?.natureza_juridica || "",
    capitalSocial: typeof brasil?.capital_social === "number" ? brasil.capital_social : (brasil?.capital_social ? Number(brasil.capital_social) : null),
    porte: brasil?.porte || "",
    regimeTributario: brasil?.regime_tributario?.[0]?.forma_de_tributacao || "",
    optanteMei: typeof brasil?.opcao_pelo_mei === "boolean" ? brasil.opcao_pelo_mei : null,
    optanteSimples: typeof brasil?.opcao_pelo_simples === "boolean" ? brasil.opcao_pelo_simples : null,
    cnaePrincipal,
    cnaesSecundarios: secundarios,
    email,
    telefone: tel,
    cep: (brasil?.cep || "").replace(/\D/g, ""),
    logradouro,
    numero: brasil?.numero || "",
    complemento: brasil?.complemento || "",
    bairro: brasil?.bairro || "",
    cidade: brasil?.municipio || "",
    uf: brasil?.uf || "",
    pais: "Brasil",
  };
}

/** Busca CNPJ com cache e dedup. Retorna `null` quando não encontrado. */
export function buscarCNPJ(cnpjRaw: string): Promise<CnpjResultado | null> {
  const cnpj = (cnpjRaw || "").replace(/\D/g, "");
  if (cnpj.length !== 14 || !validateCNPJ(cnpj)) return Promise.resolve(null);

  const cached = cache.get(cnpj);
  if (cached) return cached;

  // Cancela requisição anterior (defensivo)
  const prev = inflight.get(cnpj);
  if (prev) prev.abort();
  const ctrl = new AbortController();
  inflight.set(cnpj, ctrl);

  const promise = (async () => {
    const brasil = await fetchBrasilApi(cnpj, ctrl.signal);
    if (!brasil) {
      // Cache negativo curto: 15s (para não martelar API se digitou de novo)
      setTimeout(() => cache.delete(cnpj), 15_000);
      return null;
    }
    let fallback: any | null = null;
    if (!brasil.email || !brasil.ddd_telefone_1) {
      fallback = await fetchEdgeFallback(cnpj);
    }
    return normalize(cnpj, brasil, fallback);
  })().finally(() => {
    inflight.delete(cnpj);
  });

  cache.set(cnpj, promise);
  return promise;
}

/** Limpa o cache (útil para testes). */
export function clearCnpjCache() {
  cache.clear();
  inflight.forEach((c) => c.abort());
  inflight.clear();
}
