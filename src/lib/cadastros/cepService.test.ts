import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { buscarCEP, clearCepCache } from "@/lib/cadastros/cepService";

const VALID_CEP = "01310100";

describe("buscarCEP — estados de consulta", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { clearCepCache(); });
  afterEach(() => { global.fetch = originalFetch; vi.restoreAllMocks(); });

  it("invalid: CEP com menos de 8 dígitos retorna null sem chamada de rede", async () => {
    const spy = vi.fn();
    global.fetch = spy as any;
    await expect(buscarCEP("123")).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("loading: chamadas simultâneas para o mesmo CEP são deduplicadas", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cep: VALID_CEP, logradouro: "Av Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" }),
    });
    global.fetch = fetchSpy as any;

    const [a, b] = await Promise.all([buscarCEP(VALID_CEP), buscarCEP(VALID_CEP)]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(a!.uf).toBe("SP");
    expect(a!.cidade).toBe("São Paulo");
  });

  it("ok: mapeia campos do ViaCEP para o resultado normalizado", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cep: "01310-100", logradouro: "Av Paulista", complemento: "lado ímpar", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" }),
    }) as any;
    const r = await buscarCEP(VALID_CEP);
    expect(r).toEqual({
      cep: "01310100",
      logradouro: "Av Paulista",
      complemento: "lado ímpar",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
    });
  });

  it("notfound: ViaCEP retorna { erro: true } → null", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ erro: true }) }) as any;
    await expect(buscarCEP(VALID_CEP)).resolves.toBeNull();
  });

  it("notfound: HTTP !ok também é tratado como null", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as any;
    await expect(buscarCEP(VALID_CEP)).resolves.toBeNull();
  });

  it("error: falha de rede resulta em null (sem vazar exceção)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as any;
    await expect(buscarCEP(VALID_CEP)).resolves.toBeNull();
  });

  it("cancelled: AbortError é tratado como null", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      const e: any = new Error("aborted");
      e.name = "AbortError";
      return Promise.reject(e);
    }) as any;
    await expect(buscarCEP(VALID_CEP)).resolves.toBeNull();
  });
});
