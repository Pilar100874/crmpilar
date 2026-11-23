import {createClient} from 'npm:@supabase/supabase-js@2';
import {corsHeaders} from 'npm:@supabase/supabase-js@2/cors';
import {z} from 'npm:zod@3';
import {enderecoPublico,faltasTributacaoFiscal,situacaoRetorno} from '../_shared/fiscal/regras.ts';
const Body=z.object({acao:z.enum(['testar','emitir','consultar','arquivo','cancelamento','carta_correcao','inutilizacao','distribuir','manifestar','servico']),nota_id:z.string().uuid().optional(),unidade_id:z.string().uuid().optional(),tipo:z.enum(['xml','danfe']).optional(),evento:z.enum(['ciencia','confirmacao','desconhecimento','nao_realizada']).optional(),chave:z.string().regex(/^\d{44}$/).optional(),texto:z.string().max(1000).optional(),serie_id:z.string().uuid().optional(),inicio:z.number().int().min(1).max(999999999).optional(),fim:z.number().int().min(1).max(999999999).optional(),ambiente:z.enum(['homologacao','producao']).optional(),idempotencia:z.string().max(200).optional()});
const json=(b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 let admin:any;let operacao:any;let tx:any;let est:any;let usuario:any;
 try{
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!anon||!key)throw new Error('Serviço indisponível');
 const auth=req.headers.get('Authorization')??'';const sb=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:claims,error:ae}=await sb.auth.getClaims(auth.replace(/^Bearer /i,''));if(ae||!claims?.claims?.sub)return json({error:'Não autenticado'},401);
 const {data:interno}=await sb.rpc('is_usuario_interno',{_uid:claims.claims.sub});if(!interno)return json({error:'Acesso interno obrigatório'},403);
 const parsed=Body.safeParse(await req.json());if(!parsed.success)return json({error:parsed.error.flatten().fieldErrors},400);const b=parsed.data;
 const {data:e}=await sb.rpc('get_auth_user_estabelecimento_id');const {data:u}=await sb.rpc('get_current_usuario_id_safe');est=e;usuario=u;if(!e||!u)return json({error:'Usuário sem empresa'},403);admin=createClient(url,key);
 const {data:cfg}=await admin.from('fiscal_engine_config').select('*').eq('estabelecimento_id',e).maybeSingle();if(!cfg?.url_api||!cfg?.token)return json({error:'Motor próprio não configurado. A emissão direta exige serviço fiscal externo homologado.'},409);
 let nota:any=null,unidade:any=null,serie:any=null;
 if(b.nota_id){const {data:n,error}=await sb.from('notas_fiscais').select('*,notas_fiscais_itens(*)').eq('id',b.nota_id).eq('estabelecimento_id',e).single();if(error)return json({error:'Nota não disponível'},404);nota=n;}
 if(['emitir','consultar','arquivo','cancelamento','carta_correcao'].includes(b.acao)&&!nota)return json({error:'Selecione a nota'},400);
 const uid=nota?.unidade_id??b.unidade_id;
 if(uid){const {data:un,error}=await sb.from('unidades').select('*').eq('id',uid).eq('estabelecimento_id',e).single();if(error)return json({error:'Unidade não disponível'},403);unidade=un;}
 if(['emitir','distribuir','manifestar','inutilizacao','servico'].includes(b.acao)&&!unidade)return json({error:'Selecione a unidade'},400);
 const ambiente=nota?.ambiente??b.ambiente??cfg.ambiente;
 if(b.acao!=='testar'&&(!cfg.habilitado||(ambiente==='producao'&&!cfg.homologado)))return json({error:'Motor não habilitado. Teste a conexão e homologue antes de transmitir.'},409);
 if(b.acao==='emitir'){
  if(nota.tipo!=='saida'||nota.motor_emissao!=='proprio'||!['rascunho','validada','rejeitada','erro_comunicacao','desconhecida'].includes(nota.situacao))return json({error:'Nota não disponível para emissão'},409);
  if(!unidade?.cnpj||!unidade.crt||!unidade.certificado_path||!unidade.certificado_valido_ate||new Date(unidade.certificado_valido_ate)<=new Date())return json({error:'Complete CNPJ, CRT e certificado A1 válido da unidade'},400);
  const {data:dest}=await sb.from('empresas').select('*').eq('id',nota.empresa_id).eq('estabelecimento_id',e).single();if(!dest?.cnpj||!dest?.endereco||!dest?.cidade||!dest?.estado||!dest?.cep)return json({error:'Complete documento e endereço do destinatário'},400);nota.destinatario=dest;
  if(!nota.notas_fiscais_itens.length||nota.notas_fiscais_itens.some((i:any)=>!i.produto_id||!(i.quantidade>0)||!/^\d{8}$/.test(i.ncm??'')||!i.unidade||faltasTributacaoFiscal(i.tributacao).length))return json({error:'Complete produtos e consulte o Systax antes de emitir'},400);
  const pagamentos=nota.dados_emissao?.pagamentos??[];if(!pagamentos.length||(!pagamentos.every((p:any)=>p.meio==='90')&&Math.abs(pagamentos.reduce((s:number,p:any)=>s+Number(p.valor),0)-Number(nota.valor_total))>.01))return json({error:'Confira os pagamentos'},400);
 }
 if(['cancelamento','carta_correcao'].includes(b.acao)&&nota.situacao!=='autorizada')return json({error:'Somente notas autorizadas recebem este evento'},409);
 if(['cancelamento','inutilizacao'].includes(b.acao)&&(!b.texto||b.texto.trim().length<15||b.texto.trim().length>255))return json({error:'Justificativa deve ter entre 15 e 255 caracteres'},400);
 if(b.acao==='carta_correcao'&&(!b.texto||b.texto.trim().length<15))return json({error:'Texto da correção deve ter pelo menos 15 caracteres'},400);
 if(b.acao==='inutilizacao'){
 if(!b.serie_id||!b.inicio||!b.fim||b.fim<b.inicio)return json({error:'Intervalo inválido'},400);
 const {data:s}=await sb.from('nfe_series').select('*').eq('id',b.serie_id).eq('unidade_id',uid).eq('ambiente',ambiente).eq('estabelecimento_id',e).single();if(!s)return json({error:'Série incompatível'},400);serie=s;
 const {data:usadas}=await sb.from('notas_fiscais').select('numero').eq('unidade_id',uid).eq('serie',String(s.serie)).eq('ambiente',ambiente).not('numero','is',null);if(usadas?.some((n:any)=>Number(n.numero)>=Number(b.inicio)&&Number(n.numero)<=Number(b.fim)))return json({error:'Intervalo contém número já utilizado'},409);
 }
 if(b.acao==='manifestar'&&(!b.chave||!b.evento))return json({error:'Escolha documento e manifestação'},400);
 let controle:any=null;
 if(b.acao==='distribuir'){const {data:c}=await admin.from('fiscal_dfe_controle').select('*').eq('unidade_id',uid).eq('ambiente',ambiente).maybeSingle();controle=c;if(c?.proxima_consulta&&new Date(c.proxima_consulta)>new Date())return json({error:'Nova consulta permitida após '+new Date(c.proxima_consulta).toLocaleString('pt-BR')},429);}
 if(['distribuir','manifestar'].includes(b.acao)&&!unidade?.certificado_path)return json({error:'Certificado A1 não cadastrado'},400);
 const mutacao=['emitir','cancelamento','carta_correcao','inutilizacao','manifestar','distribuir'].includes(b.acao);
 if(mutacao){const chave=b.acao==='emitir'?`emitir:${nota.id}`:b.idempotencia??`${b.acao}:${nota?.id??uid}:${b.evento??''}:${b.chave??''}:${b.inicio??''}:${b.fim??''}:${b.texto??''}`;
 const {data:op,error}=await admin.from('fiscal_operacoes').insert({estabelecimento_id:e,chave,acao:b.acao,nota_id:nota?.id??null,usuario_id:u}).select().single();if(error){const {data:existente}=await admin.from('fiscal_operacoes').select('*').eq('estabelecimento_id',e).eq('chave',chave).single();if(existente?.resposta)return json(existente.resposta);return json({error:'Operação já iniciada. Consulte a situação antes de repetir.'},409);}operacao=op;
 if(b.acao==='emitir'){const {data:r,error}=await sb.rpc('fiscal_reservar_nota',{p_nota:nota.id});if(error)throw error;nota.numero=r.numero;nota.serie=r.serie;await admin.from('notas_fiscais').update({status:'pronta',situacao:'processando',ref_externa:op.id}).eq('id',nota.id);}
 }
 const payload:any={...b,ambiente,estabelecimento_id:e,unidade,nota,serie,ultimo_nsu:controle?.ultimo_nsu??'000000000000000',idempotencia:operacao?.id??b.idempotencia};
 if(b.acao==='emitir'||b.acao==='distribuir'||b.acao==='manifestar'){
 if(!unidade?.certificado_path)return json({error:'Certificado A1 não cadastrado'},400);
 const {data:arquivo,error:ar}=await admin.storage.from('certificados-digitais').download(unidade.certificado_path);if(ar)throw new Error('Não foi possível obter certificado A1');
 const {data:senha}=await admin.from('unidade_certificado_senhas').select('senha').eq('unidade_id',uid).single();if(!senha?.senha)throw new Error('Senha do certificado não cadastrada');
 const bytes=new Uint8Array(await arquivo.arrayBuffer());let bin='';for(const byte of bytes)bin+=String.fromCharCode(byte);payload.certificado={pfx_base64:btoa(bin),senha:senha.senha};
 }
 const inicio=Date.now();const resp=await fetch(enderecoPublico(cfg.url_api).replace(/\/$/,'')+'/v1/fiscal',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${cfg.token}`,'Idempotency-Key':operacao?.id??crypto.randomUUID()},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000),redirect:'error'});
 if(b.acao==='arquivo'){if(!resp.ok)throw new Error('Arquivo indisponível no motor');const ct=resp.headers.get('Content-Type')??'';if(b.tipo==='danfe'&&!ct.includes('pdf')||b.tipo==='xml'&&!ct.includes('xml'))throw new Error('Formato de arquivo fiscal inválido');return new Response(await resp.arrayBuffer(),{headers:{...corsHeaders,'Content-Type':ct,'Content-Disposition':`attachment; filename="NFe.${b.tipo==='xml'?'xml':'pdf'}"`}});}
 const r=await resp.json();if(!resp.ok)throw new Error('Motor recusou a operação ('+resp.status+')');
 if(b.acao==='testar'){const ok=r.contrato==='pilar-fiscal-v1'&&r.capacidades?.xsd===true&&r.capacidades?.assinatura_a1===true&&r.capacidades?.transmissao_sefaz===true;const homologado=ok&&r.homologacao?.autorizada===true&&r.homologacao?.protocolo&&/^\d{44}$/.test(r.homologacao?.chave??'');await admin.from('fiscal_engine_config').update({habilitado:!!ok,homologado:!!homologado,ultimo_teste:new Date().toISOString(),mensagem:ok?'Contrato fiscal confirmado':'Contrato incompleto ou incompatível'}).eq('estabelecimento_id',e);return json({habilitado:!!ok,homologado:!!homologado,mensagem:ok?'Conexão validada':'O motor precisa implementar o contrato pilar-fiscal-v1'});}
 const situacao=situacaoRetorno(r);
 if(nota&&['emitir','consultar'].includes(b.acao)){
 if(!['processando','na_fila','autorizada','rejeitada','erro_comunicacao','desconhecida','contingencia','cancelada'].includes(situacao))throw new Error('Situação não reconhecida no retorno fiscal');
 const valores:any={situacao,status:situacao==='autorizada'?'emitida':situacao==='cancelada'?'cancelada':'pronta',status_sefaz:r.status_sefaz!=null?String(r.status_sefaz):null,mensagem_sefaz:String(r.mensagem??'').slice(0,2000),updated_at:new Date().toISOString()};if(r.chave)valores.chave=r.chave;if(r.protocolo)valores.protocolo=r.protocolo;if(r.xml)valores.xml=r.xml;
 if(situacao==='autorizada')valores.emitida_em=new Date().toISOString();const {error}=await admin.from('notas_fiscais').update(valores).eq('id',nota.id);if(error)throw error;
 }
 if(['cancelamento','carta_correcao','inutilizacao','manifestar'].includes(b.acao)){
 const aceito=r.aceito===true&&r.protocolo;if(b.acao==='cancelamento'&&aceito){const {error}=await admin.from('notas_fiscais').update({status:'cancelada',situacao:'cancelada',status_sefaz:String(r.status_sefaz??101),mensagem_sefaz:r.mensagem}).eq('id',nota.id);if(error)throw error;}
 const {error}=await admin.from('nfe_eventos').insert({estabelecimento_id:e,nota_id:nota?.id??null,tipo:b.acao==='manifestar'?b.evento:b.acao,situacao:aceito?'aceito':'rejeitado',justificativa:b.texto,protocolo:r.protocolo??null,dados:{unidade_id:uid,status_sefaz:r.status_sefaz,mensagem:r.mensagem,xml:r.xml??null,numero_inicial:b.inicio??null,numero_final:b.fim??null,serie:serie?.serie??null},usuario_id:u});if(error)throw error;
 }
 if(b.acao==='distribuir'){
 if(!/^\d{15}$/.test(r.ultimo_nsu??'')||!/^\d{15}$/.test(r.max_nsu??'')||!Array.isArray(r.documentos))throw new Error('Resposta DF-e inválida');
 for(const doc of r.documentos){if(!/^\d{15}$/.test(doc.nsu??''))throw new Error('NSU inválido');const {error}=await admin.from('fiscal_dfe_documentos').upsert({estabelecimento_id:e,unidade_id:uid,ambiente,nsu:doc.nsu,chave:doc.chave??null,esquema:doc.esquema,documento:doc.resumo??{},xml:doc.xml??null},{onConflict:'unidade_id,ambiente,nsu'});if(error)throw error;}
 const espera=Math.max(3600,Number(r.aguardar_segundos)||3600);await admin.from('fiscal_dfe_controle').upsert({estabelecimento_id:e,unidade_id:uid,ambiente,ultimo_nsu:r.ultimo_nsu,max_nsu:r.max_nsu,ultima_consulta:new Date().toISOString(),proxima_consulta:new Date(Date.now()+espera*1000).toISOString(),status:String(r.status_sefaz??''),mensagem:r.mensagem},{onConflict:'unidade_id,ambiente'});
 }
 if(nota){const {error}=await admin.from('nfe_transmissoes').insert({estabelecimento_id:e,nota_id:nota.id,resultado:situacao??(r.aceito?'aceito':'rejeitado'),codigo_status:r.status_sefaz!=null?String(r.status_sefaz):null,mensagem:r.mensagem,usuario_id:u});if(error)throw error;}
 const seguro={situacao:situacao??(r.aceito?'aceito':'rejeitado'),aceito:r.aceito,protocolo:r.protocolo,mensagem:r.mensagem,status_sefaz:r.status_sefaz,ultimo_nsu:r.ultimo_nsu,max_nsu:r.max_nsu,documentos_recebidos:r.documentos?.length};
 if(operacao)await admin.from('fiscal_operacoes').update({situacao:'concluida',resposta:seguro,updated_at:new Date().toISOString()}).eq('id',operacao.id);return json(seguro);
 }catch(e){const mensagem=e instanceof Error?e.message:'Falha fiscal';if(admin&&operacao){await admin.from('fiscal_operacoes').update({situacao:'erro_comunicacao',erro:mensagem,updated_at:new Date().toISOString()}).eq('id',operacao.id);if(operacao.nota_id)await admin.from('notas_fiscais').update({situacao:'erro_comunicacao',mensagem_sefaz:mensagem}).eq('id',operacao.nota_id);}
 return json({error:mensagem},502);}
});
