import { describe, expect, it } from "vitest";
import { avisoMisturaDiaTodo, detectarDestinoCalendario, prepararMovimento } from "./movimentacao";

const regras = { bloquear_datas_passadas: true, bloquear_horarios_passados: true, realocacao_diaria: false };
const agora = new Date(2026, 9, 23, 13, 43);
describe("movimentação do calendário", () => {
  it("move tarefas de meses diferentes para a mesma data escolhida sem alterar horários", () => {
    const destino = new Date(2026, 10, 5);
    for (const date of [new Date(2026, 9, 23), new Date(2026, 11, 1)]) {
      expect(prepararMovimento({ date, time: "15:30" }, destino, regras, agora)).toEqual({ date: destino, time: "15:30" });
    }
  });
  it("preserva o bloqueio de datas passadas", () => {
    expect(prepararMovimento({ date: agora }, new Date(2026, 9, 22), regras, agora)).toBeNull();
  });
  it("preserva a realocação sem horário", () => {
    expect(prepararMovimento({ date: agora, time: "15:30" }, new Date(2026, 10, 5), { ...regras, realocacao_diaria: true }, agora)?.time).toBe("");
  });
  it("usa a data sob o cursor, mesmo com um cartão largo sobre a data vizinha", () => {
    const containers = [
      { id: "2026-11-05", data: { current: { date: new Date(2026, 10, 5) } } },
      { id: "2026-11-06", data: { current: { date: new Date(2026, 10, 6) } } },
      { id: "tarefa", data: { current: { task: {} } } },
    ];
    const rect = (left: number) => ({ left, top: 0, right: left + 100, bottom: 100, width: 100, height: 100 });
    const args = { pointerCoordinates: { x: 125, y: 50 }, droppableContainers: containers, droppableRects: new Map([[containers[0].id, rect(0)], [containers[1].id, rect(100)], [containers[2].id, rect(100)]]), collisionRect: rect(0) };
    expect(detectarDestinoCalendario(args as unknown as Parameters<typeof detectarDestinoCalendario>[0]).map(c => c.id)).toEqual(["2026-11-06"]);
  });
  it("não move quando o cursor está fora das datas", () => {
    expect(detectarDestinoCalendario({ pointerCoordinates: { x: 999, y: 999 }, droppableContainers: [], droppableRects: new Map() } as unknown as Parameters<typeof detectarDestinoCalendario>[0])).toEqual([]);
  });
});