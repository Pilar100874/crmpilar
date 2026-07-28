import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buscarCNPJ, clearCnpjCache, type CnpjResultado } from "@/lib/cadastros/cnpjService";
import { buscarCEP, clearCepCache, type CepResultado } from "@/lib/cadastros/cepService";

// Stub do cliente supabase (fallback de e-mail/telefone). Retorna vazio por padrão.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } },
}));

// ============================================================
// CONTRATOS — chaves permitidas em cada resultado normalizado
// (fonte da verdade: interfaces exportadas por cnpjService/cepService)
// Alterações intencionais no contrato exigem atualizar estas listas.
// ============================================================
const CNPJ_KEYS: ReadonlyArray<keyof CnpjResultado> = [
  "cnpj", "razaoSocial", "nomeFantasia", "situacaoCadastral", "dataAbertura",
  "naturezaJuridica", "capitalSocial", "porte", "regimeTributario",
  "optanteMei", "optanteSimples", "cnaePrincipal", "cnaesSecundarios",
  "email", "telefone", "cep", "logradouro", "numero", "complemento",
  "bairro", "cidade", "uf", "pais",
];

const CEP_KEYS: ReadonlyArray<keyof CepResultado> = [
  "cep", "logradouro", "complemento", "bairro", "cidade", "uf",
];

function assertExactKeys<T extends object>(obj: T, allowed: ReadonlyArray<keyof T>) {
  const actual = Object.keys(obj).sort();
  const expected = [...allowed].map(String).sort();
  const unexpected = actual.filter((k) => !expected.includes(k));
  const missing = expected.filter((k) => !actual.includes(k));
  expect({ unexpected, missing }).toEqual({ unexpected: [], missing: [] });
}

