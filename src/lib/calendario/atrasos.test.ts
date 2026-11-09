import { describe, expect, it } from "vitest";
import { dataPrevistaAtraso, tarefaAtrasada, filtroRealocacaoDiaria, filtroPendenciasAtrasadas } from "./atrasos";

const agora = new Date(2026, 9, 23, 14, 0);
describe("tarefas atrasadas", () => {
  it("lista tarefa realocada para hoje e mostra a data prevista", () => {
    const t = { status: "pending", date: new Date(2026, 9, 23), dataOriginal: new Date(2026, 9, 20) };
    expect(tarefaAtrasada(t, agora)).toBe(true);
    expect(dataPrevistaAtraso(t)).toEqual(new Date(2026, 9, 20));
  });
  it("não lista tarefa concluída", () => {
    expect(tarefaAtrasada({ status: "completed", date: new Date(2026, 9, 26), dataOriginal: new Date(2026, 9, 20) }, agora)).toBe(false);
  });
  it("não lista tarefa futura nunca remarcada", () => {
    expect(tarefaAtrasada({ status: "pending", date: new Date(2026, 9, 26), dataOriginal: new Date(2026, 9, 26) }, agora)).toBe(false);
  });
  it("preserva retorno da próxima semana apesar do contato original passado", () => {
    expect(tarefaAtrasada({ status: "pending", date: new Date(2026, 9, 26), dataOriginal: new Date(2026, 9, 20) }, agora)).toBe(false);
  });
  it("realoca apenas datas atualmente vencidas", () => {
    expect(filtroRealocacaoDiaria('2026-10-23')).toBe('date.lt.2026-10-23');
  });
  it("não inclui datas futuras na consulta de atrasados", () => {
    expect(filtroPendenciasAtrasadas('2026-10-23')).toBe('date.lt.2026-10-23,and(date.eq.2026-10-23,data_original.lt.2026-10-23)');
  });
});
