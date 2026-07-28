import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";
import { useState } from "react";
import { LookupStatusMessage, type LookupStatus, type LookupKind } from "./LookupStatusMessage";
import { CnpjField } from "./CnpjField";
import { CepField } from "./CepField";
import { clearCnpjCache } from "@/lib/cadastros/cnpjService";
import { clearCepCache } from "@/lib/cadastros/cepService";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } },
}));

// ------- Helpers -------
async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}

const cnpjOk = {
  ok: true,
  json: async () => ({
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
    bairro: "BELA VISTA",
    municipio: "SAO PAULO",
    uf: "SP",
    ddd_telefone_1: "1133334444",
    email: "contato@teste.com",
    cnaes_secundarios: [],
  }),
};
const cepOk = {
  ok: true,
  json: async () => ({
    cep: "01310-100",
    logradouro: "Avenida Paulista",
    complemento: "",
    bairro: "Bela Vista",
    localidade: "São Paulo",
    uf: "SP",
  }),
};

// ================= LookupStatusMessage =================
describe("LookupStatusMessage — axe + ARIA/textos por estado", () => {
  const STATUSES: LookupStatus[] = ["idle", "loading", "ok", "invalid", "notfound", "error", "cancelled"];
  const KINDS: LookupKind[] = ["cnpj", "cep"];

  for (const kind of KINDS) {
    describe(`kind=${kind}`, () => {
      it.each(STATUSES)("estado '%s' não tem violações axe", async (status) => {
        const { container } = render(
          <LookupStatusMessage kind={kind} status={status} onRetry={() => {}} />,
        );
        await expectNoA11yViolations(container);
      });

      it("loading: role=status, aria-live=polite, aria-busy=true e texto de carregamento", () => {
        render(<LookupStatusMessage kind={kind} status="loading" />);
        const region = screen.getByRole("status");
        expect(region).toHaveAttribute("aria-live", "polite");
        expect(region).toHaveAttribute("aria-busy", "true");
        expect(region).toHaveAttribute("aria-atomic", "true");
        expect(region).toHaveTextContent(kind === "cnpj" ? /Consultando CNPJ/i : /Consultando CEP/i);
        // prefixo sr-only com o rótulo
        expect(region).toHaveTextContent(new RegExp(`${kind.toUpperCase()}:`));
      });

      it("cancelled: role=status (polite), texto de cancelamento e botão de retry rotulado", () => {
        render(<LookupStatusMessage kind={kind} status="cancelled" onRetry={() => {}} />);
        const region = screen.getByRole("status");
        expect(region).toHaveAttribute("aria-live", "polite");
        expect(region).toHaveAttribute("aria-busy", "false");
        expect(region).toHaveTextContent(kind === "cnpj" ? /Consulta de CNPJ cancelada/i : /Consulta de CEP cancelada/i);
        const btn = screen.getByRole("button", { name: new RegExp(`Tentar novamente a consulta de ${kind.toUpperCase()}`, "i") });
        expect(btn).toBeInTheDocument();
      });

      it("error: role=alert (assertive) e texto de falha", () => {
        render(<LookupStatusMessage kind={kind} status="error" onRetry={() => {}} />);
        const region = screen.getByRole("alert");
        expect(region).toHaveAttribute("aria-live", "assertive");
        expect(region).toHaveTextContent(kind === "cnpj" ? /Falha ao consultar o CNPJ/i : /Falha ao consultar o CEP/i);
      });

      it("notfound: role=alert e mensagem específica de 'não encontrado'", () => {
        render(<LookupStatusMessage kind={kind} status="notfound" onRetry={() => {}} />);
        const region = screen.getByRole("alert");
        expect(region).toHaveAttribute("aria-live", "assertive");
        expect(region).toHaveTextContent(kind === "cnpj" ? /Nenhum resultado encontrado para este CNPJ/i : /CEP não encontrado/i);
      });

      it("invalid: role=alert (assertive)", () => {
        render(<LookupStatusMessage kind={kind} status="invalid" />);
        const region = screen.getByRole("alert");
        expect(region).toHaveAttribute("aria-live", "assertive");
      });
    });
  }

  it("transição loading → ok mantém a mesma região aria-live (anúncio incremental)", () => {
    function Wrap() {
      const [s, setS] = useState<LookupStatus>("loading");
      return (
        <>
          <button onClick={() => setS("ok")}>done</button>
          <LookupStatusMessage kind="cnpj" status={s} />
        </>
      );
    }
    render(<Wrap />);
    const loading = screen.getByRole("status");
    expect(loading).toHaveAttribute("aria-busy", "true");
    fireEvent.click(screen.getByText("done"));
    const okRegion = screen.getByRole("status");
    expect(okRegion).toHaveAttribute("aria-busy", "false");
    expect(okRegion).toHaveTextContent(/CNPJ encontrado/i);
  });
});

