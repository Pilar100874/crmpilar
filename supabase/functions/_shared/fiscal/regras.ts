export function faltasTributacaoFiscal(r: any): string[] {
 if(!r||typeof r!=="object")return ["tributação não calculada"];
 const erros:string[]=[];if(!/^\d{4}$/.test(String(r.cfop??"")))erros.push("CFOP");
 for(const k of ["icms","pis","cofins"]){const g=r[k];if(!g||typeof g!=="object"||!String(g.cst??g.csosn??(k==='icms'?r.cst??r.csosn:'')??''))erros.push(`classificação ${k}`);if(g?.aliquota!=null&&(!Number.isFinite(Number(g.aliquota))||Number(g.aliquota)<0))erros.push(`alíquota ${k}`);}
 return erros;
}
export function enderecoPublico(url:string){const u=new URL(url);const h=u.hostname.toLowerCase();if(u.protocol!=='https:'||u.username||u.password||h==='localhost'||h.endsWith('.local')||h.endsWith('.internal')||h.includes(':')||/^\d/.test(h)||!h.includes('.'))throw new Error('Use um domínio HTTPS público do motor fiscal');return u.toString();}
export function situacaoRetorno(r:any){const c=Number(r.status_sefaz);if((r.situacao==='autorizada'||c===100||c===150)&&(!/^\d{44}$/.test(r.chave??'')||!r.protocolo))throw new Error('Autorização sem chave e protocolo SEFAZ');return [100,150].includes(c)?'autorizada':r.situacao;}
