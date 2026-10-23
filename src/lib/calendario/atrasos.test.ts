import { describe, expect, it } from "vitest";
import { dataPrevistaAtraso, tarefaAtrasada } from "./atrasos";

const agora = new Date(2026, 9, 23, 14, 0);
describe("tarefas atrasadas", () => {
  it("lista tarefa movida automaticamente para frente e mostra a data prevista", () => {
    const t = { status: "pending", date: new Date(2026, 9, 26), dataOriginal: new Date(2026, 9, 20) };
    expect(tarefaAtrasada(t, agora)).toBe(true);
    expect(dataPrevistaAtraso(t)).toEqual(new Date(2026, 9, 20));
  });
  it("não lista tarefa concluída", () => {
    expect(tarefaAtrasada({ status: "completed", date: new Date(2026, 9, 26), dataOriginal: new Date(2026, 9, 20) }, agora)).toBe(false);
  });
  it("não lista tarefa futura nunca remarcada", () => {
    expect(tarefaAtrasada({ status: "pending", date: new Date(2026, 9, 26), dataOriginal: new Date(2026, 9, 26) }, agora)).toBe(false);
  });
});
