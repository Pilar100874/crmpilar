import { Percent, DollarSign, Truck, Bell, GitBranch, Gift, Calendar, Grid2x2, Rows3 } from "lucide-react";
import { WorkflowPreviewZoom } from "@/components/workflow/WorkflowPreviewZoom";

export const AUTOMACAO_PREVIEW_SUPPORTED = new Set<string>([
  "condicao_se",
  "logica_e",
  "logica_ou",
  "desconto_valor_compra",
  "desconto_aniversario_cliente",
  "desconto_aniversario_empresa",
  "desconto_data_especial",
  "acao_desconto_percentual",
  "acao_desconto_fixo",
  "aplicar_desconto",
  "acao_adicionar_frete",
  "acao_enviar_alerta",
]);

export function AutomacaoLivePreview({ type, config }: { type: string; config: any }) {
  const cfg = config || {};

  if (type === "condicao_se") {
    const conds: any[] = cfg.condicoes || [];
    const logic = cfg.logica || "E";
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <GitBranch className="w-3 h-3 text-blue-600" />
          <span className="text-[11px] font-semibold">SE ({logic})</span>
        </div>
        <div className="space-y-1">
          {conds.slice(0, 3).map((c, i) => (
            <div key={i} className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded truncate">
              {c.campo} {c.operador} {String(c.valor ?? "")}
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1.5">
          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">SIM →</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded">NÃO →</span>
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Condição SE" thumb={thumb} />;
  }

  if (type === "logica_e" || type === "logica_ou") {
    const isE = type === "logica_e";
    const thumb = (
      <div className={`rounded-lg border-2 p-3 flex flex-col items-center justify-center ${isE ? "bg-violet-50 border-violet-300" : "bg-purple-50 border-purple-300"}`}>
        {isE ? <Grid2x2 className="w-5 h-5 text-violet-600 mb-1" /> : <Rows3 className="w-5 h-5 text-purple-600 mb-1" />}
        <div className="text-sm font-bold">{isE ? "TODAS verdadeiras" : "PELO MENOS uma"}</div>
      </div>
    );
    return <WorkflowPreviewZoom title={isE ? "Operador E" : "Operador OU"} thumb={thumb} />;
  }

  if (type === "desconto_valor_compra" || type === "acao_desconto_percentual" || type === "aplicar_desconto") {
    const pct = cfg.percentual ?? cfg.valor ?? 0;
    const thumb = (
      <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-3 flex items-center gap-3">
        <Percent className="w-8 h-8 text-emerald-600" />
        <div className="flex-1">
          <div className="text-2xl font-extrabold text-emerald-700 leading-none">{pct}%</div>
          <div className="text-[10px] text-muted-foreground">de desconto no total</div>
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Desconto Percentual" thumb={thumb} />;
  }

  if (type === "acao_desconto_fixo") {
    const v = cfg.valor ?? 0;
    const thumb = (
      <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-3 flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-blue-600" />
        <div className="flex-1">
          <div className="text-2xl font-extrabold text-blue-700 leading-none">R$ {v}</div>
          <div className="text-[10px] text-muted-foreground">desconto fixo</div>
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Desconto Fixo" thumb={thumb} />;
  }

  if (type === "desconto_aniversario_cliente" || type === "desconto_aniversario_empresa") {
    const pct = cfg.percentual ?? 10;
    const isEmpresa = type === "desconto_aniversario_empresa";
    const thumb = (
      <div className="rounded-lg border bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 p-3 flex items-center gap-3">
        <Gift className="w-8 h-8 text-pink-600" />
        <div className="flex-1">
          <div className="text-lg font-bold text-pink-700 leading-tight">{pct}% 🎂</div>
          <div className="text-[10px] text-muted-foreground">Aniversário {isEmpresa ? "da empresa" : "do cliente"}</div>
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Desconto Aniversário" thumb={thumb} />;
  }

  if (type === "desconto_data_especial") {
    const thumb = (
      <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 p-3 flex items-center gap-3">
        <Calendar className="w-8 h-8 text-amber-600" />
        <div className="flex-1">
          <div className="text-lg font-bold text-amber-700 leading-tight">{cfg.percentual ?? 0}%</div>
          <div className="text-[10px] text-muted-foreground">{cfg.dataNome || cfg.descricao || "Data especial"}</div>
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Data Especial" thumb={thumb} />;
  }

  if (type === "acao_adicionar_frete") {
    const v = cfg.valor ?? 0;
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5 flex items-center gap-3">
        <Truck className="w-6 h-6 text-orange-600" />
        <div className="flex-1">
          <div className="text-sm font-bold">+ R$ {v}</div>
          <div className="text-[10px] text-muted-foreground">adicionar ao frete</div>
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Adicionar Frete" thumb={thumb} />;
  }

  if (type === "acao_enviar_alerta") {
    const thumb = (
      <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-300 p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Bell className="w-3 h-3 text-amber-600" />
          <span className="text-[10px] uppercase font-bold text-amber-700">Alerta</span>
        </div>
        <div className="text-xs text-amber-900 dark:text-amber-100 line-clamp-3">
          {cfg.mensagem || cfg.message || "Mensagem de alerta..."}
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Enviar Alerta" thumb={thumb} />;
  }

  return null;
}
