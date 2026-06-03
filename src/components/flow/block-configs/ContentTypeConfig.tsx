import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Megaphone, Info, MessageCircleQuestion, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import divulgacaoRef from "@/assets/content-type/divulgacao.jpg";
import promocaoRef from "@/assets/content-type/promocao.jpg";
import institucionalRef from "@/assets/content-type/institucional.jpg";
import eventoRef from "@/assets/content-type/evento.jpg";
import lancamentoRef from "@/assets/content-type/lancamento.jpg";
import educacionalRef from "@/assets/content-type/educacional.jpg";

interface ContentTypeConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const CONTENT_TYPE_PREVIEWS: Record<string, string> = {
  divulgacao: divulgacaoRef,
  promocao: promocaoRef,
  institucional: institucionalRef,
  evento: eventoRef,
  lancamento: lancamentoRef,
  educacional: educacionalRef,
};

export const CONTENT_TYPE_OPTIONS: Array<{ value: string; label: string; description: string; preview?: string }> = [
  {
    value: "divulgacao",
    label: "Divulgação",
    description:
      "Peça de divulgação/awareness. Foco em apresentar o produto, serviço ou marca de forma atrativa, com estética convidativa, sem oferta agressiva. Tom inspirador, lifestyle, aspiracional. Sem preços, sem percentuais de desconto.",
  },
  {
    value: "promocao",
    label: "Promoção",
    description:
      "Peça promocional/venda. Foco em oferta, urgência e conversão. Destaque visual para chamadas como OFERTA, DESCONTO, PROMOÇÃO. Tom energético, cores vibrantes, selos/badges de desconto quando fizer sentido. Composição comercial de varejo.",
  },
  {
    value: "institucional",
    label: "Institucional",
    description:
      "Peça institucional/branding. Foco em valores da marca, credibilidade e posicionamento. Estética sóbria, elegante, minimalista. Tipografia refinada, paleta corporativa, sem ar de varejo. Sem ofertas nem urgência.",
  },
  {
    value: "evento",
    label: "Evento",
    description:
      "Convite/anúncio de evento. Destaque para data, local e nome do evento. Estética de pôster/flyer, com forte hierarquia tipográfica e atmosfera condizente com o tema do evento.",
  },
  {
    value: "lancamento",
    label: "Lançamento",
    description:
      "Peça de lançamento de produto/serviço. Foco em novidade e expectativa. Selo NOVO/LANÇAMENTO em destaque, estética premium, dramática, com produto em primeiro plano e iluminação cinematográfica.",
  },
  {
    value: "educacional",
    label: "Educacional / Informativo",
    description:
      "Peça educacional/dica/conteúdo de valor. Estética clean, didática, com hierarquia clara de informação tipo carrossel/post de Instagram informativo. Sem apelo comercial agressivo.",
  },
  {
    value: "custom",
    label: "Personalizado",
    description: "Use apenas a orientação personalizada definida abaixo.",
  },
];

export const ContentTypeConfig = ({ config, handleConfigChange }: ContentTypeConfigProps) => {
  const mode: "fixed" | "ask" = config.mode === "ask" ? "ask" : "fixed";
  const selected = config.contentType || "divulgacao";
  const selectedMeta = CONTENT_TYPE_OPTIONS.find((o) => o.value === selected);

  return (
    <div className="space-y-4">
      <Alert className="border-pink-500/30 bg-pink-500/5">
        <Info className="h-4 w-4 text-pink-600" />
        <AlertDescription className="text-xs">
          Conecte este bloco <strong>antes</strong> de um bloco "Gerar Mídia IA".
          O tipo escolhido vira uma <strong>regra obrigatória</strong> que orienta a IA a
          gerar a imagem ou vídeo conforme o objetivo (divulgação, promoção, institucional...).
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">Tipo fixo</span>
        <Switch
          checked={mode === "ask"}
          onCheckedChange={(v) => handleConfigChange("mode", v ? "ask" : "fixed")}
        />
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MessageCircleQuestion className="h-3 w-3" />
          Pedir ao usuário
        </span>
      </div>

      {mode === "fixed" ? (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Megaphone className="h-3.5 w-3.5 text-pink-600" />
            Tipo de conteúdo
          </Label>
          <Select
            value={selected}
            onValueChange={(v) => handleConfigChange("contentType", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMeta && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {selectedMeta.description}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs">Pergunta enviada ao usuário</Label>
          <Input
            value={config.askPrompt || ""}
            onChange={(e) => handleConfigChange("askPrompt", e.target.value)}
            placeholder="Ex: Qual o objetivo da peça? (divulgacao, promocao, institucional...)"
          />
          <p className="text-[10px] text-muted-foreground">
            O usuário deve responder com uma das opções:{" "}
            {CONTENT_TYPE_OPTIONS.filter((o) => o.value !== "custom").map((o) => o.value).join(", ")}.
          </p>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-border">
        <Label className="text-xs">Orientação adicional (opcional)</Label>
        <Textarea
          value={config.customGuidance || ""}
          onChange={(e) => handleConfigChange("customGuidance", e.target.value)}
          placeholder="Ex: tom jovem, foco em público feminino 25-40 anos, paleta pastel..."
          rows={3}
        />
        <p className="text-[10px] text-muted-foreground">
          Será somada à orientação do tipo escolhido como regra obrigatória para a IA.
        </p>
      </div>
    </div>
  );
};
