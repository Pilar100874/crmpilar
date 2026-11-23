import { describe,it,expect } from "vitest";
import { novoRascunho,totaisDocumento,validarRascunho,faltasTributacao,validarInutilizacao } from "./documentoFiscal";
describe("Documento fiscal",()=>{
  it("não transforma imposto ausente em autorização para emitir",()=>{ expect(faltasTributacao({cfop:"5102"})).toContain("classificação PIS"); });
  it("requer todos os grupos essenciais sem inventar alíquotas",()=>{ expect(faltasTributacao({cfop:"5102",icms:{csosn:"102"},pis:{cst:"49"},cofins:{cst:"49"}})).toEqual([]); });
  it("inclui IPI e ST mas não soma ICMS próprio novamente ao total",()=>{ expect(totaisDocumento([{produto_id:"p",descricao:"A",ncm:"12345678",unidade:"kg",quantidade:2,valor_unitario:100,desconto:10,frete:5,seguro:2,outras:3,tributacao:{icms:{valor:36},ipi:{valor:10},st:{valor:20}}}]).total).toBe(230); });
  it("bloqueia devolução sem nota referenciada",()=>{expect(validarRascunho({...novoRascunho(),finalidade_emissao:4})).toContain("Devolução exige referência à nota original.");});
  it("valida intervalo e justificativa da inutilização",()=>{ expect(validarInutilizacao(10,9,"Justificativa válida para teste")).toBe("Informe um intervalo válido de numeração.");expect(validarInutilizacao(1,2,"curta")).toBe("A justificativa deve ter entre 15 e 255 caracteres."); expect(validarInutilizacao(1,2,"Numeração não utilizada nesta série")).toBeNull(); });
});
describe("campos obrigatórios da NF-e",()=>{
  it("exige tipo de operação",()=>{expect(validarRascunho(novoRascunho())).toContain("Escolha o tipo de operação.");});
  it("não aceita saída antes da emissão",()=>{expect(validarRascunho({...novoRascunho(),data_emissao:"2026-11-20",data_saida:"2026-11-19"})).toContain("A data de saída não pode ser anterior à emissão.");});
});
