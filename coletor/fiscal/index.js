// Módulo Fiscal do Coletor: emissor NF-e próprio. Busca a fila do CRM (função fiscal-coletor),
// gera/assina o XML, transmite à SEFAZ e devolve o retorno oficial. Nunca simula autorização.
const {loadConfig,saveConfig}=require('../collector');
const {lerPfx,assinar}=require('./assinatura');
const {montarNfe,txt,f,dig,hoje,NS}=require('./xml');
const {CUF,endereco}=require('./webservices');
const {soap,tag,bloco,todos,desc,attr,gunzip}=require('./sefaz');
let timer=null,ocupado=false;const estado={ativo:false,ultimo:null,erro:null,processadas:0,eventos:[]};
const log=(m)=>{estado.eventos.unshift(`${new Date().toLocaleTimeString('pt-BR')} ${m}`);estado.eventos=estado.eventos.slice(0,30);};
async function api(acao,extra={}){
  const cfg=loadConfig();const r=await fetch(`${cfg.url}/functions/v1/fiscal-coletor`,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.anonKey,Authorization:`Bearer ${cfg.anonKey}`},body:JSON.stringify({...extra,acao,chave:String(cfg.chaveEmpresa||'').trim().toUpperCase()})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`Erro ${r.status}`);return j;
}
const municipios=new Map();
async function municipio(cep){const c=dig(cep);if(c.length!==8)throw new Error('CEP inválido para obter o código do município');if(municipios.has(c))return municipios.get(c);
  const r=await fetch(`https://viacep.com.br/ws/${c}/json/`);const j=await r.json();if(!j.ibge)throw new Error(`Código IBGE não encontrado para o CEP ${c}`);municipios.set(c,j.ibge);return j.ibge;}
