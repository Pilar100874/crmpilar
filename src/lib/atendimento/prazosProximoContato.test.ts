import { beforeEach, describe, expect, it } from "vitest";
import { addDays, format } from "date-fns";
import {
  PRAZOS_PADRAO,
  dataPadraoProximoContato,
  lerPrazos,
  origemDoCanalMassa,
  salvarPrazos,
} from "./prazosProximoContato";

describe("data padrão do próximo contato no disparo em massa", () => {
  beforeEach(() => localStorage.clear());

  it("usa 1 dia como padrão para e-mail e WhatsApp", () => {
    expect(lerPrazos().massa_email).toBe(1);
    expect(lerPrazos().massa_whatsapp).toBe(1);
  });

  it("sugere a data de amanhã no disparo, qualquer que seja o canal", () => {
    const amanha = format(addDays(new Date(), 1), "yyyy-MM-dd");
    expect(format(dataPadraoProximoContato("massa_email"), "yyyy-MM-dd")).toBe(amanha);
    expect(format(dataPadraoProximoContato("massa_whatsapp"), "yyyy-MM-dd")).toBe(amanha);
    expect(format(dataPadraoProximoContato(origemDoCanalMassa("email")), "yyyy-MM-dd")).toBe(amanha);
    expect(format(dataPadraoProximoContato(origemDoCanalMassa("whatsapp")), "yyyy-MM-dd")).toBe(amanha);
    expect(format(dataPadraoProximoContato(origemDoCanalMassa(null)), "yyyy-MM-dd")).toBe(amanha);
  });

  it("mantém 1 dia no disparo mesmo depois de salvar outros prazos", () => {
    salvarPrazos({ ...PRAZOS_PADRAO, massa_email: 9, massa_whatsapp: 12 });
    expect(lerPrazos().massa_email).toBe(1);
    expect(lerPrazos().massa_whatsapp).toBe(1);
  });

  it("continua lendo o prazo de finalização salvo pelo usuário", () => {
    salvarPrazos({ ...PRAZOS_PADRAO, finalizar_atendimento: 7 });
    expect(lerPrazos().finalizar_atendimento).toBe(7);
    expect(format(dataPadraoProximoContato("finalizar_atendimento"), "yyyy-MM-dd"))
      .toBe(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  });
});
