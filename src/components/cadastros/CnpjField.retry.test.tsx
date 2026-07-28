import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { CnpjField } from "./CnpjField";
import { clearCnpjCache } from "@/lib/cadastros/cnpjService";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } },
}));

const VALID_CNPJ = "11222333000181";
const VALID_MASKED = "11.222.333/0001-81";

const makeOk = (razao: string) => ({
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
});

function Harness({ onLookup }: { onLookup: (r: any) => void }) {
  const [value, setValue] = useState("");
  return <CnpjField value={value} onChange={setValue} onLookup={onLookup} />;
}

function fillCnpj() {
  const input = screen.getByPlaceholderText("00.000.000/0000-00") as HTMLInputElement;
  fireEvent.change(input, { target: { value: VALID_MASKED } });
}

describe("CnpjField — botão 'Tentar novamente' (integração)", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { clearCnpjCache(); });
  afterEach(() => { global.fetch = originalFetch; vi.restoreAllMocks(); });

  it("após not-found: retry limpa cache, refaz fetch e substitui o resultado anterior", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce(makeOk("ACME LTDA"));
    global.fetch = fetchSpy as any;
    const onLookup = vi.fn();

    render(<Harness onLookup={onLookup} />);
    fillCnpj();

    await waitFor(() => expect(screen.getByText(/CNPJ não encontrado/i)).toBeInTheDocument(), { timeout: 2000 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(onLookup).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2), { timeout: 2000 });
    await waitFor(() => expect(onLookup).toHaveBeenCalledTimes(1));
    expect(onLookup.mock.calls[0][0].razaoSocial).toBe("ACME LTDA");
    expect(screen.queryByText(/CNPJ não encontrado/i)).not.toBeInTheDocument();
  });

  it("após erro de rede: retry limpa estado e produz sucesso na 2ª tentativa", async () => {
    const fetchSpy = vi.fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(makeOk("BACK ONLINE"));
    global.fetch = fetchSpy as any;
    const onLookup = vi.fn();

    render(<Harness onLookup={onLookup} />);
    fillCnpj();

    await waitFor(
      () => expect(screen.getByText(/CNPJ não encontrado|Falha ao consultar CNPJ/i)).toBeInTheDocument(),
      { timeout: 2000 },
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));

    await waitFor(() => expect(onLookup).toHaveBeenCalledWith(expect.objectContaining({ razaoSocial: "BACK ONLINE" })), { timeout: 2000 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retry emite uma nova requisição HTTP para o mesmo CNPJ (cache realmente foi limpo)", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce(makeOk("SEGUNDA CHAMADA"));
    global.fetch = fetchSpy as any;

    render(<Harness onLookup={vi.fn()} />);
    fillCnpj();
    await waitFor(() => expect(screen.getByText(/CNPJ não encontrado/i)).toBeInTheDocument(), { timeout: 2000 });

    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2), { timeout: 2000 });
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain(VALID_CNPJ);
    expect(urls[1]).toContain(VALID_CNPJ);
  });
});
