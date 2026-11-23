import {createClient} from 'npm:@supabase/supabase-js@2';
import {corsHeaders} from 'npm:@supabase/supabase-js@2/cors';
import {z} from 'npm:zod@3';
import {faltasTributacaoFiscal} from '../_shared/fiscal/regras.ts';
/** Fila fiscal do CRM: valida e enfileira; o módulo Fiscal do Coletor transmite à SEFAZ (fiscal-coletor). */
const Body=z.object({acao:z.enum(['testar','emitir','consultar','arquivo','cancelamento','carta_correcao','inutilizacao','distribuir','manifestar','servico']),nota_id:z.string().uuid().optional(),unidade_id:z.string().uuid().optional(),tipo:z.enum(['xml','danfe']).optional(),evento:z.enum(['ciencia','confirmacao','desconhecimento','nao_realizada']).optional(),chave:z.string().regex(/^\d{44}$/).optional(),texto:z.string().max(1000).optional(),serie_id:z.string().uuid().optional(),inicio:z.number().int().min(1).max(999999999).optional(),fim:z.number().int().min(1).max(999999999).optional(),ambiente:z.enum(['homologacao','producao']).optional(),idempotencia:z.string().max(200).optional()});
const json=(b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
const dormir=(ms:number)=>new Promise(r=>setTimeout(r,ms));
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 try{
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const auth=req.headers.get('Authorization')??'';const sb=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:claims,error:ae}=await sb.auth.getClaims(auth.replace(/^Bearer /i,''));if(ae||!claims?.claims?.sub)return json({error:'Não autenticado'},401);
 const {data:interno}=await sb.rpc('is_usuario_interno',{_uid:claims.claims.sub});if(!interno)return json({error:'Acesso interno obrigatório'},403);
 const parsed=Body.safeParse(await req.json());if(!parsed.success)return json({error:parsed.error.flatten().fieldErrors},400);const b=parsed.data;
 const {data:e}=await sb.rpc('get_auth_user_estabelecimento_id');const {data:u}=await sb.rpc('get_current_usuario_id_safe');if(!e||!u)return json({error:'Usuário sem empresa'},403);const admin=createClient(url,key);
 const {data:cfg}=await admin.from('fiscal_engine_config').select('*').eq('estabelecimento_id',e).maybeSingle();
 let nota:any=null;
 if(b.nota_id){const {data:n,error}=await sb.from('notas_fiscais').select('*,notas_fiscais_itens(*)').eq('id',b.nota_id).eq('estabelecimento_id',e).single();if(error)return json({error:'Nota não disponível'},404);nota=n;}
 if(b.acao==='arquivo'){if(!nota?.xml)return json({error:'XML autorizado ainda não disponível'},404);return new Response(nota.xml,{headers:{...corsHeaders,'Content-Type':'application/xml'}});}
 if(b.acao==='testar'){
  const {data:coletores,error:ce}=await admin.from('automacao_app_chaves').select('id,nome,fiscal_ultima_comunicacao,fiscal_versao').eq('estabelecimento_id',e).eq('app','coletor').eq('bloqueado',false).order('fiscal_ultima_comunicacao',{ascending:false,nullsFirst:false});if(ce)throw ce;
  const online=(coletores??[]).some(k=>k.fiscal_ultima_comunicacao&&Date.now()-new Date(k.fiscal_ultima_comunicacao).getTime()<120000);
  return json({habilitado:!!cfg?.habilitado,homologado:!!cfg?.homologado,ambiente:cfg?.ambiente??'homologacao',coletor_online:online,coletores:coletores??[],mensagem:online?'Módulo fiscal conectado':'Nenhum módulo fiscal conectado nos últimos 2 minutos'});
 }
 if(!cfg?.habilitado)return json({error:'Emissão pelo Coletor desativada (Fiscal → Motor próprio NF-e)'},409);
 if(['emitir','consultar','cancelamento','carta_correcao'].includes(b.acao)&&!nota)return json({error:'Selecione a nota'},400);
 const uid=nota?.unidade_id??b.unidade_id;if(!uid)return json({error:'Selecione a unidade'},400);
 const {data:unidade}=await sb.from('unidades').select('*').eq('id',uid).eq('estabelecimento_id',e).single();if(!unidade)return json({error:'Unidade não disponível'},403);
 const ambiente=nota?.ambiente??b.ambiente??cfg.ambiente;
 if(ambiente==='producao'&&!cfg.homologado)return json({error:'Produção bloqueada até uma autorização real em homologação'},409);
 if(!unidade.certificado_path||!unidade.certificado_valido_ate||new Date(unidade.certificado_valido_ate)<=new Date())return json({error:'Cadastre um certificado A1 válido na unidade'},400);
 if(b.acao==='emitir'){
  if(nota.tipo!=='saida'||nota.motor_emissao!=='proprio'||!['rascunho','validada','rejeitada','erro_comunicacao','desconhecida'].includes(nota.situacao))return json({error:'Nota não disponível para emissão'},409);
  if(!unidade.cnpj||!unidade.crt||!unidade.inscricao_estadual||!unidade.logradouro||!unidade.cidade||!unidade.uf||!unidade.cep)return json({error:'Complete CNPJ, IE, CRT e endereço da unidade'},400);
  const {data:dest}=await sb.from('empresas').select('*').eq('id',nota.empresa_id).eq('estabelecimento_id',e).single();if(!dest?.cnpj||!dest?.endereco||!dest?.cidade||!dest?.estado||!dest?.cep)return json({error:'Complete documento e endereço do destinatário'},400);
  if(!nota.notas_fiscais_itens.length||nota.notas_fiscais_itens.some((i:any)=>!i.produto_id||!(i.quantidade>0)||!/^\d{8}$/.test(i.ncm??'')||!i.unidade||faltasTributacaoFiscal(i.tributacao).length))return json({error:'Complete produtos e consulte o Systax antes de emitir'},400);
  const pg=nota.dados_emissao?.pagamentos??[];if(!pg.length||(!pg.every((p:any)=>p.meio==='90')&&Math.abs(pg.reduce((s:number,p:any)=>s+Number(p.valor),0)-Number(nota.valor_total))>.01))return json({error:'Confira os pagamentos'},400);
 }
 if(['cancelamento','carta_correcao'].includes(b.acao)&&nota.situacao!=='autorizada')return json({error:'Somente notas autorizadas recebem este evento'},409);
 if(['cancelamento','inutilizacao'].includes(b.acao)&&(!b.texto||b.texto.trim().length<15||b.texto.trim().length>255))return json({error:'Justificativa deve ter entre 15 e 255 caracteres'},400);
 if(b.acao==='carta_correcao'&&(!b.texto||b.texto.trim().length<15))return json({error:'Texto da correção deve ter pelo menos 15 caracteres'},400);
 if(b.acao==='inutilizacao'){if(!b.serie_id||!b.inicio||!b.fim||b.fim<b.inicio)return json({error:'Intervalo inválido'},400);const {data:s}=await sb.from('nfe_series').select('*').eq('id',b.serie_id).eq('unidade_id',uid).eq('ambiente',ambiente).single();if(!s)return json({error:'Série incompatível'},400);const {data:us}=await sb.from('notas_fiscais').select('numero').eq('unidade_id',uid).eq('serie',String(s.serie)).eq('ambiente',ambiente).not('numero','is',null);if(us?.some((n:any)=>Number(n.numero)>=b.inicio!&&Number(n.numero)<=b.fim!))return json({error:'Intervalo contém número já utilizado'},409);}
 if(b.acao==='manifestar'&&(!b.chave||!b.evento))return json({error:'Escolha documento e manifestação'},400);
 if(b.acao==='manifestar'&&b.evento==='nao_realizada'&&(!b.texto||b.texto.trim().length<15))return json({error:'Justificativa obrigatória'},400);
 if(b.acao==='distribuir'){const {data:c}=await admin.from('fiscal_dfe_controle').select('proxima_consulta').eq('unidade_id',uid).eq('ambiente',ambiente).maybeSingle();if(c?.proxima_consulta&&new Date(c.proxima_consulta)>new Date())return json({error:'Nova consulta permitida após '+new Date(c.proxima_consulta).toLocaleString('pt-BR')},429);}
 let sequencia:number|undefined;if(b.acao==='carta_correcao'){const {count}=await admin.from('nfe_eventos').select('id',{count:'exact',head:true}).eq('nota_id',nota.id).eq('tipo','carta_correcao').eq('situacao','aceito');sequencia=(count??0)+1;if(sequencia>20)return json({error:'Limite de 20 cartas de correção atingido'},409);}
 const chave=b.acao==='emitir'?`emitir:${nota.id}:${nota.situacao==='rejeitada'?nota.updated_at:'1'}`:b.idempotencia??`${b.acao}:${nota?.id??uid}:${b.evento??''}:${b.chave??''}:${b.inicio??''}:${b.fim??''}:${b.texto??''}:${['consultar','servico','distribuir'].includes(b.acao)?Math.floor(Date.now()/30000):''}`;
 const {data:op,error:eo}=await admin.from('fiscal_operacoes').insert({estabelecimento_id:e,chave,acao:b.acao,nota_id:nota?.id??null,usuario_id:u,situacao:'pendente',parametros:{...b,unidade_id:uid,ambiente,sequencia}}).select().single();
 if(eo){const {data:x}=await admin.from('fiscal_operacoes').select('*').eq('estabelecimento_id',e).eq('chave',chave).single();if(x?.resposta)return json(x.resposta);return json({situacao:'na_fila',mensagem:'Operação já está na fila do Coletor'});}
 if(b.acao==='emitir'){const {error}=await sb.rpc('fiscal_reservar_nota',{p_nota:nota.id});if(error){await admin.from('fiscal_operacoes').delete().eq('id',op.id);throw error;}await admin.from('notas_fiscais').update({status:'pronta',situacao:'na_fila',ref_externa:op.id}).eq('id',nota.id);}
 for(let i=0;i<12;i++){await dormir(2500);const {data:x}=await admin.from('fiscal_operacoes').select('situacao,resposta,erro').eq('id',op.id).single();if(x?.situacao==='concluida')return json(x.resposta);if(x?.situacao==='erro_comunicacao')return json({error:x.erro??'Falha de comunicação'},502);}
 return json({situacao:'na_fila',mensagem:'Na fila do Coletor. Consulte a situação em instantes; o Coletor precisa estar ligado.'});
 }catch(err){return json({error:err instanceof Error?err.message:'Falha fiscal'},502);}
});
