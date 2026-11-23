import jsPDF from "jspdf";
/** Padrões Code 128 (valores 0–106). */
const P="212222,222122,222221,121223,121322,131222,122213,122312,132212,221213,221312,231212,112232,122132,122231,113222,123122,123221,223211,221132,221231,213212,223112,312131,311222,321122,321221,312212,322112,322211,212123,212321,232121,111323,131123,131321,112313,132113,132311,211313,231113,231311,112133,112331,132131,113123,113321,133121,313121,211331,231131,213113,213311,213131,311123,311321,331121,312113,312311,332111,314111,221411,431111,111224,111422,121124,121421,141122,141221,112214,112412,122114,122411,142112,142211,241211,221114,413111,241112,134111,111242,121142,121241,114212,124112,124211,411212,421112,421211,212141,214121,412121,111143,111341,131141,114113,114311,411113,411311,113141,114131,311141,411131,211412,211214,211232,2331112".split(",");
/** Sequência de barras Code 128-C para dígitos em pares (chave de 44 dígitos). */
export function code128c(d: string): string {
  if (!/^\d+$/.test(d) || d.length % 2) throw new Error("Code 128-C exige quantidade par de dígitos");
  const v = [105, ...d.match(/\d\d/g)!.map(Number)];
  const ck = v.reduce((s, x, i) => s + x * (i || 1), 0) % 103;
  return [...v, ck, 106].map((x) => P[x]).join("");
}
const tx = (el: Element | Document | null | undefined, t: string) => (el?.getElementsByTagNameNS("*", t)[0]?.textContent ?? "").trim();
const brl = (v: string) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** DANFE retrato a partir do XML autorizado (nfeProc). Sem protocolo, marca como sem valor fiscal. */
export function gerarDanfe(xml: string): jsPDF {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const inf = doc.getElementsByTagNameNS("*", "infNFe")[0]; if (!inf) throw new Error("XML sem NF-e");
  const chave = (inf.getAttribute("Id") ?? "").replace("NFe", "");
  const ide = inf.getElementsByTagNameNS("*", "ide")[0], emit = inf.getElementsByTagNameNS("*", "emit")[0], dest = inf.getElementsByTagNameNS("*", "dest")[0], tot = inf.getElementsByTagNameNS("*", "ICMSTot")[0];
  const prot = doc.getElementsByTagNameNS("*", "infProt")[0]; const autorizado = tx(prot, "cStat") === "100";
  const homolog = tx(ide, "tpAmb") === "2";
  const pdf = new jsPDF({ unit: "mm", format: "a4" }); const W = 210, M = 7; let y = M;
  const caixa = (x: number, yy: number, w: number, h: number, rot: string, val: string, tam = 8) => { pdf.rect(x, yy, w, h); pdf.setFontSize(5.5); pdf.text(rot.toUpperCase(), x + 1, yy + 2.5); pdf.setFontSize(tam); pdf.text(pdf.splitTextToSize(val || "", w - 2).slice(0, Math.max(1, Math.floor((h - 3) / 3.5))), x + 1, yy + 6); };
  pdf.setFont("helvetica", "normal");
  caixa(M, y, 120, 26, "Emitente", `${tx(emit, "xNome")}\n${tx(emit, "xLgr")}, ${tx(emit, "nro")} - ${tx(emit, "xBairro")}\n${tx(emit, "xMun")}/${tx(emit, "UF")} CEP ${tx(emit, "CEP")}`, 9);
  pdf.rect(M + 120, y, 25, 26); pdf.setFontSize(12); pdf.text("DANFE", M + 125, y + 6); pdf.setFontSize(6); pdf.text(["Documento auxiliar", "da Nota Fiscal", "Eletrônica", "1 - Saída", `Nº ${tx(ide, "nNF")}`, `Série ${tx(ide, "serie")}`], M + 122, y + 10);
  pdf.rect(M + 145, y, W - 2 * M - 145, 26);
  const barras = code128c(chave); let bx = M + 147; const larg = (W - 2 * M - 149) / barras.split("").reduce((s, c) => s + Number(c), 0);
  barras.split("").forEach((c, i) => { const w = Number(c) * larg; if (i % 2 === 0) pdf.rect(bx, y + 2, w, 11, "F"); bx += w; });
  pdf.setFontSize(6); pdf.text("CHAVE DE ACESSO", M + 147, y + 16); pdf.setFontSize(7); pdf.text(chave.replace(/(\d{4})/g, "$1 ").trim(), M + 147, y + 19.5);
  pdf.setFontSize(6); pdf.text(autorizado ? `Protocolo ${tx(prot, "nProt")} ${tx(prot, "dhRecbto")}` : "SEM PROTOCOLO DE AUTORIZAÇÃO", M + 147, y + 23.5); y += 27;
  caixa(M, y, 120, 9, "Natureza da operação", tx(ide, "natOp")); caixa(M + 120, y, W - 2 * M - 120, 9, "Inscrição estadual", tx(emit, "IE")); y += 10;
  caixa(M, y, 60, 9, "CNPJ", tx(emit, "CNPJ")); caixa(M + 60, y, 60, 9, "Data de emissão", tx(ide, "dhEmi").slice(0, 10).split("-").reverse().join("/")); caixa(M + 120, y, W - 2 * M - 120, 9, "Ambiente", homolog ? "Homologação" : "Produção"); y += 11;
  pdf.setFontSize(7); pdf.text("DESTINATÁRIO / REMETENTE", M, y); y += 1;
  caixa(M, y, 130, 9, "Nome / razão social", tx(dest, "xNome")); caixa(M + 130, y, W - 2 * M - 130, 9, "CNPJ / CPF", tx(dest, "CNPJ") || tx(dest, "CPF")); y += 9;
  caixa(M, y, 130, 9, "Endereço", `${tx(dest, "xLgr")}, ${tx(dest, "nro")} - ${tx(dest, "xBairro")} - ${tx(dest, "xMun")}/${tx(dest, "UF")}`); caixa(M + 130, y, W - 2 * M - 130, 9, "Inscrição estadual", tx(dest, "IE")); y += 11;
  pdf.text("CÁLCULO DO IMPOSTO", M, y); y += 1;
  const tw = (W - 2 * M) / 6; [["Base ICMS", "vBC"], ["Valor ICMS", "vICMS"], ["Base ICMS ST", "vBCST"], ["Valor ICMS ST", "vST"], ["Valor IPI", "vIPI"], ["Valor total dos produtos", "vProd"], ["Frete", "vFrete"], ["Seguro", "vSeg"], ["Desconto", "vDesc"], ["Outras despesas", "vOutro"], ["Valor PIS/COFINS", ""], ["Valor total da nota", "vNF"]].forEach(([r, k], i) => caixa(M + (i % 6) * tw, y + Math.floor(i / 6) * 9, tw, 9, r, k ? brl(tx(tot, k)) : brl(String(Number(tx(tot, "vPIS")) + Number(tx(tot, "vCOFINS"))))));
  y += 20; pdf.text("DADOS DOS PRODUTOS / SERVIÇOS", M, y); y += 1;
  const cols: [string, number][] = [["Código", 18], ["Descrição", 60], ["NCM", 15], ["CST", 9], ["CFOP", 10], ["Un", 9], ["Qtd", 15], ["V. unit", 16], ["V. total", 16], ["ICMS", 14], ["IPI", 14]];
  const linha = (vals: string[], h: number, cab = false) => { let x = M; pdf.setFontSize(cab ? 5.5 : 6.5); vals.forEach((v, i) => { pdf.rect(x, y, cols[i][1], h); pdf.text(pdf.splitTextToSize(v, cols[i][1] - 1).slice(0, 3), x + 0.5, y + 3); x += cols[i][1]; }); y += h; };
  linha(cols.map((c) => c[0].toUpperCase()), 5, true);
  for (const det of Array.from(inf.getElementsByTagNameNS("*", "det"))) {
    if (y > 270) { pdf.addPage(); y = M; linha(cols.map((c) => c[0].toUpperCase()), 5, true); }
    const p = det.getElementsByTagNameNS("*", "prod")[0], im = det.getElementsByTagNameNS("*", "imposto")[0];
    linha([tx(p, "cProd"), tx(p, "xProd"), tx(p, "NCM"), tx(im, "CST") || tx(im, "CSOSN"), tx(p, "CFOP"), tx(p, "uCom"), Number(tx(p, "qCom")).toLocaleString("pt-BR"), brl(tx(p, "vUnCom")), brl(tx(p, "vProd")), brl(tx(im.getElementsByTagNameNS("*", "ICMS")[0], "vICMS")), brl(tx(im.getElementsByTagNameNS("*", "IPI")[0], "vIPI"))], 8);
  }
  y += 3; caixa(M, y, W - 2 * M, 22, "Informações complementares", `${tx(inf, "infCpl")} ${tx(inf, "infAdFisco")}`);
  if (homolog || !autorizado) { pdf.setTextColor(200, 0, 0); pdf.setFontSize(22); pdf.text("SEM VALOR FISCAL", W / 2, 150, { align: "center", angle: 30 }); pdf.setTextColor(0, 0, 0); }
  return pdf;
}
