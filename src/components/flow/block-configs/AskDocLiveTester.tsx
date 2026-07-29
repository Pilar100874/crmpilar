import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { evaluateAskInput, normalizeAskInput, type AskKind } from "@/lib/cadastros/askValidation";

/**
 * Widget de teste para o admin experimentar em tempo real a máscara,
 * a normalização e a validação de CNPJ/CEP configuradas no bloco.
 * Exibe status acessível (aria-live) e botão "Tentar novamente".
 */
export function AskDocLiveTester({ kind }: { kind: AskKind }) {
  const [value, setValue] = useState("");
  const evalRes = evaluateAskInput(kind, value);
  const label = kind === "cnpj" ? "CNPJ" : "CEP";
  const placeholder = kind === "cnpj" ? "00.000.000/0000-00" : "00000-000";
  const isInvalid = evalRes.status === "invalid";

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
      <Label className="text-xs font-semibold text-foreground/80">
        Testar validação em tempo real ({label})
      </Label>
      <div className="flex gap-2 items-start">
        <Input
          value={value}
          onChange={(e) => setValue(normalizeAskInput(kind, e.target.value).masked)}
          placeholder={placeholder}
          inputMode="numeric"
          maxLength={kind === "cnpj" ? 18 : 9}
          aria-invalid={isInvalid || undefined}
          aria-describedby={`ask-doc-tester-${kind}`}
          className="h-8 text-sm"
        />
        <button
          type="button"
          onClick={() => setValue("")}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap px-2 py-1"
          aria-label={`Limpar ${label} e tentar novamente`}
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" /> Tentar novamente
        </button>
      </div>
      <div
        id={`ask-doc-tester-${kind}`}
        role={isInvalid ? "alert" : "status"}
        aria-live={isInvalid ? "assertive" : "polite"}
        aria-atomic="true"
        className={`text-xs min-h-[1rem] ${
          evalRes.status === "valid" ? "text-emerald-600"
          : isInvalid ? "text-destructive"
          : "text-muted-foreground"
        }`}
      >
        {evalRes.message}
        {evalRes.status === "valid" && (
          <span className="ml-2 text-muted-foreground">
            Dígitos normalizados: <code>{evalRes.digits}</code>
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        A mesma regra é aplicada no simulador, no webchat e no WhatsApp — respostas inválidas são rejeitadas
        e o bot repergunta automaticamente.
      </p>
    </div>
  );
}
