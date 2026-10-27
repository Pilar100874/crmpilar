import { supabase } from '@/integrations/supabase/client';
import { montarEmail } from './emailMensagem';
import { ContentItem, ContactForBulkSend } from './types';
import { ResultadoEnvio } from './hooks/execucaoSequencial';

export async function enviarEmailMassa(itens: ContentItem[], contato: ContactForBulkSend, estabelecimentoId: string, usuarioId: string, dataRetorno: string): Promise<ResultadoEnvio> {
  if (!contato.email?.trim()) throw new Error('Contato sem e-mail');
  const mensagem = montarEmail(itens, contato);
  if (!mensagem.subject) throw new Error('Preencha o assunto do e-mail');
  const { data: configuracoes, error: configError } = await supabase.from('email_oauth_config').select('provider, enabled').eq('estabelecimento_id', estabelecimentoId);
  if (configError) throw new Error('Não foi possível consultar a configuração de e-mail');
  const funcao = configuracoes?.some(c => c.provider === 'google' && c.enabled) ? 'gmail-send-email' : 'send-email-smtp';
  const { data, error } = await supabase.functions.invoke(funcao, { body: { to: contato.email, ...mensagem } });
  if (error || data?.success !== true) throw new Error(data?.error || 'O serviço de e-mail não confirmou o envio');
  const { error: retornoError } = await supabase.from('calendario_tarefas').insert({ user_id: usuarioId, estabelecimento_id: estabelecimentoId, contact_id: contato.id, contact_name: contato.nome, title: 'Retorno: Envio em massa (E-mail)', description: mensagem.body.substring(0, 1000), date: dataRetorno, origem: 'envio_massa', origem_sub_item: 'email', status: 'pendente' });
  return { status: 'encaminhado', detalhe: retornoError ? 'Aceito pelo serviço de e-mail; falha ao registrar retorno. Não reenvie este e-mail.' : 'Aceito pelo serviço de e-mail; retorno registrado. Entrega não confirmada.' };
}