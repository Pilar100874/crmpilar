import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, Type } from "lucide-react";
import { useRef, useState } from "react";

interface Props {
  title: string;
  description: string;
  footer: string;
  onChange: (patch: { mediaTitle?: string; mediaDescription?: string; mediaFooter?: string }) => void;
  /** opcional: placeholders custom para cada campo */
  placeholders?: { title?: string; description?: string; footer?: string };
}

const ICON_PRESETS: { label: string; char: string }[] = [
  { label: "Documento", char: "📄" },
  { label: "Relatório", char: "📊" },
  { label: "Gráfico", char: "📈" },
  { label: "Pasta", char: "📁" },
  { label: "Anexo", char: "📎" },
  { label: "Caixa", char: "📦" },
  { label: "Imagem", char: "🖼️" },
  { label: "Câmera", char: "📷" },
  { label: "Vídeo", char: "🎬" },
  { label: "Paleta", char: "🎨" },
  { label: "Magia", char: "✨" },
  { label: "Estrela", char: "⭐" },
  { label: "Fogo", char: "🔥" },
  { label: "Raio", char: "⚡" },
  { label: "Foguete", char: "🚀" },
  { label: "Lâmpada", char: "💡" },
  { label: "Joia", char: "💎" },
  { label: "Coração", char: "❤️" },
  { label: "Check", char: "✅" },
  { label: "Mão", char: "👉" },
  { label: "Sino", char: "🔔" },
  { label: "Robô", char: "🤖" },
  { label: "Mensagem", char: "💬" },
  { label: "Sorriso", char: "😊" },
  { label: "Carregando", char: "🔄" },
  { label: "Ampulheta", char: "⏳" },
  { label: "Telefone", char: "📞" },
  { label: "Lupa", char: "🔎" },
];

/**
 * Campos padrão de Título / Descrição / Rodapé enviados como LEGENDA
 * (caption) da mídia no WhatsApp. Usado em blocos que produzem uma
 * mídia de saída (catálogo PDF, relatório, mídia IA, mídia anexada).
 */
export const MediaCaptionFields = ({ title, description, footer, onChange, placeholders }: Props) => {
  const refs = {
    title: useRef<HTMLInputElement>(null),
    description: useRef<HTMLTextAreaElement>(null),
    footer: useRef<HTMLInputElement>(null),
  };
  const [openPicker, setOpenPicker] = useState<null | "title" | "description" | "footer">(null);

  const valueFor = (field: "title" | "description" | "footer") => {
    if (field === "title") return title || "";
    if (field === "description") return description || "";
    return footer || "";
  };

  const keyFor = (field: "title" | "description" | "footer") => {
    if (field === "title") return "mediaTitle" as const;
    if (field === "description") return "mediaDescription" as const;
    return "mediaFooter" as const;
  };

  const insertIcon = (field: "title" | "description" | "footer", icon: string) => {
    const el = refs[field].current;
    const current = valueFor(field);
    if (!el) {
      onChange({ [keyFor(field)]: current + icon } as any);
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + icon + current.slice(end);
    onChange({ [keyFor(field)]: next } as any);
    setTimeout(() => {
      el.focus();
      const pos = start + icon.length;
      try { el.setSelectionRange(pos, pos); } catch {}
    }, 0);
  };

  const Picker = ({ field }: { field: "title" | "description" | "footer" }) => (
    <Popover open={openPicker === field} onOpenChange={(o) => setOpenPicker(o ? field : null)}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 px-2 shrink-0" title="Inserir ícone">
          <Smile className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="text-[10px] text-muted-foreground mb-2 px-1">Clique para inserir no texto</p>
        <div className="grid grid-cols-7 gap-1">
          {ICON_PRESETS.map((icon) => (
            <button
              key={icon.char}
              type="button"
              title={icon.label}
              onClick={() => insertIcon(field, icon.char)}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-base transition-colors"
            >
              {icon.char}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Type className="h-3.5 w-3.5 text-muted-foreground" />
        <Label className="text-xs">Legenda enviada com a mídia (opcional)</Label>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">Título</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={refs.title}
            value={title || ""}
            onChange={(e) => onChange({ mediaTitle: e.target.value })}
            placeholder={placeholders?.title || "Ex.: 📄 Catálogo Pilar 2026"}
            className="h-8 text-xs flex-1"
          />
          <Picker field="title" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">Descrição</Label>
        <div className="flex items-start gap-2">
          <Textarea
            ref={refs.description}
            value={description || ""}
            onChange={(e) => onChange({ mediaDescription: e.target.value })}
            placeholder={placeholders?.description || "Texto principal enviado junto com o arquivo"}
            className="min-h-[56px] text-xs flex-1"
            rows={2}
          />
          <Picker field="description" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">Rodapé</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={refs.footer}
            value={footer || ""}
            onChange={(e) => onChange({ mediaFooter: e.target.value })}
            placeholder={placeholders?.footer || "Ex.: Dúvidas? Fale com nosso time."}
            className="h-8 text-xs flex-1"
          />
          <Picker field="footer" />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-tight pt-1">
        Título vai em negrito, descrição como corpo e rodapé em itálico — tudo concatenado como legenda da mídia no WhatsApp.
      </p>
    </div>
  );
};

/**
 * Concatena Título / Descrição / Rodapé como uma legenda formatada para
 * WhatsApp (negrito *...* e itálico _..._). Aceita fallback para o campo
 * `caption` legado.
 */
export const buildMediaCaptionText = (
  cfg: { mediaTitle?: string; mediaDescription?: string; mediaFooter?: string; caption?: string } | undefined,
  fallback = "",
): string => {
  if (!cfg) return fallback;
  const t = (cfg.mediaTitle || "").trim();
  const d = (cfg.mediaDescription || "").trim();
  const f = (cfg.mediaFooter || "").trim();
  const legacy = (cfg.caption || "").trim();
  const hasAny = t || d || f;
  if (!hasAny) return legacy || fallback;
  const parts: string[] = [];
  if (t) parts.push(`*${t}*`);
  if (d) parts.push(d);
  else if (legacy) parts.push(legacy);
  if (f) parts.push(`_${f}_`);
  return parts.join("\n\n");
};

export default MediaCaptionFields;
