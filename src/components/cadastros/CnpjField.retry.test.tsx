import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { CnpjField } from "./CnpjField";
import { clearCnpjCache } from "@/lib/cadastros/cnpjService";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } },
}));

const VALID_CNPJ = "11222333000181";
const VALID_MASKED = "11.222.333/0001-81";

function makePayload(razao: string) {
  return {
    ok: true,
    json: async () => ({
      razao_social: razao,
      nome_fantasia: razao,
      descricao_situacao_cadastral: "ATIVA",
      data_inicio_atividade: "2020-01-01",
      natureza_juridica: "LTDA",
      capital_social: 100000,
      porte: "ME",
      cep: "01310100",
      descricao_tipo_de_logradouro: "AVENIDA",
      logradouro: "PAULISTA",
      numero: "1000",
      bairro: "BELA VISTA",
      municipio: "SAO PAULO",
      uf: "SP",
      ddd_telefone_1: "1133334444",
      email: "contato@teste.com",
      cnaes_secundarios: [],
    }),
  };
}

function Harness({ onLookup }: { onLookup: (r: any) => void }) {
  const [value, setValue] = useState("");
  return <CnpjField value={value} onChange={setValue} onLookup={onLookup} />;
}

describe("CnpjField — botão 'Tentar novamente' (integração)", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { clearCnpjCache(); vi.useFakeTimers(); });
  afterEach(() => { global.fetch = originalFetch; vi.useRealTimers(); vi.restoreAllMocks(); });

  async function typeCnpj(user: ReturnType<typeof userEvent.setup>) {
    const input = screen.getByPlaceholderText("00.000.000/0000-00");
    await user.type(input, VALID_MASKED);
    await vi.advanceTimersByTimeAsync(500); // passa do debounce (400ms)
  }

  it("após not-found: retry limpa cache, refaz fetch e apresenta novo resultado (sem 'colar' o anterior)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })        // 1ª: not-found
      .mockResolvedValueOnce(makePayload("ACME LTDA"));         // 2ª: sucesso
    global.fetch = fetchSpy as any;
    const onLookup = vi.fn();

    render(<Harness onLookup={onLookup} />);
    await typeCnpj(user);

    // 1º ciclo: not-found visível, sem chamar onLookup
    await waitFor(() => expect(screen.getByText(/CNPJ não encontrado/i)).toBeInTheDocument());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(onLookup).not.toHaveBeenCalled();

    // Clica em "Tentar novamente"
    await user.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    await vi.runAllTimersAsync();

    // 2º ciclo: bypass do cache negativo, novo fetch executado, resultado novo emitido
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    expect(onLookup).toHaveBeenCalledTimes(1);
    expect(onLookup.mock.calls[0][0].razaoSocial).toBe("ACME LTDA");
    // Mensagem de not-found some quando status volta a ok
    expect(screen.queryByText(/CNPJ não encontrado/i)).not.toBeInTheDocument();
  });

  it("após erro de rede: retry limpa estado e produz sucesso na 2ª tentativa", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchSpy = vi.fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(makePayload("BACK ONLINE"));
    global.fetch = fetchSpy as any;
    const onLookup = vi.fn();

    render(<Harness onLookup={onLookup} />);
    await typeCnpj(user);

    await waitFor(() => expect(screen.getByText(/CNPJ não encontrado|Falha ao consultar CNPJ/i)).toBeInTheDocument());
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    await vi.runAllTimersAsync();

    await waitFor(() => expect(onLookup).toHaveBeenCalledWith(expect.objectContaining({ razaoSocial: "BACK ONLINE" })));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retry não usa resultado cacheado — dispara uma requisição HTTP nova mesmo para o mesmo CNPJ", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce(makePayload("SEGUNDA CHAMADA"));
    global.fetch = fetchSpy as any;

    render(<Harness onLookup={vi.fn()} />);
    await typeCnpj(user);
    await waitFor(() => expect(screen.getByText(/CNPJ não encontrado/i)).toBeInTheDocument());

    // Prova de que o cache seria devolvido sem retry: chamar buscarCNPJ direto retornaria null
    // (o cache negativo dura 15s). Ao clicar em retry, forçamos nova chamada.
    await user.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    await vi.runAllTimersAsync();

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    // Ambos os fetches foram para o MESMO CNPJ (cache foi realmente limpo, não bypassado por outra chave)
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain(VALID_CNPJ);
    expect(urls[1]).toContain(VALID_CNPJ);
  });
});
