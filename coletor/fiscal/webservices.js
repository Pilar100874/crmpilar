// Endereços oficiais dos webservices NF-e 4.00 por autorizador. Ajustável em config.fiscal.webservices.
const CUF={RO:11,AC:12,AM:13,RR:14,PA:15,AP:16,TO:17,MA:21,PI:22,CE:23,RN:24,PB:25,PE:26,AL:27,SE:28,BA:29,MG:31,ES:32,RJ:33,SP:35,PR:41,SC:42,RS:43,MS:50,MT:51,GO:52,DF:53};
const SVRS_UFS=['AC','AL','AP','DF','ES','PA','PB','PI','RJ','RN','RO','RR','SC','SE','TO'];
const svrs=(h)=>({autorizacao:`https://${h}/ws/NfeAutorizacao/NFeAutorizacao4.asmx`,retAutorizacao:`https://${h}/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx`,consulta:`https://${h}/ws/NfeConsulta/NfeConsulta4.asmx`,status:`https://${h}/ws/NfeStatusServico/NfeStatusServico4.asmx`,evento:`https://${h}/ws/recepcaoevento/recepcaoevento4.asmx`,inutilizacao:`https://${h}/ws/nfeinutilizacao/nfeinutilizacao4.asmx`});
const sp=(h)=>({autorizacao:`https://${h}/ws/nfeautorizacao4.asmx`,retAutorizacao:`https://${h}/ws/nferetautorizacao4.asmx`,consulta:`https://${h}/ws/nfeconsultaprotocolo4.asmx`,status:`https://${h}/ws/nfestatusservico4.asmx`,evento:`https://${h}/ws/nferecepcaoevento4.asmx`,inutilizacao:`https://${h}/ws/nfeinutilizacao4.asmx`});
const TABELA={
  SP:{producao:sp('nfe.fazenda.sp.gov.br'),homologacao:sp('homologacao.nfe.fazenda.sp.gov.br')},
  RS:{producao:svrs('nfe.sefazrs.rs.gov.br'),homologacao:svrs('nfe-homologacao.sefazrs.rs.gov.br')},
  SVRS:{producao:svrs('nfe.svrs.rs.gov.br'),homologacao:svrs('nfe-homologacao.svrs.rs.gov.br')},
};
const AN={producao:{distribuicao:'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',evento:'https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx'},homologacao:{distribuicao:'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',evento:'https://hom1.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx'}};
const ACOES={autorizacao:['NFeAutorizacao4','nfeAutorizacaoLote'],retAutorizacao:['NFeRetAutorizacao4','nfeRetAutorizacaoLote'],consulta:['NFeConsultaProtocolo4','nfeConsultaNF'],status:['NFeStatusServico4','nfeStatusServicoNF'],evento:['NFeRecepcaoEvento4','nfeRecepcaoEvento'],inutilizacao:['NFeInutilizacao4','nfeInutilizacaoNF'],distribuicao:['NFeDistribuicaoDFe','nfeDistDFeInteresse']};
function endereco(uf,ambiente,servico,sobrescrever={}){
  const k=`${uf}:${ambiente}:${servico}`; if(sobrescrever[k]) return sobrescrever[k];
  if(servico==='distribuicao'||servico==='evento_an') return AN[ambiente][servico==='evento_an'?'evento':'distribuicao'];
  const aut=TABELA[uf]?uf:SVRS_UFS.includes(uf)?'SVRS':null;
  if(!aut) throw new Error(`Autorizador da UF ${uf} ainda não mapeado no Coletor (informe o endereço em fiscal.webservices)`);
  return TABELA[aut][ambiente][servico];
}
module.exports={CUF,endereco,ACOES};
