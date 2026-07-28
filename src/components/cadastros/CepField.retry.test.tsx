import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { CepField } from "./CepField";
import { clearCepCache } from "@/lib/cadastros/cepService";

const VALID_CEP = "01310100";
const VALID_MASKED = "01310-100";

const okPayload = {
  ok: true,
  json: async () => ({
    cep: "01310-100",
    logradouro: "Avenida Paulista",
    complemento: "lado ímpar",
    bairro: "Bela Vista",
    localidade: "São Paulo",
    uf: "SP",
  }),
};

function Harness({ onLookup }: { onLookup: (r: any) => void }) {
  const [value, setValue] = useState("");
  return <CepField value={value} onChange={setValue} onLookup={onLookup} />;
}

describe("CepField — botão 'Tentar novamente' (integração)", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { clearCepCache(); vi.useFakeTimers(); });
  afterEach(() => { global.fetch = originalFetch; vi.useRealTimers(); vi.restoreAllMocks(); });

  async function typeCep(user: ReturnType<typeof userEvent.setup>) {
    const input = screen.getByPlaceholderText("00000-000");
    await user.type(input, VALID_MASKED);
    await vi.advanceTimersByTimeAsync(500);
  }

  it("após not-found ({ erro: true }): retry limpa cache e traz novo endereço", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ erro: true }) })
      .mockResolvedValueOnce(okPayload);
    global.fetch = fetchSpy as any;
    const onLookup = vi.fn();

    render(<Harness onLookup={onLookup} />);
    await typeCep(user);

    await waitFor(() => expect(screen.getByText(/CEP não encontrado/i)).toBeInTheDocument());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(onLookup).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    await vi.runAllTimersAsync();

    await waitFor(() => expect(onLookup).toHaveBeenCalledWith(expect.objectContaining({ logradouro: "Avenida Paulista" })));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // Mensagem de erro sumiu (não ficou grudada de estado anterior)
    expect(screen.queryByText(/CEP não encontrado/i)).not.toBeInTheDocument();
  });

  it("após erro de rede: retry refaz a chamada e finaliza com sucesso", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchSpy = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(okPayload);
    global.fetch = fetchSpy as any;
    const onLookup = vi.fn();

    render(<Harness onLookup={onLookup} />);
    await typeCep(user);

    await waitFor(() => expect(screen.getByText(/CEP não encontrado|Falha ao consultar CEP/i)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    await vi.runAllTimersAsync();

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    expect(onLookup).toHaveBeenCalledTimes(1);
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain(VALID_CEP);
    expect(urls[1]).toContain(VALID_CEP);
  });
});
