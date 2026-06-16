import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Gift,
  Truck,
  Star,
  CreditCard,
  Tag,
  Bell,
  MessageCircle,
  Sparkles,
  Image as ImageIcon,
  Maximize2,
  Percent,
  Ticket,
} from "lucide-react";

/**
 * Live visual mini-previews of e-commerce rule action blocks.
 *
 * Each renderer returns a thumbnail of what the customer will actually see
 * on the storefront. Clicking the thumbnail opens a larger zoomed preview.
 *
 * To add a new visual preview:
 *   1. Add a case in `renderThumb` (mini) and optionally `renderFull` (zoom).
 *   2. Add the type to PREVIEW_SUPPORTED below so FlowNode renders it.
 *
 * Styling lives in one place so the visual identity stays in sync.
 */
export const ECOMMERCE_PREVIEW_SUPPORTED = new Set<string>([
  "acao_banner_promocional",
  "acao_popup_promocional",
  "acao_mensagem_carrinho",
  "acao_desconto_percentual",
  "acao_desconto_fixo",
  "acao_desconto_progressivo",
  "acao_compre_x_leve_y",
  "acao_frete_gratis",
  "acao_desconto_frete",
  "acao_frete_fixo",
  "acao_brinde",
  "acao_destaque_vitrine",
  "acao_parcelas_extras",
  "acao_desconto_pix",
  "acao_desconto_boleto",
  "acao_popup_personalizado",
  "acao_oferecer_cupom_instantaneo",
  "acao_chat_proativo",
  "acao_notificacao_navegador",
  "acao_destacar_elemento",
  "acao_enviar_lembrete_carrinho",
]);

const MSG_TYPE_STYLES: Record<string, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  sucesso: "bg-green-50 border-green-200 text-green-800",
  alerta: "bg-yellow-50 border-yellow-200 text-yellow-800",
  urgencia: "bg-red-50 border-red-200 text-red-800",
};

function PercentBadge({ value, label }: { value: string; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-3 py-2 shadow-sm">
      <div className="text-lg font-extrabold leading-none">{value}</div>
      {label && <div className="text-[9px] uppercase tracking-wider opacity-90 mt-0.5">{label}</div>}
    </div>
  );
}