const certs=new Map();
function certificado(op){const k=op.unidade.id+op.certificado.pfx_base64.length;if(!certs.has(k))certs.set(k,lerPfx(op.certificado.pfx_base64,op.certificado.senha));return certs.get(k);}
const opts=()=>({verificarTls:loadConfig().fiscal?.verificarTls!==false});
const ws=(op,servico)=>endereco(op.unidade.uf.toUpperCase(),op.ambiente,servico,loadConfig().fiscal?.webservices||{});
const tpAmb=(op)=>op.ambiente==='producao'?'1':'2';
const esperar=(ms)=>new Promise(r=>setTimeout(r,ms));
function lerProt(resp){const prot=bloco(resp,'protNFe');const inf=prot?tag(prot,'infProt'):undefined;return inf?{prot,cStat:Number(tag(inf,'cStat')),motivo:desc(tag(inf,'xMotivo')),protocolo:tag(inf,'nProt'),chave:tag(inf,'chNFe')}:null;}
const situacaoDe=(c)=>[100,150].includes(c)?'autorizada':[101,151,155].includes(c)?'cancelada':[110,301,302,303].includes(c)?'rejeitada':c>=200?'rejeitada':'processando';
const proc=(nfe,prot)=>`<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="${NS}" versao="4.00">${nfe}${prot.replace(/^<protNFe(?![^>]*xmlns)/,`<protNFe xmlns="${NS}"`)}</nfeProc>`;
async function consultar(op,cert,chave,nfeXml){
  const r=await soap(ws(op,'consulta'),'consulta',`<consSitNFe xmlns="${NS}" versao="4.00"><tpAmb>${tpAmb(op)}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${chave}</chNFe></consSitNFe>`,cert,opts());
  const c=Number(tag(r,'cStat'));const p=lerProt(r);
  if(c===217)return {situacao:'desconhecida',status_sefaz:217,mensagem:desc(tag(r,'xMotivo')),chave};
  if(p&&p.cStat===100)return {situacao:c===101?'cancelada':'autorizada',status_sefaz:c===101?101:100,mensagem:desc(tag(r,'xMotivo')),chave,protocolo:p.protocolo,xml:nfeXml?proc(nfeXml,p.prot):undefined};
  return {situacao:situacaoDe(c),status_sefaz:c,mensagem:desc(tag(r,'xMotivo')),chave};
}
async function emitir(op,cert){
  const nota=op.nota;
  // Reenvio da mesma operação: o XML assinado salvo é reaproveitado e consultado antes, para nunca gerar duplicidade.
  if(op.tentativa>1&&nota.chave&&nota.xml&&!nota.xml.includes('<nfeProc')){const c=await consultar(op,cert,nota.chave,nota.xml);if(c.situacao!=='desconhecida')return c;}
  let nfe,chave;
  if(op.tentativa>1&&nota.chave&&nota.xml&&!nota.xml.includes('<nfeProc')){nfe=nota.xml;chave=nota.chave;}
  else{const m=await montarNfe(op,municipio);if(Math.abs(m.vNF-Number(nota.valor_total))>0.02)throw new Error(`Total calculado (${m.vNF}) difere do total da nota (${nota.valor_total}); revise a nota`);nfe=assinar(m.xml,'infNFe',cert);chave=m.chave;await api('preparar',{operacao_id:op.id,chave_nfe:chave,xml:nfe});}
  const r=await soap(ws(op,'autorizacao'),'autorizacao',`<enviNFe xmlns="${NS}" versao="4.00"><idLote>${String(Date.now()).slice(-15)}</idLote><indSinc>1</indSinc>${nfe}</enviNFe>`,cert,opts());
  const c=Number(tag(r,'cStat'));
  if(c===104){const p=lerProt(r);if(!p)throw new Error('Lote processado sem protocolo');const s=situacaoDe(p.cStat);return {situacao:s,status_sefaz:p.cStat,mensagem:p.motivo,chave,protocolo:s==='autorizada'?p.protocolo:undefined,xml:s==='autorizada'?proc(nfe,p.prot):undefined};}
  if(c===103){const rec=tag(r,'nRec');for(let i=0;i<5;i++){await esperar(3000);const x=await soap(ws(op,'retAutorizacao'),'retAutorizacao',`<consReciNFe xmlns="${NS}" versao="4.00"><tpAmb>${tpAmb(op)}</tpAmb><nRec>${rec}</nRec></consReciNFe>`,cert,opts());const cs=Number(tag(x,'cStat'));if(cs===105)continue;const p=lerProt(x);if(p){const s=situacaoDe(p.cStat);return {situacao:s,status_sefaz:p.cStat,mensagem:p.motivo,chave,protocolo:s==='autorizada'?p.protocolo:undefined,xml:s==='autorizada'?proc(nfe,p.prot):undefined};}return {situacao:'rejeitada',status_sefaz:cs,mensagem:desc(tag(x,'xMotivo')),chave};}return {situacao:'processando',status_sefaz:105,mensagem:'Lote em processamento; consulte a situação',chave};}
  if(c===204||c===539){return consultar(op,cert,chave,nfe);} // duplicidade: a consulta traz a autorização existente
  return {situacao:'rejeitada',status_sefaz:c,mensagem:desc(tag(r,'xMotivo'))||'Rejeição sem motivo',chave};
}
const EVENTOS={cancelamento:['110111','Cancelamento'],carta_correcao:['110110','Carta de Correcao'],ciencia:['210210','Ciencia da Operacao'],confirmacao:['210200','Confirmacao da Operacao'],desconhecimento:['210220','Desconhecimento da Operacao'],nao_realizada:['210240','Operacao nao Realizada']};
const COND='A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.';
async function evento(op,cert){
  const p=op.parametros;const tipo=op.acao==='manifestar'?p.evento:op.acao;const [tp,descEv]=EVENTOS[tipo];
  const chave=op.acao==='manifestar'?p.chave:op.nota.chave;const seq=op.acao==='carta_correcao'?Number(p.sequencia||1):1;
  const nacional=op.acao==='manifestar';const cOrgao=nacional?'91':String(CUF[op.unidade.uf.toUpperCase()]);
  const det=tipo==='cancelamento'?`<descEvento>${descEv}</descEvento><nProt>${op.nota.protocolo}</nProt><xJust>${txt(p.texto)}</xJust>`:tipo==='carta_correcao'?`<descEvento>${descEv}</descEvento><xCorrecao>${txt(p.texto)}</xCorrecao><xCondUso>${COND}</xCondUso>`:`<descEvento>${descEv}</descEvento>${tipo==='nao_realizada'?`<xJust>${txt(p.texto)}</xJust>`:''}`;
  const id=`ID${tp}${chave}${String(seq).padStart(2,'0')}`;
  const ev=`<evento xmlns="${NS}" versao="1.00"><infEvento Id="${id}"><cOrgao>${cOrgao}</cOrgao><tpAmb>${tpAmb(op)}</tpAmb><CNPJ>${dig(op.unidade.cnpj)}</CNPJ><chNFe>${chave}</chNFe><dhEvento>${hoje()}</dhEvento><tpEvento>${tp}</tpEvento><nSeqEvento>${seq}</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00">${det}</detEvento></infEvento></evento>`;
  const assinado=assinar(ev,'infEvento',cert);
  const r=await soap(ws(op,nacional?'evento_an':'evento'),'evento',`<envEvento xmlns="${NS}" versao="1.00"><idLote>${String(Date.now()).slice(-15)}</idLote>${assinado.replace(` xmlns="${NS}"`,'')}</envEvento>`,cert,opts());
  const inf=tag(bloco(r,'retEvento')||'','infEvento')||'';const c=Number(tag(inf,'cStat'));const aceito=[135,136,155].includes(c);
  return {aceito,status_sefaz:c||Number(tag(r,'cStat')),mensagem:desc(tag(inf,'xMotivo')||tag(r,'xMotivo')),protocolo:aceito?tag(inf,'nProt'):undefined,sequencia:seq,xml:aceito?`<procEventoNFe xmlns="${NS}" versao="1.00">${assinado}${bloco(r,'retEvento')}</procEventoNFe>`:undefined};
}
async function inutilizar(op,cert){
  const p=op.parametros;const uf=op.unidade.uf.toUpperCase();const ano=new Date().getFullYear().toString().slice(2);const serie=String(op.serie).padStart(3,'0');
  const id=`ID${CUF[uf]}${ano}${dig(op.unidade.cnpj)}55${serie}${String(p.inicio).padStart(9,'0')}${String(p.fim).padStart(9,'0')}`;
  const x=`<inutNFe xmlns="${NS}" versao="4.00"><infInut Id="${id}"><tpAmb>${tpAmb(op)}</tpAmb><xServ>INUTILIZAR</xServ><cUF>${CUF[uf]}</cUF><ano>${ano}</ano><CNPJ>${dig(op.unidade.cnpj)}</CNPJ><mod>55</mod><serie>${Number(op.serie)}</serie><nNFIni>${p.inicio}</nNFIni><nNFFin>${p.fim}</nNFFin><xJust>${txt(p.texto)}</xJust></infInut></inutNFe>`;
  const assinado=assinar(x,'infInut',cert);const r=await soap(ws(op,'inutilizacao'),'inutilizacao',assinado,cert,opts());
  const inf=tag(r,'infInut')||r;const c=Number(tag(inf,'cStat'));return {aceito:c===102,status_sefaz:c,mensagem:desc(tag(inf,'xMotivo')),protocolo:c===102?tag(inf,'nProt'):undefined,xml:c===102?`<procInutNFe xmlns="${NS}" versao="4.00">${assinado}${bloco(r,'retInutNFe')}</procInutNFe>`:undefined};
}
async function status(op,cert){const uf=op.unidade.uf.toUpperCase();const r=await soap(ws(op,'status'),'status',`<consStatServ xmlns="${NS}" versao="4.00"><tpAmb>${tpAmb(op)}</tpAmb><cUF>${CUF[uf]}</cUF><xServ>STATUS</xServ></consStatServ>`,cert,opts());const c=Number(tag(r,'cStat'));return {aceito:c===107,status_sefaz:c,mensagem:desc(tag(r,'xMotivo'))};}
async function distribuir(op,cert){
  const uf=op.unidade.uf.toUpperCase();const r=await soap(ws(op,'distribuicao'),'distribuicao',`<distDFeInt xmlns="${NS}" versao="1.01"><tpAmb>${tpAmb(op)}</tpAmb><cUFAutor>${CUF[uf]}</cUFAutor><CNPJ>${dig(op.unidade.cnpj)}</CNPJ><distNSU><ultNSU>${op.ultimo_nsu}</ultNSU></distNSU></distDFeInt>`,cert,opts());
  const c=Number(tag(r,'cStat'));if(![137,138].includes(c)&&c!==656)throw new Error(`DF-e ${c}: ${desc(tag(r,'xMotivo'))}`);
  const documentos=todos(r,'docZip').map(d=>{const xml=gunzip(d.conteudo.trim());const esquema=attr(d.attrs,'schema');const nsu=attr(d.attrs,'NSU');
    const resumo={emitente_nome:desc(tag(xml,'xNome')),documento:tag(xml,'CNPJ')||tag(xml,'CPF'),valor_total:tag(xml,'vNF')?Number(tag(xml,'vNF')):undefined,emissao:tag(xml,'dhEmi'),tipo:esquema};
    return {nsu,esquema,chave:tag(xml,'chNFe')||(/Id="NFe(\d{44})"/.exec(xml)||[])[1],resumo,xml:esquema?.startsWith('procNFe')?xml:undefined};});
  return {situacao:undefined,aceito:true,status_sefaz:c,mensagem:desc(tag(r,'xMotivo')),ultimo_nsu:(tag(r,'ultNSU')||op.ultimo_nsu).padStart(15,'0'),max_nsu:(tag(r,'maxNSU')||op.ultimo_nsu).padStart(15,'0'),documentos,aguardar_segundos:c===656||c===137?3600:0};
}
async function processar(op){
  const cert=certificado(op);
  if(op.acao==='emitir')return emitir(op,cert);
  if(op.acao==='consultar'){if(!op.nota.chave)return {situacao:op.nota.situacao,mensagem:'Nota ainda sem chave'};return consultar(op,cert,op.nota.chave,op.nota.xml&&!op.nota.xml.includes('<nfeProc')?op.nota.xml:undefined);}
  if(['cancelamento','carta_correcao','manifestar'].includes(op.acao))return evento(op,cert);
  if(op.acao==='inutilizacao')return inutilizar(op,cert);
  if(op.acao==='servico')return status(op,cert);
  if(op.acao==='distribuir')return distribuir(op,cert);
  throw new Error(`Ação ${op.acao} não suportada`);
}
async function ciclo(){
  if(ocupado)return;ocupado=true;
  try{const {operacoes=[]}=await api('pendentes');estado.ultimo=new Date().toISOString();estado.erro=null;
    for(const op of operacoes){try{const r=await processar(op);await api('resultado',{operacao_id:op.id,retorno:r});estado.processadas++;log(`${op.acao}: ${r.situacao??(r.aceito?'aceito':'rejeitado')} ${r.status_sefaz??''} ${r.mensagem??''}`);}
      catch(e){log(`${op.acao}: falha — ${e.message}`);await api('falha',{operacao_id:op.id,erro:e.message}).catch(()=>{});}}
  }catch(e){estado.erro=e.message;}finally{ocupado=false;}
}
function startFiscal(){if(timer)return;estado.ativo=true;timer=setInterval(ciclo,8000);ciclo();const c=loadConfig();if(!c.fiscalEnabled)saveConfig({...c,fiscalEnabled:true});}
function stopFiscal(){clearInterval(timer);timer=null;estado.ativo=false;const c=loadConfig();if(c.fiscalEnabled)saveConfig({...c,fiscalEnabled:false});}
const statusFiscal=()=>({...estado});
module.exports={startFiscal,stopFiscal,statusFiscal,processar};