// ================= CnpjField integração + axe =================
describe("CnpjField — axe nos estados loading/erro/cancelamento", () => {
  const originalFetch = global.fetch;
  beforeEach(() => clearCnpjCache());
  afterEach(() => { global.fetch = originalFetch; vi.restoreAllMocks(); });

  function Harness() {
    const [v, setV] = useState("");
    return <CnpjField value={v} onChange={setV} />;
  }

  it("estado inicial (idle) não tem violações axe", async () => {
    const { container } = render(<Harness />);
    await expectNoA11yViolations(container);
  });

  it("durante loading: aria-invalid=false e sem violações axe", async () => {
    let resolveFetch!: (v: any) => void;
    global.fetch = vi.fn(() => new Promise((r) => { resolveFetch = r; })) as any;
    const { container } = render(<Harness />);
    fireEvent.change(screen.getByPlaceholderText("00.000.000/0000-00"), { target: { value: "11.222.333/0001-81" } });
    // aguarda 400ms do debounce → loading
    await new Promise((r) => setTimeout(r, 500));
    const input = screen.getByPlaceholderText("00.000.000/0000-00");
    expect(input).toHaveAttribute("aria-invalid", "false");
    await expectNoA11yViolations(container);
    await act(async () => { resolveFetch(cnpjOk); });
  });

  it("após not-found: mensagem visível, botão retry acessível e sem violações axe", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }) as any;
    const { container } = render(<Harness />);
    fireEvent.change(screen.getByPlaceholderText("00.000.000/0000-00"), { target: { value: "11.222.333/0001-81" } });
    await waitFor(() => expect(screen.getByText(/CNPJ não encontrado/i)).toBeInTheDocument(), { timeout: 2000 });
    // Botão de retry precisa ter nome acessível
    const retry = screen.getByRole("button", { name: /Tentar novamente/i });
    expect(retry).toHaveAccessibleName();
    await expectNoA11yViolations(container);
  });

  it("após erro de rede: aria-invalid=true no input e sem violações axe", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("down")) as any;
    const { container } = render(<Harness />);
    fireEvent.change(screen.getByPlaceholderText("00.000.000/0000-00"), { target: { value: "11.222.333/0001-81" } });
    await waitFor(() => expect(screen.getByText(/Falha ao consultar CNPJ|CNPJ não encontrado/i)).toBeInTheDocument(), { timeout: 2000 });
    const input = screen.getByPlaceholderText("00.000.000/0000-00");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    await expectNoA11yViolations(container);
  });
});

// ================= CepField integração + axe =================
describe("CepField — axe nos estados loading/erro", () => {
  const originalFetch = global.fetch;
  beforeEach(() => clearCepCache());
  afterEach(() => { global.fetch = originalFetch; vi.restoreAllMocks(); });

  function Harness() {
    const [v, setV] = useState("");
    return <CepField value={v} onChange={setV} />;
  }

  it("estado inicial (idle) não tem violações axe", async () => {
    const { container } = render(<Harness />);
    await expectNoA11yViolations(container);
  });

  it("após sucesso: input marcado como válido e sem violações axe", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(cepOk) as any;
    const { container } = render(<Harness />);
    fireEvent.change(screen.getByPlaceholderText("00000-000"), { target: { value: "01310-100" } });
    await waitFor(() => {
      const input = screen.getByPlaceholderText("00000-000");
      expect(input).toHaveAttribute("aria-invalid", "false");
    }, { timeout: 2000 });
    await expectNoA11yViolations(container);
  });

  it("após not-found: retry acessível e sem violações axe", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ erro: true }) }) as any;
    const { container } = render(<Harness />);
    fireEvent.change(screen.getByPlaceholderText("00000-000"), { target: { value: "01310-100" } });
    await waitFor(() => expect(screen.getByText(/CEP não encontrado/i)).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByRole("button", { name: /Tentar novamente/i })).toHaveAccessibleName();
    await expectNoA11yViolations(container);
  });

  it("após erro de rede: aria-invalid=true e sem violações axe", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("offline")) as any;
    const { container } = render(<Harness />);
    fireEvent.change(screen.getByPlaceholderText("00000-000"), { target: { value: "01310-100" } });
    await waitFor(() => expect(screen.getByText(/Falha ao consultar CEP|CEP não encontrado/i)).toBeInTheDocument(), { timeout: 2000 });
    const input = screen.getByPlaceholderText("00000-000");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    await expectNoA11yViolations(container);
  });
});
