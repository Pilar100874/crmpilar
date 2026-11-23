// Comunicação SOAP 1.2 com a SEFAZ usando TLS mútuo com o certificado A1.
const https=require('https');
const zlib=require('zlib');
const {ACOES}=require('./webservices');
function soap(url,servico,corpo,cert,{verificarTls=true,tempo=60000}={}){
  const [wsdl,metodo]=ACOES[servico];
  const dados=servico==='distribuicao'?`<nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${wsdl}"><nfeDadosMsg>${corpo}</nfeDadosMsg></nfeDistDFeInteresse>`:`<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${wsdl}">${corpo}</nfeDadosMsg>`;
  const env=`<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body>${dados}</soap12:Body></soap12:Envelope>`;
  return new Promise((ok,falha)=>{
    const u=new URL(url);
    const req=https.request({hostname:u.hostname,path:u.pathname,method:'POST',key:cert.keyPem,cert:cert.certPem,rejectUnauthorized:verificarTls,timeout:tempo,
      headers:{'Content-Type':`application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/${wsdl}/${metodo}"`,'Content-Length':Buffer.byteLength(env)}},(res)=>{
      let b='';res.setEncoding('utf8');res.on('data',c=>b+=c);res.on('end',()=>{if(res.statusCode>=500&&!b.includes('<ret'))return falha(new Error(`SEFAZ respondeu HTTP ${res.statusCode}`));ok(b);});});
    req.on('timeout',()=>req.destroy(new Error('Tempo esgotado na comunicação com a SEFAZ')));
    req.on('error',(e)=>falha(/CERT|ISSUER|SELF_SIGNED/.test(e.code||'')?new Error('Cadeia de certificados da SEFAZ não reconhecida: instale a cadeia ICP-Brasil no computador ou desative a verificação TLS no módulo Fiscal'):e));
    req.end(env);
  });
}
const tag=(x,n)=>{const m=new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${n}>`).exec(x);return m?m[1]:undefined;};
const bloco=(x,n)=>{const m=new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>[\\s\\S]*?</(?:\\w+:)?${n}>`).exec(x);return m?m[0]:undefined;};
const todos=(x,n)=>[...x.matchAll(new RegExp(`<(?:\\w+:)?${n}(\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${n}>`,'g'))].map(m=>({attrs:m[1]||'',conteudo:m[2]}));
const desc=(s)=>String(s??'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&');
const attr=(a,n)=>new RegExp(`${n}="([^"]*)"`).exec(a)?.[1];
const gunzip=(b64)=>zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8');
module.exports={soap,tag,bloco,todos,desc,attr,gunzip};
