import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import {enderecoPublico,faltasTributacaoFiscal} from '../_shared/fiscal/regras.ts';
const json=(b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
const Body=z.object({operacao:z.string().min(1).max(60),destino:z.string().max(20),emitente:z.record(z.unknown()),destinatario:z.record(z.unknown()),itens:z.array(z.record(z.unknown())).min(1).max(500),finalidade_nfe:z.number().int().min(1).max(4).optional(),destinacao:z.string().nullable().optional(),presenca_comprador:z.string().nullable().optional(),nota_id:z.string().uuid().optional(),origem:z.string().max(60).optional()});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 let admin:any,audit:any;
 try{
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!anon||!key)throw new Error('Serviço indisponível');
 const auth=req.headers.get('Authorization')??'';const sb=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:claims,error}=await sb.auth.getClaims(auth.replace(/^Bearer /i,''));if(error||!claims?.claims?.sub)return json({error:'Não autenticado'},401);
 const {data:interno}=await sb.rpc('is_usuario_interno',{_uid:claims.claims.sub});if(!interno)return json({error:'Acesso interno obrigatório'},403);
 const parsed=Body.safeParse(await req.json());if(!parsed.success)return json({error:parsed.error.flatten().fieldErrors},400);
 const {data:est}=await sb.rpc('get_auth_user_estabelecimento_id');const {data:usuario}=await sb.rpc('get_current_usuario_id_safe');if(!est||!usuario)return json({error:'Usuário sem empresa'},403);
 const {nota_id,origem,...consulta}=parsed.data;
 if(nota_id){const {data:n}=await sb.from('notas_fiscais').select('id').eq('id',nota_id).eq('estabelecimento_id',est).maybeSingle();if(!n)return json({error:'Nota não disponível'},403);}
 admin=createClient(url,key);const {data:registro,error:erroRegistro}=await admin.from('fiscal_consultas_systax').insert({estabelecimento_id:est,nota_id:nota_id??null,origem:origem??'faturamento',requisicao:consulta,usuario_id:usuario,versao_integracao:'pilar-systax-v2'}).select('id').single();if(erroRegistro)throw new Error('Não foi possível registrar a consulta tributária');audit=registro;
 const {data:cfg}=await admin.from('systax_config').select('*').eq('estabelecimento_id',est).maybeSingle();if(!cfg?.url_api||!cfg?.token)throw new Error('Motor fiscal Systax não configurado (Fiscal → Configuração Systax)');
 const headers:Record<string,string>={'Content-Type':'application/json',Accept:'application/json',Authorization:`Bearer ${cfg.token}`};if(cfg.licenca)headers['X-Licenca']=cfg.licenca;if(cfg.usuario)headers['X-Usuario']=cfg.usuario;
 const resp=await fetch(enderecoPublico(cfg.url_api),{method:'POST',headers,body:JSON.stringify({ambiente:cfg.ambiente,...consulta}),signal:AbortSignal.timeout(40000),redirect:'error'});
 if(!resp.ok)throw new Error(`Systax recusou a consulta (${resp.status})`);const corpo=await resp.json();const itens=Array.isArray(corpo)?corpo:corpo?.itens??corpo?.items??corpo?.resultado??[];
 if(!Array.isArray(itens)||itens.length!==consulta.itens.length)throw new Error('Retorno do Systax sem a tributação de todos os itens');
 const faltas=itens.flatMap((i:any,k:number)=>faltasTributacaoFiscal(i).map(f=>`Item ${k+1}: ${f}`));if(faltas.length)throw new Error('Retorno tributário incompleto: '+faltas.join(', '));
 const {error:erroAudit}=await admin.from('fiscal_consultas_systax').update({resposta:{itens},sucesso:true}).eq('id',audit.id);if(erroAudit)throw new Error('Falha no registro da resposta tributária');return json({itens,consulta_id:audit.id});
 }catch(e){const mensagem=e instanceof Error?e.message:'Erro inesperado';if(admin&&audit)await admin.from('fiscal_consultas_systax').update({sucesso:false,erro:mensagem}).eq('id',audit.id);return json({error:mensagem},502);}
});
