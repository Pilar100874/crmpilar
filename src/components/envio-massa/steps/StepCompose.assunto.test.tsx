import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepCompose } from "./StepCompose";
import type { ContentItem } from "../types";

const baseProps = {
  quickReplies: [],
  groupedReplies: {},
  templates: [],
  media: [],
  onContentChange: vi.fn(),
  onUploadMedia: vi.fn(async () => null),
  onBack: vi.fn(),
  onNext: vi.fn(),
};

const itemTexto: ContentItem = {
  id: "t1",
  type: "text",
  content: "Olá {{contato}}",
};

describe("StepCompose — assunto do e-mail obrigatório", () => {
  it("com item pronto e assunto vazio, Continuar fica desabilitado e avisa", () => {
    render(<StepCompose {...baseProps} canal="email" contentItems={[itemTexto]} />);
    const avancar = screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement;
    expect(avancar.disabled).toBe(true);
    expect(screen.getByText("Informe o assunto para avançar.")).toBeTruthy();
    expect(screen.getByText(/obrigatório/)).toBeTruthy();
  });

  it("preencher o assunto habilita Continuar", () => {
    render(<StepCompose {...baseProps} canal="email" contentItems={[itemTexto]} />);
    const campo = screen.getByLabelText(/Assunto do e-mail/);
    fireEvent.change(campo, { target: { value: "Novidades de outubro" } });
    const avancar = screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement;
    expect(avancar.disabled).toBe(false);
  });

  it("sem itens, Continuar segue desabilitado mesmo com assunto", () => {
    render(<StepCompose {...baseProps} canal="email" contentItems={[]} />);
    const campo = screen.getByLabelText(/Assunto do e-mail/);
    fireEvent.change(campo, { target: { value: "Novidades de outubro" } });
    const avancar = screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement;
    expect(avancar.disabled).toBe(true);
  });
});
