// Geração do XML da NF-e 4.00 (modelo 55) a partir da nota salva no CRM. Tributos vêm do Systax.
const crypto=require('crypto');
const {CUF}=require('./webservices');
const NS='http://www.portalfiscal.inf.br/nfe';
// Escape de texto na forma canônica C14N (aspas ficam literais em texto).
const esc=(s)=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\r/g,'&#xD;');
const txt=(s)=>esc(String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim());
const t=(n,v)=>v===undefined||v===null||v===''?'':`<${n}>${txt(v)}</${n}>`;
const g=(n,c)=>c?`<${n}>${c}</${n}>`:'';
const dig=(s)=>String(s??'').replace(/\D/g,'');
const f=(n,c=2)=>(Math.round((Number(n)||0)*10**c)/10**c).toFixed(c);
const hoje=()=>new Date(Date.now()-3*3600e3).toISOString().slice(0,19)+'-03:00';
function dvChave(c43){let p=2,s=0;for(let i=c43.length-1;i>=0;i--){s+=Number(c43[i])*p;p=p===9?2:p+1;}const r=s%11;return r<2?0:11-r;}
function montarChave({uf,dataEmissao,cnpj,serie,numero,id}){
  const nNF=String(numero).padStart(9,'0');let cNF=String(parseInt(crypto.createHash('sha256').update(String(id)).digest('hex').slice(0,12),16)%1e8).padStart(8,'0');
  if(cNF===nNF.slice(1)) cNF=String((Number(cNF)+1)%1e8).padStart(8,'0');
  const c43=`${CUF[uf]}${dataEmissao.slice(2,4)}${dataEmissao.slice(5,7)}${dig(cnpj).padStart(14,'0')}55${String(serie).padStart(3,'0')}${nNF}1${cNF}`;
  const dv=dvChave(c43);return {chave:c43+dv,cNF,cDV:dv};
}
const n=(x)=>Number(x)||0;
function icms(tr,orig){
  const i=tr.icms||{};const st=tr.icms_st||tr.st||{};const c=String(i.csosn??tr.csosn??i.cst??tr.cst??'');
  const base=t('orig',orig);const p=(k)=>i[k];
  const proprio=`${t('modBC',String(i.modalidade_bc??3))}${t('vBC',f(p('base')))}${t('pICMS',f(p('aliquota'),4))}${t('vICMS',f(p('valor')))}`;
  const icmsSt=`${t('modBCST',String(st.modalidade_bc??4))}${st.mva!=null?t('pMVAST',f(st.mva,4)):''}${t('vBCST',f(st.base))}${t('pICMSST',f(st.aliquota,4))}${t('vICMSST',f(st.valor))}`;
  const m={
    '00':()=>g('ICMS00',base+t('CST','00')+proprio),
    '10':()=>g('ICMS10',base+t('CST','10')+proprio+icmsSt),
    '20':()=>g('ICMS20',base+t('CST','20')+t('modBC',String(i.modalidade_bc??3))+t('pRedBC',f(i.reducao_bc,4))+t('vBC',f(i.base))+t('pICMS',f(i.aliquota,4))+t('vICMS',f(i.valor))),
    '40':()=>g('ICMS40',base+t('CST',c)),'41':()=>g('ICMS40',base+t('CST',c)),'50':()=>g('ICMS40',base+t('CST',c)),
    '51':()=>g('ICMS51',base+t('CST','51')),'60':()=>g('ICMS60',base+t('CST','60')),
    '90':()=>g('ICMS90',base+t('CST','90')+(n(i.valor)?proprio:'')),
    '101':()=>g('ICMSSN101',base+t('CSOSN','101')+t('pCredSN',f(i.aliquota_credito??i.aliquota,4))+t('vCredICMSSN',f(i.valor_credito??i.valor))),
    '102':()=>g('ICMSSN102',base+t('CSOSN',c)),'103':()=>g('ICMSSN102',base+t('CSOSN',c)),'300':()=>g('ICMSSN102',base+t('CSOSN',c)),'400':()=>g('ICMSSN102',base+t('CSOSN',c)),
    '201':()=>g('ICMSSN201',base+t('CSOSN','201')+icmsSt+t('pCredSN',f(i.aliquota_credito??0,4))+t('vCredICMSSN',f(i.valor_credito??0))),
    '500':()=>g('ICMSSN500',base+t('CSOSN','500')),
    '900':()=>g('ICMSSN900',base+t('CSOSN','900')+(n(i.valor)?proprio:'')),
  };
  if(!m[c]) throw new Error(`CST/CSOSN de ICMS ${c||'vazio'} não suportado pelo emissor`);
  return {xml:g('ICMS',m[c]()),vBC:['00','10','20','90','900'].includes(c)?n(i.base):0,vICMS:['00','10','20','90','900'].includes(c)?n(i.valor):0,vBCST:['10','201'].includes(c)?n(st.base):0,vST:['10','201'].includes(c)?n(st.valor):0};
}
function pisCofins(nome,tr){
  const x=tr[nome.toLowerCase()]||{};const c=String(x.cst??'').padStart(2,'0');const P=nome==='PIS'?'PIS':'COFINS';
  if(['01','02'].includes(c)) return {xml:g(P,g(`${P}Aliq`,t('CST',c)+t('vBC',f(x.base))+t(`p${P}`,f(x.aliquota,4))+t(`v${P}`,f(x.valor)))),v:n(x.valor)};
  if(['04','05','06','07','08','09'].includes(c)) return {xml:g(P,g(`${P}NT`,t('CST',c))),v:0};
  if(!/^\d{2}$/.test(c)||c==='00') throw new Error(`CST de ${P} ausente`);
  return {xml:g(P,g(`${P}Outr`,t('CST',c)+t('vBC',f(x.base))+t(`p${P}`,f(x.aliquota,4))+t(`v${P}`,f(x.valor)))),v:n(x.valor)};
}
function ipi(tr){const x=tr.ipi;if(!x||x.cst==null)return {xml:'',v:0};const c=String(x.cst).padStart(2,'0');
  const corpo=['00','49','50','99'].includes(c)?g('IPITrib',t('CST',c)+t('vBC',f(x.base))+t('pIPI',f(x.aliquota,4))+t('vIPI',f(x.valor))):g('IPINT',t('CST',c));
  return {xml:g('IPI',t('cEnq',String(x.enquadramento??'999'))+corpo),v:['00','49','50','99'].includes(c)?n(x.valor):0};}
