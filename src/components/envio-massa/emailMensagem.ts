import { ContentItem, ContactForBulkSend } from './types';

export function substituirVariaveisEmail(texto: string, contato: ContactForBulkSend) {
  const valores: Record<string, string> = { contato: contato.nome, empresa: contato.empresa || '', whatsapp: contato.telefone || '', email: contato.email || '' };
  return texto.replace(/\{\{(contato|empresa|whatsapp|email)\}\}/gi, (_, chave: string) => valores[chave.toLowerCase()] || '');
}
export function escaparHtmlEmail(texto: string) {
  return texto.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}
export function montarEmail(itens: ContentItem[], contato: ContactForBulkSend) {
  const subject = substituirVariaveisEmail(itens[0]?.emailSubject || '', contato).replace(/[\r\n]/g, ' ').trim();
  const body = itens.map(i => substituirVariaveisEmail(i.content, contato)).join('\n\n');
  const html = itens.map(i => {
    const texto = escaparHtmlEmail(substituirVariaveisEmail(i.content, contato));
    if (i.type === 'image' && i.mediaUrl && /^https?:\/\//i.test(i.mediaUrl)) {
      return `<p><img src="${escaparHtmlEmail(i.mediaUrl)}" alt="${texto}" width="600" style="max-width:100%;height:auto" /></p>`;
    }
    if (i.mediaUrl && /^https?:\/\//i.test(i.mediaUrl)) return `<p><a href="${escaparHtmlEmail(i.mediaUrl)}">${texto}</a></p>`;
    return `<p>${texto.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  return { subject, body, html };
}