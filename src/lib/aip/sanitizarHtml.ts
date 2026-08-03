import DOMPurify from "dompurify";

export interface ResultadoSanitizacao {
  html: string;
  /** Quantidade de nós/atributos perigosos removidos (scripts, handlers, iframes...). */
  removidos: number;
}

/** Meta CSP injetada no documento isolado: bloqueia script, form e navegação externa. */
const CSP_META =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; ' +
  "img-src data: blob: https:; media-src data: blob: https:; style-src 'unsafe-inline'; " +
  "font-src data: https:; form-action 'none'; base-uri 'none'; frame-src 'none'; script-src 'none'\">";

/**
 * Remove scripts, handlers inline e conteúdo ativo do HTML do artefato,
 * devolvendo um documento pronto para exibir dentro de um iframe isolado.
 */
export function sanitizarHtmlArtefato(bruto: string): ResultadoSanitizacao {
  let removidos = 0;
  const contar = () => {
    removidos += 1;
  };

  DOMPurify.addHook("uponSanitizeElement", (_node, data) => {
    if (data.allowedTags[data.tagName] === false) contar();
  });
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (!data.allowedAttributes[data.attrName]) contar();
  });

  const limpo = DOMPurify.sanitize(bruto, {
    WHOLE_DOCUMENT: true,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "base", "meta", "link"],
    FORBID_ATTR: ["srcdoc", "formaction", "ping"],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
  });

  DOMPurify.removeAllHooks();

  const doc = /<head[\s>]/i.test(limpo)
    ? limpo.replace(/<head([\s>])/i, (m) => `${m}`).replace(/<head([^>]*)>/i, `<head$1>${CSP_META}`)
    : `<!doctype html><html><head>${CSP_META}</head><body>${limpo}</body></html>`;

  return { html: doc, removidos };
}

/** Atributo sandbox usado nos iframes de pré-visualização (sem scripts, sem same-origin). */
export const SANDBOX_PREVIEW = "";
