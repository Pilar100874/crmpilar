export interface ItemNfe {
  codigo: string; descricao: string; ean?: string; ncm?: string; cfop?: string; cst?: string; unidade?: string;
  quantidade: number; valorUnitario: number; valorTotal: number;
  aliqIcms: number; valorIcms: number; aliqIpi: number; valorIpi: number; aliqPis: number; valorPis: number; aliqCofins: number; valorCofins: number;
}
export interface Nfe {
  chave: string; numero: string; serie: string; dataEmissao: string; naturezaOperacao: string;
  emitente: { cnpj: string; nome: string; uf: string }; destinatarioCnpj: string;
  itens: ItemNfe[]; totais: { produtos: number; frete: number; desconto: number; icms: number; icmsSt: number; ipi: number; pis: number; cofins: number; nota: number };
}
const num = (s?: string | null) => (s ? Number(s.replace(",", ".")) || 0 : 0);
const pega = (el: Element | Document | null | undefined, tag: string): Element | null => (el ? el.getElementsByTagNameNS("*", tag)[0] ?? el.getElementsByTagName(tag)[0] ?? null : null);
const txt = (el: Element | Document | null | undefined, tag: string) => pega(el, tag)?.textContent?.trim() ?? "";

/** Lê o XML de uma NF-e (procNFe ou NFe) e devolve cabeçalho, itens e totais. */
export function lerNfeXml(xml: string): Nfe {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Arquivo XML inválido");
  const inf = pega(doc, "infNFe");
  if (!inf) throw new Error("O arquivo não é uma NF-e (infNFe não encontrado)");
  const ide = pega(inf, "ide"), emit = pega(inf, "emit"), dest = pega(inf, "dest"), tot = pega(inf, "ICMSTot");
  const itens = Array.from(inf.getElementsByTagNameNS("*", "det")).map((det) => {
    const prod = pega(det, "prod"), icms = pega(det, "ICMS"), ipi = pega(det, "IPITrib"), pis = pega(det, "PIS"), cof = pega(det, "COFINS");
    const ean = txt(prod, "cEAN");
    return {
      codigo: txt(prod, "cProd"), descricao: txt(prod, "xProd"), ean: ean && ean !== "SEM GTIN" ? ean : undefined,
      ncm: txt(prod, "NCM"), cfop: txt(prod, "CFOP"), cst: txt(icms, "CST") || txt(icms, "CSOSN"), unidade: txt(prod, "uCom"),
      quantidade: num(txt(prod, "qCom")), valorUnitario: num(txt(prod, "vUnCom")), valorTotal: num(txt(prod, "vProd")),
      aliqIcms: num(txt(icms, "pICMS")), valorIcms: num(txt(icms, "vICMS")), aliqIpi: num(txt(ipi, "pIPI")), valorIpi: num(txt(ipi, "vIPI")),
      aliqPis: num(txt(pis, "pPIS")), valorPis: num(txt(pis, "vPIS")), aliqCofins: num(txt(cof, "pCOFINS")), valorCofins: num(txt(cof, "vCOFINS")),
    };
  });
  return {
    chave: (inf.getAttribute("Id") ?? "").replace(/^NFe/, ""), numero: txt(ide, "nNF"), serie: txt(ide, "serie"),
    dataEmissao: (txt(ide, "dhEmi") || txt(ide, "dEmi")).slice(0, 10), naturezaOperacao: txt(ide, "natOp"),
    emitente: { cnpj: txt(emit, "CNPJ") || txt(emit, "CPF"), nome: txt(emit, "xNome"), uf: txt(pega(emit, "enderEmit"), "UF") },
    destinatarioCnpj: txt(dest, "CNPJ") || txt(dest, "CPF"), itens,
    totais: { produtos: num(txt(tot, "vProd")), frete: num(txt(tot, "vFrete")), desconto: num(txt(tot, "vDesc")), icms: num(txt(tot, "vICMS")),
      icmsSt: num(txt(tot, "vST")), ipi: num(txt(tot, "vIPI")), pis: num(txt(tot, "vPIS")), cofins: num(txt(tot, "vCOFINS")), nota: num(txt(tot, "vNF")) },
  };
}
