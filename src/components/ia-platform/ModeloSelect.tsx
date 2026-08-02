import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Descrições amigáveis dos modelos disponíveis na plataforma. */
export const MODELOS_INFO: Record<string, { rotulo: string; descricao: string; grupo: string }> = {
  "claude-opus-4-6": { rotulo: "Claude Opus 4.6", descricao: "Máxima qualidade — tarefas longas e complexas", grupo: "Claude (Anthropic)" },
  "claude-sonnet-4-5": { rotulo: "Claude Sonnet 4.5", descricao: "Equilíbrio entre qualidade e custo (recomendado)", grupo: "Claude (Anthropic)" },
  "claude-haiku-4-5": { rotulo: "Claude Haiku 4.5", descricao: "Rápido e barato — tarefas simples", grupo: "Claude (Anthropic)" },
  "google/gemini-3.6-flash": { rotulo: "Gemini 3.6 Flash", descricao: "Muito rápido, ótimo custo-benefício", grupo: "Google (Lovable AI)" },
  "google/gemini-3.1-pro-preview": { rotulo: "Gemini 3.1 Pro", descricao: "Raciocínio avançado e contexto grande", grupo: "Google (Lovable AI)" },
  "openai/gpt-5.5": { rotulo: "GPT-5.5", descricao: "Alto desempenho em análise e código", grupo: "OpenAI (Lovable AI)" },
  "openai/gpt-5.4-mini": { rotulo: "GPT-5.4 Mini", descricao: "Leve e econômico para grande volume", grupo: "OpenAI (Lovable AI)" },
};

export const MODELOS_DISPONIVEIS = Object.keys(MODELOS_INFO);

interface Props {
  value: string;
  onChange: (valor: string) => void;
  /** Permite a opção "Padrão do agente / sistema" com valor "". */
  permitirPadrao?: boolean;
  rotuloPadrao?: string;
  disabled?: boolean;
  className?: string;
}

export function ModeloSelect({
  value,
  onChange,
  permitirPadrao,
  rotuloPadrao = "Padrão do sistema",
  disabled,
  className,
}: Props) {
  const grupos = Array.from(new Set(MODELOS_DISPONIVEIS.map((m) => MODELOS_INFO[m].grupo)));
  const valorAtual = value || (permitirPadrao ? "__padrao__" : value);

  return (
    <Select
      value={valorAtual}
      disabled={disabled}
      onValueChange={(v) => onChange(v === "__padrao__" ? "" : v)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Escolha o modelo" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {permitirPadrao && <SelectItem value="__padrao__">{rotuloPadrao}</SelectItem>}
        {grupos.map((g) => (
          <SelectGroup key={g}>
            <SelectLabel>{g}</SelectLabel>
            {MODELOS_DISPONIVEIS.filter((m) => MODELOS_INFO[m].grupo === g).map((m) => (
              <SelectItem key={m} value={m}>
                <span className="flex flex-col text-left">
                  <span>{MODELOS_INFO[m].rotulo}</span>
                  <span className="text-xs text-muted-foreground">{MODELOS_INFO[m].descricao}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
