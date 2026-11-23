// NF-e modelo 55. Catálogo: nfephp-org/sped-nfe storage/wsnfe_4.00_mod55.xml
// e storage/autorizadores.json (consultados em 23/11/2026). Não inclui contingência.
const CUF={RO:11,AC:12,AM:13,RR:14,PA:15,AP:16,TO:17,MA:21,PI:22,CE:23,RN:24,PB:25,PE:26,AL:27,SE:28,BA:29,MG:31,ES:32,RJ:33,SP:35,PR:41,SC:42,RS:43,MS:50,MT:51,GO:52,DF:53};
const TABELA=require('./autorizadores.json');
const AUTORIZADORES={RO:'SVRS',AC:'SVRS',AM:'AM',RR:'SVRS',PA:'SVRS',AP:'SVRS',TO:'SVRS',MA:'SVAN',PI:'SVRS',CE:'SVRS',RN:'SVRS',PB:'SVRS',PE:'PE',AL:'SVRS',SE:'SVRS',BA:'BA',MG:'MG',ES:'SVRS',RJ:'SVRS',SP:'SP',PR:'PR',SC:'SVRS',RS:'RS',MS:'MS',MT:'MT',GO:'GO',DF:'SVRS'};
const ACOES={autorizacao:['NFeAutorizacao4','nfeAutorizacaoLote'],retAutorizacao:['NFeRetAutorizacao4','nfeRetAutorizacaoLote'],consulta:['NFeConsultaProtocolo4','nfeConsultaNF'],status:['NFeStatusServico4','nfeStatusServicoNF'],evento:['NFeRecepcaoEvento4','nfeRecepcaoEvento'],inutilizacao:['NFeInutilizacao4','nfeInutilizacaoNF'],distribuicao:['NFeDistribuicaoDFe','nfeDistDFeInteresse']};
function endereco(uf,ambiente,servico,sobrescrever={}){
  uf=String(uf).trim().toUpperCase();
  if(!AUTORIZADORES[uf]) throw new Error(`UF inválida: ${uf}`);
  if(!['producao','homologacao'].includes(ambiente)) throw new Error('Ambiente fiscal inválido');
  const nacional=servico==='distribuicao'||servico==='evento_an';
  const nome=servico==='evento_an'?'evento':servico;
  const padrao=TABELA[nacional?'AN':AUTORIZADORES[uf]]?.[ambiente]?.[nome];
  if(!padrao) throw new Error(`Serviço fiscal inválido: ${servico}`);
  const k=`${uf}:${ambiente}:${servico}`; if(sobrescrever[k]) return sobrescrever[k];
  return padrao;
}
module.exports={CUF,endereco,ACOES,AUTORIZADORES};
