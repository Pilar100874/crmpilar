import { describe, it, expect } from "vitest";
import { numeroEscuta, chamadaAoVivo } from "./monitorAoVivo";

describe("monitor ao vivo", () => {
  it("monta código de escuta + ramal da IA", () => {
    expect(numeroEscuta("*54", "7001")).toBe("*547001");
  });
  it("sem código de escuta não disca", () => {
    expect(numeroEscuta("", "7001")).toBeNull();
  });
  it("só ligações em andamento entram no monitor", () => {
    expect(chamadaAoVivo({ status: "em_andamento", modo: "ligar" })).toBe(true);
    expect(chamadaAoVivo({ status: "finalizada", modo: "ligar" })).toBe(false);
    expect(chamadaAoVivo({ status: "em_andamento", modo: "assistir" })).toBe(false);
  });
});
