import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

function fillCep() {
  const input = screen.getByPlaceholderText("00000-000") as HTMLInputElement;
  fireEvent.change(input, { target: { value: VALID_MASKED } });
}

describe("CepField — botão 'Tentar novamente' (integração)", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { clearCepCache(); });
  afterEach(() => { global.fetch = originalFetch; vi.restoreAllMocks(); });

  it("após not-found ({ erro: true }): retry limpa cache e traz novo endereço", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ erro: true }) })
      .mockResolvedValueOnce(okPayload);
    global.fetch = fetchSpy as any;
    const onLookup = vi.fn();

    render(<Harness onLookup={onLookup} />);
    fillCep();

    await waitFor(() => expect(screen.getByText(/CEP não encontrado/i)).toBeInTheDocument(), { timeout: 2000 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(onLookup).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));

    await waitFor(() => expect(onLookup).toHaveBeenCalledWith(expect.objectContaining({ logradouro: "Avenida Paulista" })), { timeout: 2000 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/CEP não encontrado/i)).not.toBeInTheDocument();
  });

  it("após erro de rede: retry refaz a chamada e finaliza com sucesso", async () => {
    const fetchSpy = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(okPayload);
    global.fetch = fetchSpy as any;
    const onLookup = vi.fn();

    render(<Harness onLookup={onLookup} />);
    fillCep();

    await waitFor(
      () => expect(screen.getByText(/CEP não encontrado|Falha ao consultar CEP/i)).toBeInTheDocument(),
      { timeout: 2000 },
    );

    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2), { timeout: 2000 });
    expect(onLookup).toHaveBeenCalledTimes(1);
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain(VALID_CEP);
    expect(urls[1]).toContain(VALID_CEP);
  });
});
