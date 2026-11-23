import {createClient} from 'npm:@supabase/supabase-js@2';
import {corsHeaders} from 'npm:@supabase/supabase-js@2/cors';
import {z} from 'npm:zod@3';
import {encodeBase64} from 'jsr:@std/encoding@1/base64';
import {aplicarRetorno} from '../_shared/fiscal/aplicar.ts';
/** Ponte do módulo Fiscal do Coletor: entrega a fila (com certificado A1) e recebe os retornos da SEFAZ. */
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...corsHeaders,'Content-Type':'application/json'}});
const Body=z.object({chave:z.string().min(4).max(80),acao:z.enum(['pendentes','resultado','falha','preparar']),chave_nfe:z.string().regex(/^\d{44}$/).optional(),xml:z.string().max(2000000).optional(),operacao_id:z.string().uuid().optional(),retorno:z.record(z.unknown()).optional(),erro:z.string().max(2000).optional()});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 try{
  const p=Body.safeParse(await req.json());if(!p.success)return json({error:'Requisição inválida'},400);const b=p.data;
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:reg}=await admin.from('automacao_app_chaves').select('id,estabelecimento_id,bloqueado,app').eq('chave',b.chave.trim().toUpperCase()).maybeSingle();
  if(!reg||reg.app!=='coletor'||reg.bloqueado)return json({error:'Chave do Coletor inválida ou bloqueada'},403);
  const e=reg.estabelecimento_id;await admin.from('automacao_app_chaves').update({ultima_comunicacao:new Date().toISOString()}).eq('id',reg.id);
  if(b.acao==='pendentes'){
   const {data:cfg}=await admin.from('fiscal_engine_config').select('habilitado').eq('estabelecimento_id',e).maybeSingle();if(!cfg?.habilitado)return json({operacoes:[]});
   await admin.from('fiscal_operacoes').update({situacao:'pendente'}).eq('estabelecimento_id',e).eq('situacao','processando').lt('coletado_em',new Date(Date.now()-600000).toISOString()).lt('tentativas',5);
   const {data:ops}=await admin.from('fiscal_operacoes').select('*').eq('estabelecimento_id',e).eq('situacao','pendente').order('created_at').limit(3);
   const out=[];const certs=new Map<string,unknown>();
   for(const op of ops??[]){
    const {data:ok}=await admin.from('fiscal_operacoes').update({situacao:'processando',coletado_em:new Date().toISOString(),tentativas:op.tentativas+1}).eq('id',op.id).eq('situacao','pendente').select('id');if(!ok?.length)continue;
    const prm=op.parametros??{};let nota=null,dest=null,transp=null;
    if(op.nota_id){nota=(await admin.from('notas_fiscais').select('*,notas_fiscais_itens(*,produtos(codigo,cest,origem,gtin,ean_13))').eq('id',op.nota_id).eq('estabelecimento_id',e).single()).data;
     if(nota?.empresa_id)dest=(await admin.from('empresas').select('nome,nome_fantasia,cnpj,inscricao_estadual,contribuinte_icms,endereco,numero,complemento,bairro,cidade,estado,cep,telefone,email').eq('id',nota.empresa_id).single()).data;
     const tid=nota?.transportadora_id??nota?.dados_emissao?.transportadora_id;if(tid)transp=(await admin.from('empresas').select('nome,cnpj,inscricao_estadual,endereco,cidade,estado').eq('id',tid).maybeSingle()).data;}
    const uid=nota?.unidade_id??prm.unidade_id;const {data:un}=await admin.from('unidades').select('*').eq('id',uid).eq('estabelecimento_id',e).single();
    if(!un?.certificado_path){await admin.from('fiscal_operacoes').update({situacao:'erro_comunicacao',erro:'Certificado A1 não cadastrado na unidade'}).eq('id',op.id);continue;}
    if(!certs.has(uid)){const {data:arq,error}=await admin.storage.from('certificados-digitais').download(un.certificado_path);const {data:s}=await admin.from('unidade_certificado_senhas').select('senha').eq('unidade_id',uid).maybeSingle();if(error||!s?.senha){await admin.from('fiscal_operacoes').update({situacao:'erro_comunicacao',erro:'Certificado ou senha indisponível'}).eq('id',op.id);continue;}certs.set(uid,{pfx_base64:encodeBase64(new Uint8Array(await arq.arrayBuffer())),senha:s.senha});}
    let serie=null;if(prm.serie_id)serie=(await admin.from('nfe_series').select('serie').eq('id',prm.serie_id).eq('estabelecimento_id',e).single()).data;
    let controle=null;if(op.acao==='distribuir')controle=(await admin.from('fiscal_dfe_controle').select('ultimo_nsu').eq('unidade_id',uid).eq('ambiente',prm.ambiente).maybeSingle()).data;
    const {certificado_path:_c,...unidade}=un;
    out.push({id:op.id,acao:op.acao,tentativa:op.tentativas+1,parametros:prm,ambiente:nota?.ambiente??prm.ambiente,nota,destinatario:dest,transportadora:transp,unidade,serie:serie?.serie??null,ultimo_nsu:controle?.ultimo_nsu??'000000000000000',certificado:certs.get(uid)});
   }
   return json({operacoes:out});
  }
  const {data:op}=await admin.from('fiscal_operacoes').select('*').eq('id',b.operacao_id).eq('estabelecimento_id',e).maybeSingle();if(!op)return json({error:'Operação não encontrada'},404);
  if(op.situacao==='concluida')return json({ok:true,repetido:true});
  if(b.acao==='preparar'){if(!op.nota_id||op.acao!=='emitir'||!b.chave_nfe||!b.xml?.includes(`Id="NFe${b.chave_nfe}"`))return json({error:'Preparação inválida'},400);const {error}=await admin.from('notas_fiscais').update({chave:b.chave_nfe,xml:b.xml}).eq('id',op.nota_id).neq('situacao','autorizada');if(error)throw error;return json({ok:true});}
  if(b.acao==='falha'){await admin.from('fiscal_operacoes').update({situacao:op.tentativas>=5?'erro_comunicacao':'pendente',erro:b.erro??'Falha no Coletor',updated_at:new Date().toISOString()}).eq('id',op.id);if(op.nota_id&&op.tentativas>=5)await admin.from('notas_fiscais').update({situacao:'erro_comunicacao',mensagem_sefaz:b.erro}).eq('id',op.nota_id);return json({ok:true});}
  return json(await aplicarRetorno(admin,op,b.retorno??{}));
 }catch(err){return json({error:err instanceof Error?err.message:'Falha'},500);}
});
