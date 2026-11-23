// Certificado A1 (PFX) e assinatura XMLDSig enveloped (C14N, RSA-SHA1), padrão exigido pela SEFAZ.
const crypto=require('crypto');
const forge=require('node-forge');
function lerPfx(b64,senha){
  const p12=forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.decode64(b64)),senha);
  const chaves=[...(p12.getBags({bagType:forge.pki.oids.pkcs8ShroudedKeyBag})[forge.pki.oids.pkcs8ShroudedKeyBag]||[]),...(p12.getBags({bagType:forge.pki.oids.keyBag})[forge.pki.oids.keyBag]||[])];
  const certs=p12.getBags({bagType:forge.pki.oids.certBag})[forge.pki.oids.certBag]||[];
  const key=chaves[0]?.key; if(!key) throw new Error('Certificado sem chave privada');
  const cert=certs.map(c=>c.cert).find(c=>c.publicKey.n.equals(key.n)); if(!cert) throw new Error('Certificado do titular não encontrado no PFX');
  if(cert.validity.notAfter<new Date()) throw new Error('Certificado A1 vencido');
  const outros=certs.map(c=>c.cert).filter(c=>c!==cert).map(c=>forge.pki.certificateToPem(c)).join('');
  return {keyPem:forge.pki.privateKeyToPem(key),certPem:forge.pki.certificateToPem(cert)+outros,certB64:forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()),validade:cert.validity.notAfter};
}
const sha1=(s)=>crypto.createHash('sha1').update(s,'utf8').digest('base64');
/** Assina o elemento `tag` (com atributo Id) e insere a Signature logo após ele.
 * O XML é gerado pelo próprio módulo já em forma canônica (sem espaços, atributos ordenados), então o
 * C14N do elemento é o próprio texto com o xmlns herdado declarado. */
function assinar(xml,tag,cert,ns='http://www.portalfiscal.inf.br/nfe'){
  const ini=xml.indexOf(`<${tag} `),fim=xml.indexOf(`</${tag}>`)+tag.length+3;
  if(ini<0||fim<tag.length+3) throw new Error(`Elemento ${tag} não encontrado`);
  let el=xml.slice(ini,fim); const id=/Id="([^"]+)"/.exec(el)?.[1]; if(!id) throw new Error('Elemento sem Id');
  const canon=el.includes('xmlns=')?el:el.replace(`<${tag} `,`<${tag} xmlns="${ns}" `);
  const signedInfo=`<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod><Reference URI="#${id}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod><DigestValue>${sha1(canon)}</DigestValue></Reference></SignedInfo>`;
  const valor=crypto.createSign('RSA-SHA1').update(signedInfo,'utf8').sign(cert.keyPem,'base64');
  const sig=`<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfo.replace(' xmlns="http://www.w3.org/2000/09/xmldsig#"','')}<SignatureValue>${valor}</SignatureValue><KeyInfo><X509Data><X509Certificate>${cert.certB64}</X509Certificate></X509Data></KeyInfo></Signature>`;
  return xml.slice(0,fim)+sig+xml.slice(fim);
}
module.exports={lerPfx,assinar,sha1};
