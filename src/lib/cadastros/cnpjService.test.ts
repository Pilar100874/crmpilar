import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { buscarCNPJ, clearCnpjCache } from "@/lib/cadastros/cnpjService";

// Mock do supabase client (evita import.meta.env / rede)
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } },
}));

const VALID_CNPJ = "11222333000181"; // CNPJ válido pelos DVs
const INVALID_CNPJ = "12345678901234";

const brasilPayload = {
  razao_social: "ACME LTDA",
  nome_fantasia: "ACME",
  descricao_situacao_cadastral: "ATIVA",
  data_inicio_atividade: "2020-01-01",
  natureza_juridica: "LTDA",
  capital_social: 100000,
  porte: "ME",
  cep: "01310100",
  descricao_tipo_de_logradouro: "AVENIDA",
  logradouro: "PAULISTA",
  numero: "1000",
  complemento: "",
  bairro: "BELA VISTA",
  municipio: "SAO PAULO",
  uf: "SP",
  ddd_telefone_1: "1133334444",
  email: "contato@acme.com",
  cnaes_secundarios: [],
};

describe("buscarCNPJ — estados de consulta", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { clearCnpjCache(); });
  afterEach(() => { global.fetch = originalFetch; vi.restoreAllMocks(); });

  it("invalid: retorna null imediatamente para CNPJ com DV incorreto", async () => {
    const spy = vi.fn();
    global.fetch = spy as any;
    await expect(buscarCNPJ(INVALID_CNPJ)).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("invalid: retorna null para string vazia sem chamar rede", async () => {
    const spy = vi.fn();
    global.fetch = spy as any;
    await expect(buscarCNPJ("")).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("loading: chamadas concorrentes reusam a mesma promise (dedup em voo)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => brasilPayload,
    });
    global.fetch = fetchSpy as any;

    const [a, b] = await Promise.all([buscarCNPJ(VALID_CNPJ), buscarCNPJ(VALID_CNPJ)]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("ok: normaliza sucesso da BrasilAPI para o shape esperado", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => brasilPayload }) as any;
    const r = await buscarCNPJ(VALID_CNPJ);
    expect(r).not.toBeNull();
    expect(r!.razaoSocial).toBe("ACME LTDA");
    expect(r!.uf).toBe("SP");
    expect(r!.cep).toBe("01310100");
    expect(r!.telefone).toMatch(/^55/);
    expect(r!.logradouro).toContain("PAULISTA");
  });

  it("notfound: retorna null quando a API responde !ok (ex.: 404)", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as any;
    await expect(buscarCNPJ(VALID_CNPJ)).resolves.toBeNull();
  });

  it("error: retorna null quando fetch rejeita (falha de rede)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as any;
    await expect(buscarCNPJ(VALID_CNPJ)).resolves.toBeNull();
  });

  it("cancelled: AbortError é tratado como null (não vaza exceção)", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      const e: any = new Error("aborted");
      e.name = "AbortError";
      return Promise.reject(e);
    }) as any;
    await expect(buscarCNPJ(VALID_CNPJ)).resolves.toBeNull();
  });
});
