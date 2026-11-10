import { describe, it, expect } from "vitest";
import { periodoAnterior, totalJornada, variacaoJornada, serieJornada } from "./jornada";
const diarios = [
  { usuario_id: "u1", dia: "2026-11-09", metrica: "ligacoes_atendidas", valor: 3 },
  { usuario_id: "u2", dia: "2026-11-09", metrica: "ligacoes_atendidas", valor: 7 },
  { usuario_id: "u1", dia: "2026-11-09", metrica: "massa_whatsapp_retornos", valor: 8 },
  { usuario_id: "u1", dia: "2026-11-09", metrica: "pedidos_fechados", valor: 2 },
  { usuario_id: "u1", dia: "2026-11-09", metrica: "valor_vendas", valor: 12000 },
];
describe("jornada de trabalho", () => {
  it("compara cada usuário sem atribuir ações de outro", () => {
    expect(totalJornada(diarios,"ligacoes_atendidas","2026-11-09","2026-11-09","u1")).toBe(3);
    expect(totalJornada(diarios,"ligacoes_atendidas","2026-11-09","2026-11-09","u2")).toBe(7);
  });
  it("não conta retorno agendado como WhatsApp encaminhado", () => {
    expect(totalJornada(diarios,"massa_whatsapp_encaminhado","2026-11-09","2026-11-09")).toBe(0);
  });
  it("soma pedidos e valores separadamente", () => {
    expect(totalJornada(diarios,"pedidos_fechados","2026-11-09","2026-11-09")).toBe(2);
    expect(totalJornada(diarios,"valor_vendas","2026-11-09","2026-11-09")).toBe(12000);
  });
  it("comparação usa período anterior de igual duração", () => {
    expect(periodoAnterior("2026-11-01","2026-11-09")).toEqual({inicio:"2026-10-23",fim:"2026-10-31"});
  });
  it("evolução mensal inclui dias sem atividade", () => {
    expect(serieJornada(diarios,"ligacoes_atendidas","2026-10-31","2026-11-10","u1",true).map(d=>d.valor)).toEqual([0,3]);
  });
  it("não inventa percentual quando não há base anterior", () => {
    expect(variacaoJornada(8,0)).toBeNull(); expect(variacaoJornada(6,3)).toBe(100);
  });
});