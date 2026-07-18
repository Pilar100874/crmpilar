import { Card } from "@/components/ui/card";
import { MessageSquare, Phone, Copy, ExternalLink, QrCode, Image as ImageIcon, Video } from "lucide-react";

interface LiveBlockPreviewProps {
  type: string;
  config: any;
}

/**
 * Live preview of the block as it appears to the end-user in WhatsApp /
 * chat. Renders title, description, footer, media, buttons, cards, etc.
 * based on the block type. Updates live with config changes.
 */
const Bubble = ({ children, className = "" }: any) => (
  <div
    className={
      "max-w-full rounded-2xl rounded-tl-sm bg-[#dcf8c6] dark:bg-emerald-900/40 text-foreground px-3 py-2 shadow-sm text-sm whitespace-pre-wrap break-words " +
      className
    }
  >
    {children}
  </div>
);

const MediaPreview = ({ url, type }: { url?: string; type?: string }) => {
  if (!url) {
    return (
      <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        {type === "video" ? <Video className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
        <span className="ml-2 text-xs">Sem mídia</span>
      </div>
    );
  }
  if (type === "video" || /\.(mp4|webm|mov)$/i.test(url)) {
    return <video src={url} controls className="w-full rounded-lg max-h-56 bg-black" />;
  }
  if (type === "audio" || /\.(mp3|ogg|wav|m4a)$/i.test(url)) {
    return <audio src={url} controls className="w-full" />;
  }
  return (
    <img
      src={url}
      alt="preview"
      className="w-full rounded-lg max-h-56 object-cover bg-muted"
      onError={(e) => ((e.currentTarget.style.display = "none"))}
    />
  );
};

const PreviewButton = ({ icon: Icon, label }: any) => (
  <div className="border-t border-border/60 first:border-t-0 py-2 px-3 text-center text-sm text-primary font-medium flex items-center justify-center gap-2 hover:bg-muted/40 cursor-default">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {label || "Botão"}
  </div>
);

const Header = ({ title }: { title: string }) => (
  <div className="px-3 pt-2 text-sm font-semibold text-foreground">{title}</div>
);

const Title = ({ children }: any) =>
  children ? <div className="px-3 pt-1 font-semibold leading-tight">{children}</div> : null;
const Body = ({ children }: any) =>
  children ? (
    <div className="px-3 py-1 text-sm whitespace-pre-wrap break-words">{children}</div>
  ) : null;
const Footer = ({ children }: any) =>
  children ? <div className="px-3 pb-2 text-xs italic text-muted-foreground">{children}</div> : null;

/** Bloco padrão título/descrição/rodapé enviado como legenda da mídia */
const MediaCaption = ({ c }: { c: any }) => {
  const t = c?.mediaTitle;
  const d = c?.mediaDescription || c?.caption;
  const f = c?.mediaFooter;
  if (!t && !d && !f) return null;
  return (
    <>
      <Title>{t}</Title>
      <Body>{d}</Body>
      <Footer>{f}</Footer>
    </>
  );
};

export const LiveBlockPreview = ({ type, config }: LiveBlockPreviewProps) => {
  const c = config || {};

  const card = (
    children: React.ReactNode,
    extraClass = "",
  ) => (
    <Card className={`overflow-hidden bg-background border ${extraClass}`}>{children}</Card>
  );

  const renderInner = () => {
    switch (type) {
      case "send_message":
        return <Bubble>{c.message || c.text || "Mensagem do bot"}</Bubble>;

      case "goodbye": {
        const socials: { label: string; key: string }[] = [];
        if (c.showSocialButtons) {
          if (c.socialWhatsApp) socials.push({ label: "🟢 WhatsApp", key: "wa" });
          if (c.socialInstagram) socials.push({ label: "📸 Instagram", key: "ig" });
          if (c.socialFacebook) socials.push({ label: "📘 Facebook", key: "fb" });
          if (c.socialWebsite) socials.push({ label: "🌐 Website", key: "ws" });
          if (c.socialTiktok) socials.push({ label: "🎵 TikTok", key: "tt" });
          if (c.socialYoutube) socials.push({ label: "▶️ YouTube", key: "yt" });
          if (c.socialLinkedin) socials.push({ label: "💼 LinkedIn", key: "li" });
          if (c.socialTelegram) socials.push({ label: "✈️ Telegram", key: "tg" });
          if (c.socialTwitter) socials.push({ label: "🐦 X (Twitter)", key: "tw" });
          if (c.socialThreads) socials.push({ label: "🧵 Threads", key: "th" });
          if (c.socialPinterest) socials.push({ label: "📌 Pinterest", key: "pi" });
        }
        return (
          <>
            <Bubble>{c.message || "Até logo! 👋"}</Bubble>
            {socials.length > 0 && card(
              <>
                <Body>Nos acompanhe nas nossas redes:</Body>
                <div className="bg-muted/30">
                  {socials.map((s) => (
                    <PreviewButton key={s.key} label={s.label} />
                  ))}
                </div>
              </>,
              "mt-2"
            )}
            {c.showStartAgainButton !== false && card(
              <div className="bg-muted/30">
                <PreviewButton label="🔄 Recomeçar" />
              </div>,
              "mt-2"
            )}
          </>
        );
      }

      case "media": {
        const url = c.media?.url || c.url || "";
        const mtype = c.media?.type || c.mediaType || "image";
        const inner = c.media ? c.media : c;
        return card(
          <>
            <MediaPreview url={url} type={mtype} />
            <MediaCaption c={inner} />
          </>,
        );
      }

      case "reply_buttons": {
        const buttons = c.buttons || [];
        return card(
          <>
            {c.image && <MediaPreview url={c.image} type="image" />}
            {c.header && <Header title={c.header} />}
            <Body>{c.text || ""}</Body>
            <Footer>{c.footer}</Footer>
            <div className="bg-muted/30">
              {buttons.length === 0 ? (
                <div className="py-2 text-xs text-center text-muted-foreground">
                  Nenhum botão adicionado
                </div>
              ) : (
                buttons.map((b: any, i: number) => (
                  <PreviewButton key={i} label={b.label || b.text || b.displayText} />
                ))
              )}
            </div>
          </>,
        );
      }

      case "list_buttons": {
        const sections = c.sections || [];
        return card(
          <>
            {c.header && <Header title={c.header} />}
            <Body>{c.text || c.body || ""}</Body>
            <Footer>{c.footer}</Footer>
            <div className="bg-muted/30 max-h-60 overflow-auto">
              {sections.length === 0 && (
                <div className="py-2 text-xs text-center text-muted-foreground">
                  {c.buttonText || "Ver opções"}
                </div>
              )}
              {sections.map((s: any, i: number) => (
                <div key={i}>
                  <div className="px-3 pt-2 text-[11px] uppercase text-muted-foreground">
                    {s.title || `Seção ${i + 1}`}
                  </div>
                  {(s.rows || []).map((r: any, ri: number) => (
                    <PreviewButton key={ri} label={r.title || r.text || `Item ${ri + 1}`} />
                  ))}
                </div>
              ))}
            </div>
          </>,
        );
      }

      case "button_url":
        return card(
          <>
            <Title>{c.title}</Title>
            <Body>{c.description}</Body>
            <Footer>{c.footer}</Footer>
            <PreviewButton icon={ExternalLink} label={c.displayText || c.url || "Visitar"} />
          </>,
        );

      case "button_copy":
        return card(
          <>
            <Title>{c.title}</Title>
            <Body>{c.description}</Body>
            <Footer>{c.footer}</Footer>
            <PreviewButton icon={Copy} label={c.displayText || `Copiar ${c.copyCode || ""}`} />
          </>,
        );

      case "button_call":
        return card(
          <>
            <Title>{c.title}</Title>
            <Body>{c.description}</Body>
            <Footer>{c.footer}</Footer>
            <PreviewButton icon={Phone} label={c.displayText || c.phoneNumber || "Ligar"} />
          </>,
        );

      case "button_pix":
        return card(
          <>
            <Title>{c.title}</Title>
            <Body>{c.description}</Body>
            <div className="px-3 text-xs text-muted-foreground">
              {c.keyType?.toUpperCase()} • {c.pixKey || "chave pix"} • {c.name || ""}
            </div>
            <Footer>{c.footer}</Footer>
            <PreviewButton icon={QrCode} label={`Pagar com Pix (${c.currency || "BRL"})`} />
          </>,
        );

      case "buttons_mixed": {
        const buttons = c.buttons || [];
        const iconFor: any = { url: ExternalLink, copy: Copy, call: Phone, reply: MessageSquare };
        return card(
          <>
            <Title>{c.title}</Title>
            <Body>{c.description}</Body>
            <Footer>{c.footer}</Footer>
            <div className="bg-muted/30">
              {buttons.length === 0 ? (
                <div className="py-2 text-xs text-center text-muted-foreground">
                  Sem botões
                </div>
              ) : (
                buttons.map((b: any, i: number) => (
                  <PreviewButton key={i} icon={iconFor[b.type]} label={b.displayText || `Botão ${i + 1}`} />
                ))
              )}
            </div>
          </>,
        );
      }

      case "buttons_media": {
        const buttons = c.buttons || [];
        return card(
          <>
            <MediaPreview url={c.thumbnailUrl} type={c.mediaType || "image"} />
            <Title>{c.title}</Title>
            <Body>{c.description}</Body>
            <Footer>{c.footer}</Footer>
            <div className="bg-muted/30">
              {buttons.length === 0 ? (
                <div className="py-2 text-xs text-center text-muted-foreground">
                  Sem botões
                </div>
              ) : (
                buttons.map((b: any, i: number) => (
                  <PreviewButton key={i} label={b.displayText || `Botão ${i + 1}`} />
                ))
              )}
            </div>
          </>,
        );
      }

      case "carousel": {
        const cards = c.cards || [];
        if (c.mode === "dynamic") {
          return (
            <div className="text-xs text-muted-foreground italic px-2">
              Carrossel dinâmico — cards gerados em runtime a partir do catálogo
              {c.dynamicGrupoId && ` (grupo ${c.dynamicGrupoId})`}
              {c.dynamicCategoriaId && ` (categoria ${c.dynamicCategoriaId})`}.
            </div>
          );
        }
        return (
          <div className="space-y-2">
            <Title>{c.title}</Title>
            <Body>{c.description}</Body>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {cards.length === 0 && (
                <div className="text-xs text-muted-foreground py-4">Sem cards ainda</div>
              )}
              {cards.map((card: any, i: number) => (
                <Card key={i} className="min-w-[180px] max-w-[180px] overflow-hidden">
                  <MediaPreview url={card.header} type="image" />
                  <Body>{card.body}</Body>
                  <Footer>{card.footer}</Footer>
                  <PreviewButton label={card.buttonText || "Selecionar"} />
                </Card>
              ))}
            </div>
          </div>
        );
      }

      case "keyword_options": {
        const opts = c.buttons || c.options || [];
        return card(
          <>
            <Body>{c.question || "Escolha uma opção"}</Body>
            <div className="bg-muted/30">
              {opts.length === 0 ? (
                <div className="py-2 text-xs text-center text-muted-foreground">
                  Nenhuma opção adicionada
                </div>
              ) : (
                opts.map((o: any, i: number) => (
                  <div key={i}>
                    {o.imageUrl && <MediaPreview url={o.imageUrl} type="image" />}
                    <PreviewButton label={o.title || o.label || `Opção ${i + 1}`} />
                  </div>
                ))
              )}
            </div>
          </>,
        );
      }

      case "ask_influencer": {
        const mode = c.influencerMode === "selection" ? "selection" : "fixed";
        const fixedUrl = c.fixedInfluencerUrl;
        const thumbs: any[] = Array.isArray(c.allowedInfluencerThumbs) ? c.allowedInfluencerThumbs : [];
        return card(
          <>
            {c.headerTitle && <Header title={c.headerTitle} />}
            <Body>{c.askQuestion || "A peça terá um influencer?"}</Body>
            <Footer>{c.footer}</Footer>
            {mode === "fixed" ? (
              fixedUrl ? (
                <div className="px-3 pb-3">
                  <img
                    src={fixedUrl}
                    alt="Influencer"
                    className="w-24 h-24 rounded-lg object-cover border border-border mx-auto"
                  />
                </div>
              ) : (
                <div className="px-3 pb-2 text-[11px] text-muted-foreground italic">
                  Influencer fixo não selecionado
                </div>
              )
            ) : thumbs.length > 0 ? (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-4 gap-1.5">
                  {thumbs.slice(0, 8).map((t: any, i: number) => (
                    <img
                      key={t.id || i}
                      src={t.image_url}
                      alt={t.nome || `Influencer ${i + 1}`}
                      title={t.nome || ""}
                      className="aspect-square w-full rounded-md object-cover border border-border"
                    />
                  ))}
                  {thumbs.length > 8 && (
                    <div className="aspect-square w-full rounded-md bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground border border-border">
                      +{thumbs.length - 8}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-3 pb-2 text-[11px] text-muted-foreground italic">
                Usuário escolherá entre todos os influencers da galeria
              </div>
            )}
          </>,
        );
      }

      case "ask_product_image": {
        return card(
          <>
            {c.headerTitle && <Header title={c.headerTitle} />}
            <Body>{c.askQuestion || "A peça terá imagem do produto?"}</Body>
            <Footer>{c.footer}</Footer>
            <div className="bg-muted/30">
              <PreviewButton label="📦 Código do produto" />
              <PreviewButton label="📷 Tirar/enviar foto" />
              <PreviewButton label="✏️ Descrever em texto" />
            </div>
          </>,
        );
      }

      case "content_type": {
        const opts = c.options || c.types || [];
        return card(
          <>
            {c.header && <Header title={c.header} />}
            <Body>{c.question || c.text || "Escolha o tipo de conteúdo"}</Body>
            <Footer>{c.footer}</Footer>
            <div className="bg-muted/30">
              {opts.length === 0 ? (
                <div className="py-2 text-xs text-center text-muted-foreground">
                  Nenhuma opção configurada
                </div>
              ) : (
                opts.map((o: any, i: number) => (
                  <PreviewButton key={i} label={o.label || o.title || o.value || `Opção ${i + 1}`} />
                ))
              )}
            </div>
          </>,
        );
      }

      case "text_content": {
        const mode = c.mode || c.advancedMode;
        const opts = c.buttons || c.options || [];
        const isYesNo = !mode || mode === "yesno" || mode === "yes_no";
        return card(
          <>
            {c.header && <Header title={c.header} />}
            <Body>{c.text || c.question || c.message || "Texto do bloco"}</Body>
            <Footer>{c.footer}</Footer>
            <div className="bg-muted/30">
              {isYesNo ? (
                <>
                  <PreviewButton label="Sim" />
                  <PreviewButton label="Não" />
                </>
              ) : opts.length === 0 ? (
                <div className="py-2 text-xs text-center text-muted-foreground">
                  Nenhuma opção configurada
                </div>
              ) : (
                opts.map((o: any, i: number) => (
                  <PreviewButton key={i} label={o.label || o.title || `Opção ${i + 1}`} />
                ))
              )}
            </div>
          </>,
        );
      }

      case "opt_in_check":
      case "opt_in_out": {
        return card(
          <>
            {c.header && <Header title={c.header} />}
            <Body>{c.text || c.message || ""}</Body>
            <Footer>{c.footer}</Footer>
            <div className="bg-muted/30">
              <PreviewButton label={c.yesLabel || "Sim"} />
              <PreviewButton label={c.noLabel || "Não"} />
            </div>
          </>,
        );
      }

      case "message_template": {
        return card(
          <>
            {c.header && <Header title={c.header} />}
            <Body>{c.body || c.text || c.templateName || "Template do WhatsApp"}</Body>
            <Footer>{c.footer}</Footer>
            {(c.buttons || []).map((b: any, i: number) => (
              <PreviewButton key={i} label={b.text || b.label || `Botão ${i + 1}`} />
            ))}
          </>,
        );
      }

      case "ask_name":
      case "ask_question":
      case "ask_email":
      case "ask_number":
      case "ask_phone":
      case "ask_date":
      case "ask_file":
      case "ask_address":
      case "ask_url":
      case "ask_cnpj":
      case "ask_cep": {
        return <Bubble>{c.question || c.text || c.message || "Aguardando resposta..."}</Bubble>;
      }

      case "attach_catalog": {
        const waitEnabled = c.waitingMessageEnabled !== false;
        const waitMsg = c.waitingMessage || "⏳ Aguarde... gerando catálogo em tempo real.";
        return (
          <div className="space-y-2">
            {waitEnabled && <Bubble>{waitMsg}</Bubble>}
            {card(
              <>
                <div className="w-full aspect-[4/3] bg-muted flex flex-col items-center justify-center text-muted-foreground">
                  <div className="text-4xl">📎</div>
                  <div className="text-xs mt-1">Catálogo PDF</div>
                </div>
                <MediaCaption c={c} />
                <div className="px-3 pb-2 text-[11px] text-muted-foreground italic">
                  {c.mode === "specific"
                    ? `${(c.catalogIds?.length || 0)} catálogo(s) selecionado(s)`
                    : "Envia sempre o catálogo mais recente"}
                </div>
              </>,
            )}
          </div>
        );
      }

      case "crm_gerar_relatorio": {
        const out = (c.outputType || "pdf").toUpperCase();
        const reportVars = c.reportVariables ? Object.keys(c.reportVariables).length : 0;
        const apiVars = c.apiVariables ? Object.keys(c.apiVariables).length : 0;
        const waitEnabled = c.waitingMessageEnabled !== false;
        const waitMsg = c.waitingMessage || "⏳ Aguarde... gerando relatório em tempo real.";
        return (
          <div className="space-y-2">
            {waitEnabled && <Bubble>{waitMsg}</Bubble>}
            {card(
              <>
                <div className="w-full aspect-[4/3] bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 flex flex-col items-center justify-center text-indigo-700 dark:text-indigo-300">
                  <div className="text-4xl">📊</div>
                  <div className="text-xs mt-1 font-semibold">Relatório {out}</div>
                </div>
                <MediaCaption c={c} />
                <div className="px-3 pb-2 text-[11px] text-muted-foreground italic">
                  {c.relatorioId
                    ? `📄 ${c.relatorioNome || "Relatório selecionado"}${
                        reportVars + apiVars > 0
                          ? ` · ${reportVars} variável(eis) · ${apiVars} parâmetro(s)`
                          : ""
                      }`
                    : "Nenhum relatório selecionado"}
                </div>
              </>,
            )}
          </div>
        );
      }

      case "generate_ai_media": {
        const waitEnabled = c.waitingMessageEnabled !== false;
        const waitMsg = c.waitingMessage || "🎨 Gerando mídia, aguarde alguns instantes...";
        const mediaType = c.mediaType || "image";
        const variations = c.variations || 1;
        return (
          <div className="space-y-2">
            {waitEnabled && <Bubble>{waitMsg}</Bubble>}
            {card(
              <>
                <div className="w-full aspect-square bg-gradient-to-br from-fuchsia-50 to-purple-50 dark:from-fuchsia-950/40 dark:to-purple-950/40 flex flex-col items-center justify-center text-fuchsia-700 dark:text-fuchsia-300">
                  <div className="text-4xl">{mediaType === "video" ? "🎬" : "🖼️"}</div>
                  <div className="text-xs mt-1 font-semibold">
                    {mediaType === "video" ? "Vídeo IA" : "Imagem IA"} · {variations}x
                  </div>
                </div>
                <MediaCaption c={c} />
                <div className="px-3 pb-2 text-[11px] text-muted-foreground italic">
                  {c.aspectRatio ? `Proporção ${c.aspectRatio}` : "Mídia gerada por IA"}
                </div>
              </>,
            )}
          </div>
        );
      }

      case "mensagem_pre_definida": {
        const apresentacao = c.apresentacao || "texto";
        const escopo = c.escopo || "qualquer";
        const modo = c.modoSelecao || "rotacao";
        const modoLabel =
          modo === "aleatoria" ? "Aleatória" : modo === "fixa" ? "Frase fixa" : "Rotação sem repetir";
        const escopoLabel =
          escopo === "geral" ? "Geral" : escopo === "grupo" ? "Grupo específico" : "Qualquer frase";
        const tema = c.tema ? ` · Tema: ${c.tema}` : "";

        if (apresentacao === "midia") {
          const mediaType = c.mediaType || "image";
          const variations = c.variations || 1;
          return (
            <div className="space-y-2">
              <Bubble>💬 <i>Frase pré definida escolhida na hora do envio…</i></Bubble>
              {card(
                <>
                  <div className="w-full aspect-square bg-gradient-to-br from-fuchsia-50 to-purple-50 dark:from-fuchsia-950/40 dark:to-purple-950/40 flex flex-col items-center justify-center text-fuchsia-700 dark:text-fuchsia-300">
                    <div className="text-4xl">{mediaType === "video" ? "🎬" : "🖼️"}</div>
                    <div className="text-xs mt-1 font-semibold">
                      {mediaType === "video" ? "Vídeo IA" : "Imagem IA"} · {variations}x
                    </div>
                    {c.presetName && (
                      <div className="text-[10px] mt-1 opacity-80">Preset: {c.presetName}</div>
                    )}
                  </div>
                  <div className="px-3 py-2 text-[12px] whitespace-pre-wrap break-words">
                    <i className="text-muted-foreground">[frase selecionada aparecerá aqui]</i>
                  </div>
                  <div className="px-3 pb-2 text-[11px] text-muted-foreground italic">
                    {c.aspectRatio ? `Proporção ${c.aspectRatio}` : "Mídia gerada por IA"} · {modoLabel}
                  </div>
                </>,
              )}
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <Bubble>
              <i className="text-muted-foreground">[frase pré definida — {modoLabel}]</i>
            </Bubble>
            {card(
              <div className="px-3 py-2 text-[11px] text-muted-foreground">
                Escopo: {escopoLabel}{tema}
              </div>,
            )}
          </div>
        );
      }

      case "crm_cadastro_empresa": {
        const fields: any[] = c.campos || c.fields || [];
        return card(
          <>
            <Header title="🏢 Cadastro de Empresa" />
            <Body>{c.descricao || "Coleta dados e cria a empresa no CRM."}</Body>
            <div className="px-3 pb-2 text-[11px] text-muted-foreground italic">
              {fields.length > 0
                ? `${fields.length} campo(s) configurado(s)`
                : "Campos padrão (razão social, CNPJ, contato)"}
            </div>
          </>,
        );
      }

      case "crm_agenda_rapida": {
        return card(
          <>
            <Header title="📅 Agendar Compromisso" />
            <Body>{c.titulo || c.title || "Novo compromisso na agenda"}</Body>
            <div className="px-3 pb-2 text-[11px] text-muted-foreground italic">
              {c.duracao ? `Duração: ${c.duracao} min` : "Duração padrão"}
              {c.tipo ? ` · ${c.tipo}` : ""}
            </div>
          </>,
        );
      }

      default:
        return null;
    }
  };

  const inner = renderInner();
  if (!inner) return null;

  return (
    <div className="mb-4 rounded-xl border border-dashed bg-muted/30 p-3">
      <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-2">
        Pré-visualização ao vivo
      </div>
      <div className="max-w-sm">{inner}</div>
    </div>
  );
};

export default LiveBlockPreview;

/** Block types that have a meaningful live preview. */
export const PREVIEW_SUPPORTED_TYPES = new Set<string>([
  "send_message",
  "goodbye",
  "media",
  "reply_buttons",
  "list_buttons",
  "button_url",
  "button_copy",
  "button_call",
  "button_pix",
  "buttons_mixed",
  "buttons_media",
  "carousel",
  "keyword_options",
  "ask_influencer",
  "ask_product_image",
  "content_type",
  "text_content",
  "opt_in_check",
  "opt_in_out",
  "message_template",
  "ask_name",
  "ask_question",
  "ask_email",
  "ask_number",
  "ask_phone",
  "ask_date",
  "ask_file",
  "ask_address",
  "ask_url",
  "ask_cnpj",
  "ask_cep",
  "attach_catalog",
  "crm_gerar_relatorio",
  "crm_cadastro_empresa",
  "crm_agenda_rapida",
  "generate_ai_media",
]);
