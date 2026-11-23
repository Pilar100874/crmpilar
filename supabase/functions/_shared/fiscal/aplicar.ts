import {situacaoRetorno} from './regras.ts';
// deno-lint-ignore no-explicit-any
type SB=any;
const SITS=['processando','na_fila','autorizada','rejeitada','erro_comunicacao','desconhecida','contingencia','cancelada'];
/** Aplica no banco o retorno oficial da SEFAZ trazido pelo Coletor. Só autoriza com chave + protocolo. */
export async function aplicarRetorno(admin:SB,op:SB,r:SB){
 const e=op.estabelecimento_id,b=op.parametros??{};const nota=op.nota_id?(await admin.from('notas_fiscais').select('*').eq('id',op.nota_id).single()).data:null;
 const situacao=r.situacao?situacaoRetorno(r):undefined;
 if(nota&&['emitir','consultar'].includes(op.acao)){
  if(!SITS.includes(situacao))throw new Error('Situação não reconhecida no retorno fiscal');
  const v:SB={situacao,status:situacao==='autorizada'?'emitida':situacao==='cancelada'?'cancelada':'pronta',status_sefaz:r.status_sefaz!=null?String(r.status_sefaz):null,mensagem_sefaz:String(r.mensagem??'').slice(0,2000),updated_at:new Date().toISOString()};
  if(r.chave)v.chave=r.chave;if(r.protocolo)v.protocolo=r.protocolo;if(r.xml)v.xml=r.xml;if(situacao==='autorizada')v.emitida_em=new Date().toISOString();
  const {error}=await admin.from('notas_fiscais').update(v).eq('id',nota.id);if(error)throw error;
  if(situacao==='autorizada'&&nota.ambiente==='homologacao')await admin.from('fiscal_engine_config').update({homologado:true,ultimo_teste:new Date().toISOString(),mensagem:'Autorização real em homologação: '+r.protocolo}).eq('estabelecimento_id',e);
 }
 if(['cancelamento','carta_correcao','inutilizacao','manifestar'].includes(op.acao)){
  const aceito=r.aceito===true&&!!r.protocolo;
  if(op.acao==='cancelamento'&&aceito){const {error}=await admin.from('notas_fiscais').update({status:'cancelada',situacao:'cancelada',status_sefaz:String(r.status_sefaz??101),mensagem_sefaz:r.mensagem}).eq('id',nota.id);if(error)throw error;}
  const {error}=await admin.from('nfe_eventos').insert({estabelecimento_id:e,nota_id:nota?.id??null,tipo:op.acao==='manifestar'?b.evento:op.acao,situacao:aceito?'aceito':'rejeitado',justificativa:b.texto??null,protocolo:r.protocolo??null,sequencia:Number(r.sequencia)||1,dados:{unidade_id:b.unidade_id??nota?.unidade_id,status_sefaz:r.status_sefaz,mensagem:r.mensagem,xml:r.xml??null,chave:b.chave??null,numero_inicial:b.inicio??null,numero_final:b.fim??null},usuario_id:op.usuario_id});if(error)throw error;
  if(op.acao==='manifestar'&&r.xml_documento&&b.chave)await admin.from('fiscal_dfe_documentos').update({xml:r.xml_documento}).eq('chave',b.chave).eq('estabelecimento_id',e);
 }
 if(op.acao==='distribuir'){
  if(!/^\d{15}$/.test(r.ultimo_nsu??'')||!/^\d{15}$/.test(r.max_nsu??'')||!Array.isArray(r.documentos))throw new Error('Resposta DF-e inválida');
  for(const d of r.documentos){if(!/^\d{15}$/.test(d.nsu??''))throw new Error('NSU inválido');const {error}=await admin.from('fiscal_dfe_documentos').upsert({estabelecimento_id:e,unidade_id:b.unidade_id,ambiente:b.ambiente,nsu:d.nsu,chave:d.chave??null,esquema:d.esquema,documento:d.resumo??{},xml:d.xml??null},{onConflict:'unidade_id,ambiente,nsu'});if(error)throw error;}
  const espera=Math.max(3600,Number(r.aguardar_segundos)||3600);
  await admin.from('fiscal_dfe_controle').upsert({estabelecimento_id:e,unidade_id:b.unidade_id,ambiente:b.ambiente,ultimo_nsu:r.ultimo_nsu,max_nsu:r.max_nsu,ultima_consulta:new Date().toISOString(),proxima_consulta:r.ultimo_nsu===r.max_nsu||r.documentos.length===0?new Date(Date.now()+espera*1000).toISOString():new Date().toISOString(),status:String(r.status_sefaz??''),mensagem:r.mensagem},{onConflict:'unidade_id,ambiente'});
 }
 if(nota)await admin.from('nfe_transmissoes').insert({estabelecimento_id:e,nota_id:nota.id,resultado:situacao??(r.aceito?'aceito':'rejeitado'),codigo_status:r.status_sefaz!=null?String(r.status_sefaz):null,mensagem:r.mensagem,usuario_id:op.usuario_id});
 const seguro={situacao:situacao??(r.aceito?'aceito':'rejeitado'),aceito:r.aceito,protocolo:r.protocolo,mensagem:r.mensagem,status_sefaz:r.status_sefaz,ultimo_nsu:r.ultimo_nsu,max_nsu:r.max_nsu,documentos_recebidos:r.documentos?.length};
 await admin.from('fiscal_operacoes').update({situacao:'concluida',resposta:seguro,erro:null,updated_at:new Date().toISOString()}).eq('id',op.id);
 return seguro;
}
