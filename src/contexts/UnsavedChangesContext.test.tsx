import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, Link, Route, Routes, useNavigate } from "react-router-dom";
import { useState } from "react";
import { UnsavedChangesProvider, useEtapasPendentes } from "./UnsavedChangesContext";
import { lerRascunhoVistoria, useRascunhoVistoria } from "@/lib/cv/rascunhoVistoria";
import { instalarProtecaoHistorico, instalarProtecaoNavegacao } from "@/lib/navigationGuard";

afterEach(() => { cleanup(); sessionStorage.clear(); window.history.replaceState({ idx: 0 }, "", "/etapas"); });

function Formulario() {
  const nav = useNavigate();
  const [dados, setDados] = useState("");
  const [etapa, setEtapa] = useState(0);
  useEtapasPendentes("teste", !!dados, "Vistoria");
  useRascunhoVistoria("teste", { dados, etapa }, !!dados);
  return <><input aria-label="Dados" value={dados} onChange={e => setDados(e.target.value)} /><output data-testid="etapa">{etapa}</output><button onClick={() => setEtapa(2)}>Avançar</button><button onClick={() => nav("/outro")}>Outro módulo</button><button onClick={() => nav("/etapas?busca=1")}>Consulta interna</button><Link to="/outro">Menu</Link></>;
}
function montar() {
  window.history.replaceState({ idx: 0 }, "", "/etapas");
  return render(<BrowserRouter><UnsavedChangesProvider><Routes><Route path="/etapas" element={<Formulario />} /><Route path="/outro" element={<Link to="/etapas">Voltar ao formulário</Link>} /></Routes></UnsavedChangesProvider></BrowserRouter>);
}
function preencher() {
  fireEvent.change(screen.getByLabelText("Dados"), { target: { value: "12345" } });
  fireEvent.click(screen.getByText("Avançar"));
}

describe("Saída de telas por etapas", () => {
  it("Proteção de Voltar pode interromper o evento antes de desmontar o formulário", () => {
    const posterior = vi.fn();
    const remover = instalarProtecaoHistorico(event => event.stopImmediatePropagation());
    window.addEventListener("popstate", posterior);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(posterior).not.toHaveBeenCalled();
    remover();
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(posterior).toHaveBeenCalledTimes(1);
    window.removeEventListener("popstate", posterior);
  });
  it("Cancelar mantém os dados digitados e a etapa atual", () => {
    montar(); preencher(); fireEvent.click(screen.getByText("Outro módulo"));
    expect(window.location.pathname).toBe("/etapas");
    fireEvent.click(screen.getByText("Cancelar"));
    expect(screen.getByLabelText("Dados")).toHaveValue("12345");
    expect(screen.getByTestId("etapa")).toHaveTextContent("2");
  });
  it("Confirmar pelo menu descarta o rascunho e o retorno inicia vazio na etapa zero", async () => {
    montar(); preencher();
    expect(lerRascunhoVistoria("teste")).toEqual({ dados: "12345", etapa: 2 });
    fireEvent.click(screen.getByText("Menu")); fireEvent.click(screen.getByText("Sair sem salvar"));
    await waitFor(() => expect(window.location.pathname).toBe("/outro"));
    expect(sessionStorage.getItem("vistoria-rascunho:teste")).toBeNull();
    fireEvent.click(screen.getByText("Voltar ao formulário"));
    expect(screen.getByLabelText("Dados")).toHaveValue("");
    expect(screen.getByTestId("etapa")).toHaveTextContent("0");
  });
  it("Navegação por botão também exige confirmação", () => {
    montar(); preencher(); fireEvent.click(screen.getByText("Outro módulo"));
    expect(window.location.pathname).toBe("/etapas");
    fireEvent.click(screen.getByText("Sair sem salvar"));
    expect(window.location.pathname).toBe("/outro");
  });
  it("Consulta na mesma tela não descarta preenchimento", () => {
    montar(); preencher(); fireEvent.click(screen.getByText("Consulta interna"));
    expect(window.location.search).toBe("?busca=1");
    expect(screen.getByLabelText("Dados")).toHaveValue("12345");
  });
  it("Rascunhos de outra rota ou do formato antigo não são restaurados", () => {
    sessionStorage.setItem("vistoria-rascunho:teste", JSON.stringify({ rota: "/outra", estado: { etapa: 3 } }));
    expect(lerRascunhoVistoria("teste")).toBeNull();
    sessionStorage.setItem("vistoria-rascunho:teste", JSON.stringify({ step: 4 }));
    expect(lerRascunhoVistoria("teste")).toBeNull();
  });
  it("Sem alterações não bloqueia a troca de módulo", () => {
    montar(); fireEvent.click(screen.getByText("Outro módulo"));
    expect(window.location.pathname).toBe("/outro");
  });
  it("Protege push, replace e go, e restaura métodos no encerramento", () => {
    const nav = { push: vi.fn(), replace: vi.fn(), go: vi.fn() };
    const original = nav.go;
    const continuar: (() => void)[] = [];
    const restaurar = instalarProtecaoNavegacao(nav, fn => { continuar.push(fn); return true; });
    nav.push("/outro"); nav.replace("/outro"); nav.go(-1);
    expect(original).not.toHaveBeenCalled();
    expect(continuar).toHaveLength(3);
    continuar[2](); expect(original).toHaveBeenCalledWith(-1);
    restaurar(); expect(nav.go).toBe(original);
  });
});