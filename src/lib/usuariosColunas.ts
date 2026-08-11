/**
 * Colunas públicas da tabela `usuarios`.
 * As colunas de credenciais (senha_hash, senha_email, senha_sip, ramal_senha)
 * não são legíveis pelo cliente — use o RPC `get_minhas_credenciais()`.
 */
export const USUARIO_COLUNAS_PUBLICAS = [
  "id",
  "nome",
  "email",
  "whatsapp",
  "unidade_id",
  "grupo_acesso_id",
  "created_at",
  "updated_at",
  "estabelecimento_id",
  "smtp",
  "porta_smtp",
  "pop",
  "porta_pop",
  "usar_autenticacao",
  "hora_inicial",
  "hora_final",
  "auth_user_id",
  "ramal",
  "usuario_sip",
  "imap",
  "porta_imap",
  "segmento_id",
  "whatsapp_numero_id",
  "ativo",
  "tipo",
  "whatsapp_status",
  "whatsapp_status_at",
  "whatsapp_status_reason",
].join(", ");
