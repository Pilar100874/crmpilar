import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LookupStatusMessage } from "./LookupStatusMessage";

// Cobre os 6 estados exigidos (loading, ok, invalid, notfound, error, cancelled)
// para os dois tipos de consulta (CNPJ e CEP) e valida a semântica acessível.
describe("LookupStatusMessage — CNPJ", () => {
  it("idle: renderiza container aria-live vazio (sem mensagem visível)", () => {
    const { container } = render(<LookupStatusMessage kind="cnpj" status="idle" />);
    const region = container.querySelector('[aria-live]')!;
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region.textContent?.trim()).toBe("");
  });

  it("loading: anuncia 'Consultando CNPJ…' com aria-busy e role=status", () => {
    render(<LookupStatusMessage kind="cnpj" status="loading" />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent(/CNPJ.*Consultando CNPJ/i);
  });

  it("ok: anuncia sucesso em role=status polite", () => {
    render(<LookupStatusMessage kind="cnpj" status="ok" />);
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent(/CNPJ encontrado/i);
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("invalid: usa role=alert assertive e não mostra botão de retry", () => {
    render(<LookupStatusMessage kind="cnpj" status="invalid" onRetry={vi.fn()} />);
    const region = screen.getByRole("alert");
    expect(region).toHaveAttribute("aria-live", "assertive");
    expect(region).toHaveTextContent(/CNPJ inválido/i);
    expect(screen.queryByRole("button", { name: /Tentar novamente/i })).not.toBeInTheDocument();
  });

  it("notfound: alerta com botão 'Tentar novamente' que chama onRetry", async () => {
    const onRetry = vi.fn();
    render(<LookupStatusMessage kind="cnpj" status="notfound" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/Nenhum resultado encontrado/i);
    const btn = screen.getByRole("button", { name: /Tentar novamente a consulta de CNPJ/i });
    await userEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("error: alerta assertivo com retry disponível", async () => {
    const onRetry = vi.fn();
    render(<LookupStatusMessage kind="cnpj" status="error" onRetry={onRetry} />);
    const region = screen.getByRole("alert");
    expect(region).toHaveAttribute("aria-live", "assertive");
    expect(region).toHaveTextContent(/Falha ao consultar o CNPJ/i);
    await userEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("cancelled: role=status polite, permite retry", () => {
    render(<LookupStatusMessage kind="cnpj" status="cancelled" onRetry={vi.fn()} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent(/Consulta de CNPJ cancelada/i);
    expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
  });
});

describe("LookupStatusMessage — CEP", () => {
  it.each([
    ["loading", /Consultando CEP/i, "status"],
    ["ok", /Endereço preenchido a partir do CEP/i, "status"],
    ["invalid", /CEP incompleto/i, "alert"],
    ["notfound", /CEP não encontrado/i, "alert"],
    ["error", /Falha ao consultar o CEP/i, "alert"],
    ["cancelled", /Consulta de CEP cancelada/i, "status"],
  ] as const)("estado %s renderiza mensagem apropriada em role=%s", (status, msg, role) => {
    render(<LookupStatusMessage kind="cep" status={status} onRetry={vi.fn()} />);
    const region = screen.getByRole(role);
    expect(region).toHaveTextContent(msg);
    expect(region).toHaveTextContent(/CEP/); // prefixo sr-only
  });
});
