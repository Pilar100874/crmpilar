import forge from "node-forge";

export interface DadosCertificado { titular: string; cnpj: string | null; validoAte: Date; validoDesde: Date }

/** Lê um certificado A1 (.pfx/.p12) com a senha; lança erro em português se a senha estiver errada. */
export async function lerCertificadoA1(arquivo: File, senha: string): Promise<DadosCertificado> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  let binario = "";
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(binario), senha);
  } catch {
    throw new Error("Senha incorreta ou arquivo não é um certificado A1 válido (.pfx/.p12).");
  }
  const bags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const cert = bags.map((b) => b.cert).find((c) => c && !(c.extensions || []).some((e: any) => e.name === "basicConstraints" && e.cA)) || bags[0]?.cert;
  if (!cert) throw new Error("Nenhum certificado encontrado no arquivo.");
  const cn = String(cert.subject.getField("CN")?.value || "");
  const [titular, doc] = cn.split(":");
  const cnpj = (doc || "").replace(/\D/g, "") || null;
  return { titular: titular || cn, cnpj, validoAte: cert.validity.notAfter, validoDesde: cert.validity.notBefore };
}
