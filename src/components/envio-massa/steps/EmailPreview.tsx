import { ContentItem, ContactForBulkSend } from '../types';
import { montarEmail } from '../emailMensagem';

export function EmailPreview({ itens, contato }: { itens: ContentItem[]; contato: ContactForBulkSend }) {
  const email = montarEmail(itens, contato);
  return <div className="min-w-0 space-y-3">
    <div className="border-b pb-3 text-sm space-y-1"><p className="break-all text-muted-foreground">Para: {contato.nome} &lt;{contato.email}&gt;</p><p className="font-semibold break-words">{email.subject || 'Sem assunto'}</p></div>
    <iframe title="Prévia do e-mail" sandbox="" srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;margin:12px;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style></head><body>${email.html}</body></html>`} className="w-full h-[360px] border-0 rounded bg-card" />
  </div>;
}