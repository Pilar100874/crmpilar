import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert: mocks.insert, update: mocks.update }) } }));
vi.mock("@/lib/estabelecimentoUtils", () => ({ getUserIdFromAuth: async () => "interno", getEstabelecimentoId: async () => "empresa" }));
import { iniciarRegistroResultados, registrarResultadoObservado, concluirRegistroResultados } from "./registrarResultados";
import type { ContactForBulkSend } from "../types";
describe("registro da jornada de disparos", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.insert.mockResolvedValue({error:null}); mocks.update.mockReturnValue({eq:mocks.eq});mocks.eq.mockResolvedValue({error:null}); });
  it("registra encaminhamento sem afirmar envio ou entrega no status legado", async () => {
    await registrarResultadoObservado("envio",{id:"cliente"} as ContactForBulkSend,{status:"encaminhado"});
    expect(mocks.insert.mock.calls[0][0]).toMatchObject({status:"pendente",resultado_observado:"encaminhado"});
  });
  it("retorno registrado não recebe horário de envio", async () => {
    await registrarResultadoObservado("envio",{id:"cliente"} as ContactForBulkSend,{status:"registrado"});
    expect(mocks.insert.mock.calls[0][0]).toMatchObject({resultado_observado:"registrado",enviado_em:null});
  });
  it("resolve o usuário interno antes de criar a execução", async () => {
    mocks.insert.mockReturnValue({select:()=>({single:async()=>({data:{id:"envio"},error:null})})});
    await iniciarRegistroResultados("whatsapp",3);
    expect(mocks.insert.mock.calls[0][0]).toMatchObject({usuario_id:"interno",status:"enviando",total_contatos:3});
  });
  it("conta só encaminhados e mantém o cancelamento", async () => {
    await concluirRegistroResultados("envio",[{status:"registrado"},{status:"encaminhado"},{status:"cancelado"}]);
    expect(mocks.update.mock.calls[0][0]).toMatchObject({contatos_enviados:1,status:"cancelado"});
  });
});