function renderThumb(type: string, c: any): JSX.Element | null {
  switch (type) {
    case "acao_banner_promocional":
      return (
        <div
          className="rounded-md overflow-hidden w-full h-16 flex items-center gap-2 px-2 shadow-inner"
          style={{ backgroundColor: c.corFundo || "#f59e0b" }}
        >
          {c.imagem ? (
            <img src={c.imagem} alt="" className="h-12 w-12 object-cover rounded" />
          ) : (
            <div className="h-12 w-12 rounded bg-white/20 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white/80" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-white text-[11px] font-bold truncate">
              {c.titulo || "Banner promocional"}
            </div>
            {c.link && (
              <div className="text-white/80 text-[9px] truncate underline">{c.link}</div>
            )}
          </div>
        </div>
      );

    case "acao_popup_promocional":
    case "acao_popup_personalizado":
      return (
        <div className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
          {c.imagem ? (
            <img src={c.imagem} alt="" className="w-full h-14 object-cover" />
          ) : (
            <div className="w-full h-10 bg-muted flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="p-2 text-center">
            <div className="text-[11px] font-bold text-foreground truncate">
              {c.titulo || "Popup promocional"}
            </div>
            {c.mensagem && (
              <div className="text-[9px] text-muted-foreground truncate">{c.mensagem}</div>
            )}
            <div className="mt-1 inline-block bg-primary text-primary-foreground text-[9px] font-medium px-2 py-0.5 rounded-full">
              {c.botaoTexto || "Aproveitar!"}
            </div>
          </div>
        </div>
      );

    case "acao_mensagem_carrinho": {
      const style = MSG_TYPE_STYLES[c.tipoMensagem || "info"] || MSG_TYPE_STYLES.info;
      return (
        <div className={`rounded-md border px-2 py-1.5 text-[11px] ${style}`}>
          {c.mensagem || "Mensagem no carrinho"}
        </div>
      );
    }

    case "acao_desconto_percentual":
      return (
        <div className="flex items-center gap-2">
          <PercentBadge value={`${c.percentual ?? 10}%`} label="OFF" />
          <div className="text-[11px] text-muted-foreground">no carrinho</div>
        </div>
      );

    case "acao_desconto_fixo":
      return (
        <div className="flex items-center gap-2">
          <PercentBadge value={`R$ ${c.valor ?? 20}`} label="DESCONTO" />
          <div className="text-[11px] text-muted-foreground">no pedido</div>
        </div>
      );

    case "acao_desconto_progressivo": {
      const faixas: any[] = c.faixas || [];
      return (
        <div className="space-y-1">
          {(faixas.length ? faixas : [{ valorMin: 100, percentual: 5 }, { valorMin: 200, percentual: 10 }])
            .slice(0, 3)
            .map((f, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                <span className="text-emerald-800">a partir de R$ {f.valorMin}</span>
                <span className="font-bold text-emerald-700">{f.percentual}%</span>
              </div>
            ))}
        </div>
      );
    }

    case "acao_compre_x_leve_y":
      return (
        <div className="rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-3 py-2 text-center shadow-sm">
          <div className="text-[10px] uppercase tracking-wider opacity-90">Promoção</div>
          <div className="text-sm font-extrabold">Compre {c.quantidadeCompra ?? 2} Leve {c.quantidadeLeva ?? 3}</div>
        </div>
      );

    case "acao_frete_gratis":
      return (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2">
          <Truck className="w-5 h-5 text-emerald-600" />
          <div>
            <div className="text-[11px] font-bold text-emerald-800">Frete Grátis</div>
            {c.valorMinimo && (
              <div className="text-[9px] text-emerald-700">acima de R$ {c.valorMinimo}</div>
            )}
          </div>
        </div>
      );

    case "acao_desconto_frete":
      return (
        <div className="flex items-center gap-2 rounded-md bg-sky-50 border border-sky-200 px-3 py-2">
          <Truck className="w-5 h-5 text-sky-600" />
          <div className="text-[11px] font-bold text-sky-800">
            {c.percentual ?? 50}% off no frete
          </div>
        </div>
      );

    case "acao_frete_fixo":
      return (
        <div className="flex items-center gap-2 rounded-md bg-indigo-50 border border-indigo-200 px-3 py-2">
          <Truck className="w-5 h-5 text-indigo-600" />
          <div className="text-[11px] font-bold text-indigo-800">
            Frete fixo R$ {c.valor ?? 9.9}
          </div>
        </div>
      );

    case "acao_brinde":
      return (
        <div className="flex items-center gap-2 rounded-md bg-pink-50 border border-pink-200 px-3 py-2">
          <Gift className="w-5 h-5 text-pink-600" />
          <div>
            <div className="text-[11px] font-bold text-pink-800">Brinde grátis</div>
            <div className="text-[9px] text-pink-700 truncate">{c.produtoNome || "Produto brinde"}</div>
          </div>
        </div>
      );

    case "acao_destaque_vitrine":
      return (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
          <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
          <div className="text-[11px] font-bold text-amber-800">Destaque na vitrine</div>
        </div>
      );

    case "acao_parcelas_extras":
      return (
        <div className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
          <CreditCard className="w-5 h-5 text-slate-600" />
          <div className="text-[11px] font-bold text-slate-800">
            Até {c.numeroParcelas ?? 12}x sem juros
          </div>
        </div>
      );

    case "acao_desconto_pix":
      return (
        <div className="flex items-center gap-2 rounded-md bg-teal-50 border border-teal-200 px-3 py-2">
          <Percent className="w-5 h-5 text-teal-600" />
          <div className="text-[11px] font-bold text-teal-800">
            {c.percentual ?? 5}% off no PIX
          </div>
        </div>
      );

    case "acao_desconto_boleto":
      return (
        <div className="flex items-center gap-2 rounded-md bg-orange-50 border border-orange-200 px-3 py-2">
          <Percent className="w-5 h-5 text-orange-600" />
          <div className="text-[11px] font-bold text-orange-800">
            {c.percentual ?? 5}% off no Boleto
          </div>
        </div>
      );

    case "acao_oferecer_cupom_instantaneo":
      return (
        <div className="rounded-md border-2 border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-emerald-600" />
          <div>
            <div className="text-[10px] text-emerald-700 uppercase">Cupom</div>
            <div className="text-xs font-extrabold tracking-wider text-emerald-800">
              {c.codigo || "PROMO10"}
            </div>
          </div>
        </div>
      );

    case "acao_chat_proativo":
      return (
        <div className="rounded-md bg-card border border-border px-2.5 py-2 shadow-sm max-w-[180px]">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-foreground">Atendimento</span>
          </div>
          <div className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
            {c.mensagem || "Olá! Posso ajudar?"}
          </div>
        </div>
      );

    case "acao_notificacao_navegador":
      return (
        <div className="rounded-md bg-card border border-border px-2 py-1.5 shadow-md max-w-[200px]">
          <div className="flex items-start gap-1.5">
            <Bell className="w-3.5 h-3.5 text-primary mt-0.5" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-foreground truncate">
                {c.titulo || "Nova notificação"}
              </div>
              <div className="text-[10px] text-muted-foreground line-clamp-2">
                {c.mensagem || "Confira nossas ofertas!"}
              </div>
            </div>
          </div>
        </div>
      );

    case "acao_destacar_elemento":
      return (
        <div className="rounded-md bg-muted/40 p-2 flex items-center justify-center">
          <div className="relative">
            <div className="w-14 h-6 rounded bg-primary/20 border-2 border-primary animate-pulse" />
            <Sparkles className="w-3 h-3 text-primary absolute -top-1 -right-1" />
          </div>
        </div>
      );

    case "acao_enviar_lembrete_carrinho":
      return (
        <div className="rounded-md bg-card border border-border px-2 py-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Tag className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-semibold text-foreground">
              {c.canal === "email" ? "Email" : c.canal === "whatsapp" ? "WhatsApp" : "Lembrete"}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground line-clamp-2">
            {c.mensagem || "Você esqueceu itens no carrinho!"}
          </div>
        </div>
      );

    default:
      return null;
  }
}

/** Larger version used in the zoom dialog. Falls back to the thumb. */
function renderFull(type: string, c: any): JSX.Element {
  switch (type) {
    case "acao_banner_promocional":
      return (
        <div
          className="rounded-xl overflow-hidden w-full"
          style={{ backgroundColor: c.corFundo || "#f59e0b" }}
        >
          <div className="flex flex-col items-center gap-4 p-6">
            {c.imagem && (
              <img src={c.imagem} alt="Banner" className="max-h-72 rounded-lg object-cover" />
            )}
            {c.titulo && (
              <h2 className="font-bold text-white text-center text-2xl">{c.titulo}</h2>
            )}
            {c.link && <span className="text-white/80 text-sm underline">{c.link}</span>}
          </div>
        </div>
      );

    case "acao_popup_promocional":
    case "acao_popup_personalizado":
      return (
        <div className="bg-background border border-border rounded-xl shadow-2xl max-w-md mx-auto overflow-hidden">
          {c.imagem && <img src={c.imagem} alt="" className="w-full max-h-64 object-cover" />}
          <div className="p-6 text-center space-y-3">
            <h3 className="font-bold text-xl">{c.titulo || "Popup promocional"}</h3>
            {c.mensagem && <p className="text-muted-foreground text-sm">{c.mensagem}</p>}
            <button className="w-full bg-primary text-primary-foreground rounded-md py-2 font-medium">
              {c.botaoTexto || "Aproveitar!"}
            </button>
          </div>
        </div>
      );

    case "acao_mensagem_carrinho": {
      const style = MSG_TYPE_STYLES[c.tipoMensagem || "info"] || MSG_TYPE_STYLES.info;
      return (
        <div className={`rounded-lg border p-6 text-base ${style}`}>
          {c.mensagem || "Mensagem de exemplo no carrinho"}
        </div>
      );
    }

    default:
      // Render scaled-up version of thumb
      return <div className="scale-150 origin-top">{renderThumb(type, c)}</div>;
  }
}

interface Props {
  type: string;
  config: any;
}

export const EcommerceLivePreview = ({ type, config }: Props) => {
  const [open, setOpen] = useState(false);
  const thumb = renderThumb(type, config || {});
  if (!thumb) return null;

  return (
    <>
      <div className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
            Pré-visualização
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Ampliar"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="block w-full text-left cursor-zoom-in"
        >
          {thumb}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pré-visualização ampliada</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-muted/30 rounded-lg overflow-auto max-h-[70vh]">
            {renderFull(type, config || {})}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EcommerceLivePreview;