// =====================================================================
// CNPJ
// =====================================================================
describe("Contrato — normalização de CNPJ (buscarCNPJ)", () => {
  const originalFetch = global.fetch;
  const VALID = "11222333000181";

  beforeEach(() => clearCnpjCache());
  afterEach(() => { global.fetch = originalFetch; vi.restoreAllMocks(); });

  const brasilApiPayload = {
    // Chaves "sujas" e extras propositais para validar limpeza + descarte
    cnpj: "11.222.333/0001-81",
    razao_social: "ACME DO BRASIL LTDA",
    nome_fantasia: "ACME",
    descricao_situacao_cadastral: "ATIVA",
    data_inicio_atividade: "2020-01-15",
    natureza_juridica: "206-2 - Sociedade Empresária Limitada",
    capital_social: "150000.75",              // string → coerção para number
    porte: "DEMAIS",
    regime_tributario: [{ forma_de_tributacao: "LUCRO PRESUMIDO" }],
    opcao_pelo_mei: false,
    opcao_pelo_simples: true,
    cnae_fiscal: 6201501,
    cnae_fiscal_descricao: "Desenvolvimento de programas de computador sob encomenda",
    cnaes_secundarios: [
      { codigo: "6202300", descricao: "Desenv. e licenciamento de programas customizáveis" },
      { codigo: "", descricao: "Deve ser removido por não ter código" },
    ],
    ddd_telefone_1: "(11) 3333-4444;(11) 99999-0000",   // deve pegar só o 1º e virar dígitos
    email: "CONTATO@ACME.COM.BR",
    cep: "01.310-100",                         // com máscara → só dígitos
    descricao_tipo_de_logradouro: "AVENIDA",
    logradouro: "PAULISTA",
    numero: "1000",
    complemento: "SALA 42",
    bairro: "BELA VISTA",
    municipio: "SAO PAULO",                    // chave da API → deve mapear para 'cidade'
    uf: "SP",
    // Campos que NÃO devem passar para o resultado normalizado
    situacao_especial: "N/A",
    ente_federativo_responsavel: "-",
    qsa: [{ nome_socio: "FULANO", qualificacao_socio: "SÓCIO" }],
    _lixo: { deveSerIgnorado: true },
  };

  async function fetchCnpj() {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => brasilApiPayload }) as any;
    const r = await buscarCNPJ(VALID);
    expect(r).not.toBeNull();
    return r as CnpjResultado;
  }

  it("retorna somente as chaves declaradas no contrato (sem campos inesperados)", async () => {
    const r = await fetchCnpj();
    assertExactKeys(r, CNPJ_KEYS);
  });

  it("normaliza CNPJ, CEP e telefone para apenas dígitos (com prefixo 55 no telefone)", async () => {
    const r = await fetchCnpj();
    expect(r.cnpj).toBe("11222333000181");
    expect(r.cnpj).toMatch(/^\d{14}$/);
    expect(r.cep).toBe("01310100");
    expect(r.cep).toMatch(/^\d{8}$/);
    // Pega o primeiro número, remove máscara, prefixa 55, limita a 13 dígitos
    expect(r.telefone).toBe("551133334444");
    expect(r.telefone.startsWith("55")).toBe(true);
    expect(/^\d+$/.test(r.telefone)).toBe(true);
    expect(r.telefone.length).toBeLessThanOrEqual(13);
  });

  it("mapeia chaves da BrasilAPI para os nomes do contrato", async () => {
    const r = await fetchCnpj();
    expect(r.razaoSocial).toBe("ACME DO BRASIL LTDA");        // razao_social → razaoSocial
    expect(r.nomeFantasia).toBe("ACME");                       // nome_fantasia → nomeFantasia
    expect(r.situacaoCadastral).toBe("ATIVA");                 // descricao_situacao_cadastral → situacaoCadastral
    expect(r.dataAbertura).toBe("2020-01-15");                 // data_inicio_atividade → dataAbertura
    expect(r.naturezaJuridica).toBe("206-2 - Sociedade Empresária Limitada");
    expect(r.regimeTributario).toBe("LUCRO PRESUMIDO");        // regime_tributario[0].forma_de_tributacao → regimeTributario
    expect(r.optanteMei).toBe(false);                          // opcao_pelo_mei → optanteMei
    expect(r.optanteSimples).toBe(true);                       // opcao_pelo_simples → optanteSimples
    expect(r.cidade).toBe("SAO PAULO");                        // municipio → cidade
    expect(r.pais).toBe("Brasil");                             // constante injetada
  });

  it("coage capital_social para number quando vem como string", async () => {
    const r = await fetchCnpj();
    expect(typeof r.capitalSocial).toBe("number");
    expect(r.capitalSocial).toBe(150000.75);
  });

  it("normaliza CNAE principal (objeto) e secundários (array filtrado)", async () => {
    const r = await fetchCnpj();
    expect(r.cnaePrincipal).toEqual({
      codigo: "6201501",
      descricao: "Desenvolvimento de programas de computador sob encomenda",
    });
    // Secundários: só entra o que tem código; strings sempre presentes; formato { codigo, descricao }
    expect(r.cnaesSecundarios).toEqual([
      { codigo: "6202300", descricao: "Desenv. e licenciamento de programas customizáveis" },
    ]);
    for (const c of r.cnaesSecundarios) {
      assertExactKeys(c, ["codigo", "descricao"]);
      expect(typeof c.codigo).toBe("string");
      expect(typeof c.descricao).toBe("string");
    }
  });

  it("logradouro concatena tipo + logradouro (sem duplicar espaços)", async () => {
    const r = await fetchCnpj();
    expect(r.logradouro).toBe("AVENIDA PAULISTA");
    expect(r.logradouro).not.toMatch(/\s{2,}/);
  });

  it("garante que campos ausentes viram string vazia ou null (nunca undefined)", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ razao_social: "MINIMO LTDA" }),
    }) as any;
    const r = (await buscarCNPJ(VALID)) as CnpjResultado;
    assertExactKeys(r, CNPJ_KEYS);
    // Nenhuma chave undefined
    for (const k of Object.keys(r) as Array<keyof CnpjResultado>) {
      expect(r[k]).not.toBeUndefined();
    }
    expect(r.cnpj).toBe(VALID);
    expect(r.razaoSocial).toBe("MINIMO LTDA");
    expect(r.nomeFantasia).toBe("");
    expect(r.telefone).toBe("");
    expect(r.cep).toBe("");
    expect(r.logradouro).toBe("");
    expect(r.cidade).toBe("");
    expect(r.capitalSocial).toBeNull();
    expect(r.optanteMei).toBeNull();
    expect(r.optanteSimples).toBeNull();
    expect(r.cnaePrincipal).toBeNull();
    expect(r.cnaesSecundarios).toEqual([]);
    expect(r.pais).toBe("Brasil");
  });

  it("retorna null quando o CNPJ é inválido (não faz fetch)", async () => {
    const spy = vi.fn();
    global.fetch = spy as any;
    const r = await buscarCNPJ("00000000000000");
    expect(r).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

// =====================================================================
// CEP
// =====================================================================
describe("Contrato — normalização de CEP (buscarCEP)", () => {
  const originalFetch = global.fetch;
  const VALID = "01310100";

  beforeEach(() => clearCepCache());
  afterEach(() => { global.fetch = originalFetch; vi.restoreAllMocks(); });

  const viaCepPayload = {
    cep: "01310-100",                    // com máscara → só dígitos
    logradouro: "Avenida Paulista",
    complemento: "lado ímpar",
    bairro: "Bela Vista",
    localidade: "São Paulo",             // ViaCEP usa 'localidade' → contrato usa 'cidade'
    uf: "SP",
    // Campos que NÃO devem vazar
    ibge: "3550308",
    gia: "1004",
    ddd: "11",
    siafi: "7107",
  };

  async function fetchCep(payload: Record<string, unknown> = viaCepPayload) {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => payload }) as any;
    const r = await buscarCEP(VALID);
    expect(r).not.toBeNull();
    return r as CepResultado;
  }

  it("retorna somente as chaves declaradas no contrato (descarta ibge/gia/ddd/siafi)", async () => {
    const r = await fetchCep();
    assertExactKeys(r, CEP_KEYS);
  });

  it("normaliza o CEP para apenas dígitos", async () => {
    const r = await fetchCep();
    expect(r.cep).toBe("01310100");
    expect(r.cep).toMatch(/^\d{8}$/);
  });

  it("mapeia 'localidade' → 'cidade' e preserva os demais campos como strings", async () => {
    const r = await fetchCep();
    expect(r.cidade).toBe("São Paulo");
    expect(r.logradouro).toBe("Avenida Paulista");
    expect(r.complemento).toBe("lado ímpar");
    expect(r.bairro).toBe("Bela Vista");
    expect(r.uf).toBe("SP");
    for (const k of CEP_KEYS) expect(typeof r[k]).toBe("string");
  });

  it("garante string vazia (nunca undefined) para campos ausentes no payload", async () => {
    const r = await fetchCep({ cep: "01310-100" });
    assertExactKeys(r, CEP_KEYS);
    expect(r.cep).toBe("01310100");
    expect(r.logradouro).toBe("");
    expect(r.complemento).toBe("");
    expect(r.bairro).toBe("");
    expect(r.cidade).toBe("");
    expect(r.uf).toBe("");
    for (const k of CEP_KEYS) expect(r[k]).not.toBeUndefined();
  });

  it("cai no CEP passado quando o payload não traz 'cep'", async () => {
    const r = await fetchCep({ logradouro: "Rua X", localidade: "Curitiba", uf: "PR" });
    expect(r.cep).toBe(VALID);
    expect(r.cidade).toBe("Curitiba");
    expect(r.uf).toBe("PR");
  });

  it("retorna null quando o CEP é inválido (não faz fetch)", async () => {
    const spy = vi.fn();
    global.fetch = spy as any;
    const r = await buscarCEP("123");
    expect(r).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("retorna null quando ViaCEP responde { erro: true } (not-found)", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ erro: true }) }) as any;
    const r = await buscarCEP(VALID);
    expect(r).toBeNull();
  });
});
