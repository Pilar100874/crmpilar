import { describe, it, expect } from "vitest";
import { lerNfeXml } from "./nfeXml";

const xml = `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe35261112345678000199550010000001231000001234">
<ide><natOp>Venda</natOp><serie>1</serie><nNF>123</nNF><dhEmi>2026-11-10T10:00:00-03:00</dhEmi></ide>
<emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor X</xNome><enderEmit><UF>SP</UF></enderEmit></emit>
<dest><CNPJ>99999999000100</CNPJ></dest>
<det nItem="1"><prod><cProd>AB1</cProd><cEAN>SEM GTIN</cEAN><xProd>Papel</xProd><NCM>48181000</NCM><CFOP>5102</CFOP><uCom>CX</uCom><qCom>2.0000</qCom><vUnCom>50.00</vUnCom><vProd>100.00</vProd></prod>
<imposto><ICMS><ICMS00><CST>00</CST><pICMS>18.00</pICMS><vICMS>18.00</vICMS></ICMS00></ICMS></imposto></det>
<total><ICMSTot><vProd>100.00</vProd><vICMS>18.00</vICMS><vNF>100.00</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;

describe("leitura do XML da NF-e", () => {
  it("extrai chave, emitente, itens e totais", () => {
    const n = lerNfeXml(xml);
    expect(n.chave).toBe("35261112345678000199550010000001231000001234");
    expect(n.emitente).toEqual({ cnpj: "12345678000199", nome: "Fornecedor X", uf: "SP" });
    expect(n.itens[0]).toMatchObject({ codigo: "AB1", quantidade: 2, valorUnitario: 50, cst: "00", valorIcms: 18, ean: undefined });
    expect(n.totais.nota).toBe(100);
  });
  it("recusa arquivo que não é NF-e", () => { expect(() => lerNfeXml("<a/>")).toThrow(); });
});
