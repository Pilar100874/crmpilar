import { Pause, Play, TrendingUp, TrendingDown, Bell, Mail, Webhook, DollarSign, Clock, Archive, Copy as CopyIcon } from "lucide-react";
import { WorkflowPreviewZoom } from "@/components/workflow/WorkflowPreviewZoom";

export const ADS_PREVIEW_SUPPORTED = new Set<string>([
  "trigger_roas", "trigger_spend", "trigger_cpc", "trigger_ctr", "trigger_conversions",
  "trigger_impressions", "trigger_schedule", "trigger_frequency",
  "condition_platform", "condition_metric", "condition_time", "condition_budget_remaining",
  "action_pause", "action_resume", "action_archive", "action_duplicate", "action_activate",
  "action_budget_decrease", "action_budget_increase", "action_notify", "action_email",
  "action_webhook", "action_slack", "action_aviso_sistema",
]);

const PLATFORM_COLORS: Record<string, string> = {
  meta: "bg-blue-600", facebook: "bg-blue-600", instagram: "bg-pink-600",
  google: "bg-yellow-500", tiktok: "bg-black", linkedin: "bg-sky-700",
};

function MetricCard({ icon: Icon, label, value, color, comparison }: any) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3 h-3 ${color}`} />
        <span className="text-[10px] uppercase font-bold text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[9px] text-muted-foreground">{comparison === "above" ? "≥" : comparison === "below" ? "≤" : "="}</span>
        <span className="text-lg font-extrabold">{value}</span>
      </div>
    </div>
  );
}

export function AdsLivePreview({ type, config }: { type: string; config: any }) {
  const cfg = config || {};

  // Triggers (metric thresholds)
  const triggers: Record<string, any> = {
    trigger_roas: { icon: TrendingDown, label: "ROAS", color: "text-orange-600", suffix: "x" },
    trigger_spend: { icon: DollarSign, label: "Gasto", color: "text-red-600", prefix: "R$ " },
    trigger_cpc: { icon: DollarSign, label: "CPC", color: "text-orange-600", prefix: "R$ " },
    trigger_ctr: { icon: TrendingDown, label: "CTR", color: "text-orange-600", suffix: "%" },
    trigger_impressions: { icon: TrendingDown, label: "Impressões", color: "text-orange-600" },
    trigger_conversions: { icon: TrendingDown, label: "Sem conversões", color: "text-red-600", suffix: "h" },
    trigger_frequency: { icon: TrendingUp, label: "Frequência", color: "text-orange-600" },
  };
  if (triggers[type]) {
    const t = triggers[type];
    const val = type === "trigger_conversions" ? cfg.hours ?? 24 : cfg.threshold ?? 0;
    return (
      <WorkflowPreviewZoom
        title={t.label}
        thumb={<MetricCard icon={t.icon} label={t.label} value={`${t.prefix || ""}${val}${t.suffix || ""}`} color={t.color} comparison={cfg.comparison} />}
      />
    );
  }

  if (type === "trigger_schedule") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5 flex items-center gap-2">
        <Clock className="w-5 h-5 text-orange-500" />
        <div>
          <div className="text-xs font-bold font-mono">{cfg.cron || "0 9 * * *"}</div>
          <div className="text-[10px] text-muted-foreground">Agendamento CRON</div>
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Agendamento" thumb={thumb} />;
  }

  if (type === "condition_platform") {
    const plat = String(cfg.plataforma || cfg.platform || "meta").toLowerCase();
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5 flex items-center gap-2">
        <div className={`w-7 h-7 rounded ${PLATFORM_COLORS[plat] || "bg-gray-500"} flex items-center justify-center text-white text-[10px] font-bold uppercase`}>
          {plat.slice(0, 2)}
        </div>
        <div className="text-xs font-semibold capitalize">{plat}</div>
      </div>
    );
    return <WorkflowPreviewZoom title="Condição Plataforma" thumb={thumb} />;
  }

  if (type === "condition_metric") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Condição</div>
        <div className="text-xs font-mono bg-muted px-1.5 py-1 rounded">
          {cfg.metric || cfg.metrica || "?"} {cfg.operator || cfg.operador || ">"} {cfg.value ?? cfg.valor ?? "?"}
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Condição de Métrica" thumb={thumb} />;
  }

  if (type === "condition_time") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5 flex items-center gap-2">
        <Clock className="w-4 h-4 text-indigo-500" />
        <span className="text-xs font-semibold">{cfg.startTime || "00:00"} → {cfg.endTime || "23:59"}</span>
      </div>
    );
    return <WorkflowPreviewZoom title="Condição de Horário" thumb={thumb} />;
  }

  if (type === "condition_budget_remaining") {
    const pct = cfg.percentage ?? cfg.threshold ?? 50;
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Orçamento restante</div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">{pct}%</div>
      </div>
    );
    return <WorkflowPreviewZoom title="Orçamento Restante" thumb={thumb} />;
  }

  // Actions
  const actions: Record<string, any> = {
    action_pause: { icon: Pause, label: "Pausar campanha", color: "bg-red-50 border-red-300 text-red-700" },
    action_resume: { icon: Play, label: "Retomar campanha", color: "bg-emerald-50 border-emerald-300 text-emerald-700" },
    action_activate: { icon: Play, label: "Ativar campanha", color: "bg-emerald-50 border-emerald-300 text-emerald-700" },
    action_archive: { icon: Archive, label: "Arquivar campanha", color: "bg-gray-50 border-gray-300 text-gray-700" },
    action_duplicate: { icon: CopyIcon, label: "Duplicar campanha", color: "bg-blue-50 border-blue-300 text-blue-700" },
  };
  if (actions[type]) {
    const a = actions[type];
    const thumb = (
      <div className={`rounded-lg border-2 p-3 flex items-center gap-2 ${a.color}`}>
        <a.icon className="w-5 h-5" />
        <span className="text-sm font-bold">{a.label}</span>
      </div>
    );
    return <WorkflowPreviewZoom title={a.label} thumb={thumb} />;
  }

  if (type === "action_budget_decrease" || type === "action_budget_increase") {
    const isUp = type === "action_budget_increase";
    const pct = cfg.percentage ?? cfg.percentual ?? 10;
    const thumb = (
      <div className={`rounded-lg border p-3 flex items-center gap-3 ${isUp ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
        {isUp ? <TrendingUp className="w-7 h-7 text-emerald-600" /> : <TrendingDown className="w-7 h-7 text-red-600" />}
        <div>
          <div className={`text-xl font-extrabold ${isUp ? "text-emerald-700" : "text-red-700"}`}>{isUp ? "+" : "-"}{pct}%</div>
          <div className="text-[10px] text-muted-foreground">no orçamento</div>
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title={isUp ? "Aumentar Orçamento" : "Reduzir Orçamento"} thumb={thumb} />;
  }

  if (type === "action_notify" || type === "action_aviso_sistema") {
    const thumb = (
      <div className="rounded-lg border bg-amber-50 border-amber-300 p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Bell className="w-3 h-3 text-amber-600" />
          <span className="text-[10px] uppercase font-bold text-amber-700">Notificação</span>
        </div>
        <div className="text-xs text-amber-900 line-clamp-3">{cfg.message || cfg.mensagem || "Notificação no sistema"}</div>
      </div>
    );
    return <WorkflowPreviewZoom title="Notificação" thumb={thumb} />;
  }

  if (type === "action_email") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Mail className="w-3 h-3 text-blue-600" />
          <span className="text-[10px] uppercase font-bold text-blue-700">Email</span>
        </div>
        <div className="text-[10px] text-muted-foreground truncate">Para: {cfg.to || cfg.destinatario || "—"}</div>
        <div className="text-xs font-semibold truncate">{cfg.subject || cfg.assunto || "(sem assunto)"}</div>
      </div>
    );
    return <WorkflowPreviewZoom title="Email" thumb={thumb} />;
  }

  if (type === "action_webhook" || type === "action_slack") {
    const isSlack = type === "action_slack";
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Webhook className="w-3 h-3 text-cyan-600" />
          <span className="text-[10px] uppercase font-bold text-cyan-700">{isSlack ? "Slack" : cfg.method || "POST"}</span>
        </div>
        <div className="font-mono text-[10px] bg-muted/50 px-1.5 py-1 rounded truncate">
          {cfg.url || cfg.webhook || "https://..."}
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title={isSlack ? "Slack" : "Webhook"} thumb={thumb} />;
  }

  return null;
}