function endereco(tag,e,cMun){return g(tag,t('xLgr',e.logradouro??e.endereco)+t('nro',e.numero||'S/N')+t('xCpl',e.complemento)+t('xBairro',e.bairro||'Centro')+t('cMun',String(cMun))+t('xMun',e.cidade)+t('UF',(e.uf??e.estado).toUpperCase())+t('CEP',dig(e.cep))+t('cPais','1058')+t('xPais','BRASIL')+t('fone',dig(e.telefone).slice(-11)||undefined));}
/** Monta o XML sem assinatura. municipio(cep) → código IBGE. */
async function montarNfe(op,municipio){
  const {nota,unidade:u,destinatario:d,transportadora:tr}=op;const dados=nota.dados_emissao||{};const amb=op.ambiente==='producao'?'1':'2';
  const uf=u.uf.toUpperCase(),ufDest=d.estado.toUpperCase();const dhEmi=hoje();
  const {chave,cNF,cDV}=montarChave({uf,dataEmissao:dhEmi,cnpj:u.cnpj,serie:nota.serie,numero:nota.numero,id:nota.id});
  const [cMunE,cMunD]=await Promise.all([municipio(u.cep),municipio(d.cep)]);
  const idDest=ufDest==='EX'?'3':ufDest===uf?'1':'2';const pres=String(dados.presenca_comprador??nota.presenca_comprador??'9');
  const tot={vBC:0,vICMS:0,vBCST:0,vST:0,vProd:0,vFrete:0,vSeg:0,vDesc:0,vIPI:0,vPIS:0,vCOFINS:0,vOutro:0};
  const extras=dados.itens||[];
  const dets=nota.notas_fiscais_itens.map((it,k)=>{
    const tr=it.tributacao||{};const ex=extras[k]||{};const prod=it.produtos||{};
    const vProd=n(it.valor_total)||n(it.quantidade)*n(it.valor_unitario);const ean=dig(prod.gtin||prod.ean_13)||'SEM GTIN';
    const ic=icms(tr,String(prod.origem??'0').replace(/\D/g,'')||'0');const ip=ipi(tr);const pi=pisCofins('PIS',tr);const co=pisCofins('COFINS',tr);
    tot.vBC+=ic.vBC;tot.vICMS+=ic.vICMS;tot.vBCST+=ic.vBCST;tot.vST+=ic.vST;tot.vProd+=vProd;tot.vFrete+=n(ex.frete);tot.vSeg+=n(ex.seguro);tot.vDesc+=n(ex.desconto);tot.vOutro+=n(ex.outras);tot.vIPI+=ip.v;tot.vPIS+=pi.v;tot.vCOFINS+=co.v;
    const q=f(it.quantidade,4),vu=f(it.valor_unitario,10);
    const prodXml=t('cProd',prod.codigo||it.codigo_origem||String(k+1))+t('cEAN',ean)+t('xProd',it.descricao)+t('NCM',dig(it.ncm))+t('CEST',dig(prod.cest)||undefined)+t('CFOP',String(tr.cfop??it.cfop))+t('uCom',it.unidade)+t('qCom',q)+t('vUnCom',vu)+t('vProd',f(vProd))+t('cEANTrib',ean)+t('uTrib',it.unidade)+t('qTrib',q)+t('vUnTrib',vu)+(n(ex.frete)?t('vFrete',f(ex.frete)):'')+(n(ex.seguro)?t('vSeg',f(ex.seguro)):'')+(n(ex.desconto)?t('vDesc',f(ex.desconto)):'')+(n(ex.outras)?t('vOutro',f(ex.outras)):'')+t('indTot','1');
    return `<det nItem="${k+1}">${g('prod',prodXml)}${g('imposto',ic.xml+ip.xml+pi.xml+co.xml)}</det>`;
  }).join('');
  const vNF=tot.vProd-tot.vDesc+tot.vST+tot.vFrete+tot.vSeg+tot.vOutro+tot.vIPI;
  const homolog=amb==='2'?'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL':null;
  const docDest=dig(d.cnpj);const indIE=String(d.contribuinte_icms||(dig(d.inscricao_estadual)?'1':'9'));
  const refs=(dados.referencias||[]).map(r=>g('NFref',t('refNFe',dig(r)))).join('');
  const ide=t('cUF',String(CUF[uf]))+t('cNF',cNF)+t('natOp',nota.natureza_operacao||'Venda')+t('mod','55')+t('serie',String(Number(nota.serie)))+t('nNF',String(Number(nota.numero)))+t('dhEmi',dhEmi)+t('tpNF','1')+t('idDest',idDest)+t('cMunFG',String(cMunE))+t('tpImp','1')+t('tpEmis','1')+t('cDV',String(cDV))+t('tpAmb',amb)+t('finNFe',String(nota.finalidade_emissao||1))+t('indFinal',nota.consumidor_final?'1':'0')+t('indPres',pres)+(['2','3','4','9'].includes(pres)?t('indIntermed','0'):'')+t('procEmi','0')+t('verProc','PilarColetor')+refs;
  const emit=t('CNPJ',dig(u.cnpj))+t('xNome',u.razao_social||u.nome)+t('xFant',u.nome)+endereco('enderEmit',u,cMunE)+t('IE',dig(u.inscricao_estadual))+t('CRT',String(u.crt));
  const dest=(docDest.length===11?t('CPF',docDest):t('CNPJ',docDest))+t('xNome',homolog||d.nome||d.nome_fantasia)+endereco('enderDest',d,cMunD)+t('indIEDest',indIE)+(indIE==='1'?t('IE',dig(d.inscricao_estadual)):'')+t('email',d.email||undefined);
  const total=g('ICMSTot',t('vBC',f(tot.vBC))+t('vICMS',f(tot.vICMS))+t('vICMSDeson','0.00')+t('vFCP','0.00')+t('vBCST',f(tot.vBCST))+t('vST',f(tot.vST))+t('vFCPST','0.00')+t('vFCPSTRet','0.00')+t('vProd',f(tot.vProd))+t('vFrete',f(tot.vFrete))+t('vSeg',f(tot.vSeg))+t('vDesc',f(tot.vDesc))+t('vII','0.00')+t('vIPI',f(tot.vIPI))+t('vIPIDevol','0.00')+t('vPIS',f(tot.vPIS))+t('vCOFINS',f(tot.vCOFINS))+t('vOutro',f(tot.vOutro))+t('vNF',f(vNF)));
  const mod=String(dados.modalidade_frete??9);
  const transp=t('modFrete',mod)+(tr?g('transporta',(dig(tr.cnpj).length===11?t('CPF',dig(tr.cnpj)):t('CNPJ',dig(tr.cnpj)))+t('xNome',tr.nome)+(dig(tr.inscricao_estadual)?t('IE',dig(tr.inscricao_estadual)):'')+t('xEnder',tr.endereco)+t('xMun',tr.cidade)+t('UF',tr.estado)):'')+(idDest==='1'&&dados.placa_veiculo?g('veicTransp',t('placa',dig(dados.placa_veiculo)?String(dados.placa_veiculo).replace(/[^A-Z0-9]/gi,'').toUpperCase():undefined)+t('UF',dados.uf_veiculo||uf)):'')+(n(dados.volumes)?g('vol',t('qVol',String(n(dados.volumes)))+t('esp',dados.especie_volumes||undefined)+(n(dados.peso_liquido)?t('pesoL',f(dados.peso_liquido,3)):'')+(n(dados.peso_bruto)?t('pesoB',f(dados.peso_bruto,3)):'')):'');
  const dups=(dados.duplicatas||[]).filter(x=>n(x.valor)>0);
  const cobr=dups.length?g('cobr',g('fat',t('nFat',String(Number(nota.numero)))+t('vOrig',f(vNF))+t('vDesc','0.00')+t('vLiq',f(vNF)))+dups.map(x=>g('dup',t('nDup',String(x.numero).padStart(3,'0'))+t('dVenc',x.vencimento)+t('vDup',f(x.valor)))).join('')):'';
  const pagos=(dados.pagamentos||[]);if(!pagos.length) throw new Error('Pagamento não informado');
  const soma=pagos.reduce((s,p)=>s+n(p.valor),0);
  const pag=g('pag',pagos.map(p=>g('detPag',t('tPag',String(p.meio).padStart(2,'0'))+(String(p.meio)==='99'?t('xPag','Outros'):'')+t('vPag',f(p.meio==='90'?0:p.valor)))).join('')+(soma-vNF>0.009?t('vTroco',f(soma-vNF)):''));
  const infAdic=(dados.informacoes_fisco||dados.observacoes||nota.observacoes)?g('infAdic',t('infAdFisco',dados.informacoes_fisco||undefined)+t('infCpl',dados.observacoes||nota.observacoes||undefined)):'';
  const xml=`<NFe xmlns="${NS}"><infNFe Id="NFe${chave}" versao="4.00">${g('ide',ide)}${g('emit',emit)}${g('dest',dest)}${dets}${g('total',total)}${g('transp',transp)}${cobr}${pag}${infAdic}</infNFe></NFe>`;
  return {xml,chave,vNF:Number(f(vNF))};
}
module.exports={montarNfe,montarChave,dvChave,txt,t,g,f,dig,hoje,NS};
