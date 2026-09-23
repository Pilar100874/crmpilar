/**
 * Eventos usados pelo painel de detalhes para navegar no Atendimento
 * (abrir o chat do cliente ou começar um novo e-mail) sem precisar
 * passar callbacks por todas as abas.
 */

const EVENTO_CHAT = "atendimento:abrir-chat-contato";
const EVENTO_EMAIL = "atendimento:novo-email-contato";

export interface ContatoChatEvento {
  customerId?: string;
  nome?: string;
  whatsapp?: string;
}

export interface ContatoEmailEvento {
  email?: string;
  nome?: string;
}

export function abrirChatDoContato(detalhe: ContatoChatEvento) {
  window.dispatchEvent(new CustomEvent(EVENTO_CHAT, { detail: detalhe }));
}

export function ouvirAbrirChatDoContato(handler: (detalhe: ContatoChatEvento) => void) {
  const ouvinte = (evento: Event) => handler((evento as CustomEvent<ContatoChatEvento>).detail || {});
  window.addEventListener(EVENTO_CHAT, ouvinte);
  return () => window.removeEventListener(EVENTO_CHAT, ouvinte);
}

export function novoEmailParaContato(detalhe: ContatoEmailEvento) {
  window.dispatchEvent(new CustomEvent(EVENTO_EMAIL, { detail: detalhe }));
}

export function ouvirNovoEmailParaContato(handler: (detalhe: ContatoEmailEvento) => void) {
  const ouvinte = (evento: Event) => handler((evento as CustomEvent<ContatoEmailEvento>).detail || {});
  window.addEventListener(EVENTO_EMAIL, ouvinte);
  return () => window.removeEventListener(EVENTO_EMAIL, ouvinte);
}

const EVENTO_HISTORICO = "atendimento:abrir-historico-contato";

export interface ContatoHistoricoEvento {
  customerId?: string;
  nome?: string;
}

export function abrirHistoricoDoContato(detalhe: ContatoHistoricoEvento) {
  window.dispatchEvent(new CustomEvent(EVENTO_HISTORICO, { detail: detalhe }));
}

export function ouvirAbrirHistoricoDoContato(handler: (detalhe: ContatoHistoricoEvento) => void) {
  const ouvinte = (evento: Event) => handler((evento as CustomEvent<ContatoHistoricoEvento>).detail || {});
  window.addEventListener(EVENTO_HISTORICO, ouvinte);
  return () => window.removeEventListener(EVENTO_HISTORICO, ouvinte);
}

