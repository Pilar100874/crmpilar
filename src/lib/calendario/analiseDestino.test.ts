import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { analisarDestino } from "./analiseDestino";

describe("prévia de destino", () => {
  it("analisa sábado e segunda ocupada antes de sugerir terça", async () => {
    const analise = await analisarDestino(new Date(2026, 9, 24), async data => ({
      hasTask: format(data, "yyyy-MM-dd") === "2026-10-26", taskTitle: "Dia todo",
    }));
    expect(format(analise.proximoDiaUtil, "yyyy-MM-dd")).toBe("2026-10-26");
    expect(analise.ocupados.map(item => format(item.data, "yyyy-MM-dd"))).toEqual(["2026-10-26"]);
    expect(analise.sugerida && format(analise.sugerida, "yyyy-MM-dd")).toBe("2026-10-27");
  });
  it("sugere segunda quando ela não possui tarefa de dia todo", async () => {
    const analise = await analisarDestino(new Date(2026, 9, 24), async () => ({ hasTask: false }));
    expect(analise.ocupados).toHaveLength(0);
    expect(analise.sugerida && format(analise.sugerida, "yyyy-MM-dd")).toBe("2026-10-26");
  });
});