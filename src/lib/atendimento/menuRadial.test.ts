import { describe, expect, it } from "vitest";
import { montarMenuRadial, type ContextoRadial } from "./menuRadial";
const vazio: ContextoRadial = { cliente: false, whatsapp: false, telefone: false, email: false, visita: false, historico: false, tarefa: false, agenda: false, orcamentos: false };
describe("menu radial do Atendimento", () => {
  it("sem cliente não oferece ações individuais", () => {
    expect(montarMenuRadial(vazio, []).map(i => i.id)).toEqual(["fila", "agenda", "disparo", "cadastro"]);
  });
  it("oculta atalhos sem endereço ou registros e canais ausentes", () => {
    const menu = montarMenuRadial({ ...vazio, cliente: true, email: true }, []);
    expect(menu.find(i => i.id === "cliente")?.subItems?.map(i => i.id)).toEqual(["cliente-email"]);
  });
  it("oferece somente os registros e canais existentes", () => {
    const menu = montarMenuRadial({ ...vazio, cliente: true, visita: true, tarefa: true, agenda: true }, []);
    expect(menu.find(i => i.id === "cliente")?.subItems?.map(i => i.id)).toEqual(["cliente-visita", "cliente-tarefa", "cliente-agenda"]);
  });
});