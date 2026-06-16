import { Users, User, Sparkles, Clock, Webhook, Timer, BarChart3, GitBranch } from "lucide-react";
import { WorkflowPreviewZoom } from "@/components/workflow/WorkflowPreviewZoom";

export const OMNICHANNEL_PREVIEW_SUPPORTED = new Set<string>([
  "fila",
  "atendente",
  "skill",
  "horario",
  "webhook",
  "aguardar",
  "analytics",
  "regra_roteamento",
]);

const DIAS_LABEL: Record<string, string> = {
  seg: "S", ter: "T", qua: "Q", qui: "Q", sex: "S", sab: "S", dom: "D",
  monday: "S", tuesday: "T", wednesday: "Q", thursday: "Q", friday: "S", saturday: "S", sunday: "D",
};

export function OmnichannelLivePreview({ type, config }: { type: string; config: any }) {
  const cfg = config || {};

  if (type === "fila") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5 flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{cfg.filaNome || cfg.nome || "Fila de Atendimento"}</div>
          <div className="text-[10px] text-muted-foreground">
            {cfg.estrategia || "round-robin"} · Prioridade {cfg.prioridade ?? "normal"}
          </div>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
          {cfg.maxChats || "∞"} chats
        </span>
      </div>
    );
    return <WorkflowPreviewZoom title="Fila de Atendimento" thumb={thumb} />;
  }

  if (type === "atendente") {
    const nome = cfg.atendenteNome || cfg.nome || "Atendente";
    const initials = String(nome).split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase();
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5 flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
          {initials || <User className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{nome}</div>
          <div className="text-[10px] text-muted-foreground">{cfg.email || cfg.cargo || "Atendente designado"}</div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
      </div>
    );
    return <WorkflowPreviewZoom title="Atendente" thumb={thumb} />;
  }

  if (type === "skill") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3 h-3 text-violet-600" />
          <span className="text-[11px] font-semibold">{cfg.skillNome || cfg.nome || "Skill requerida"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-violet-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
              style={{ width: `${Math.min(100, (cfg.nivelMinimo ?? 5) * 20)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">Nível {cfg.nivelMinimo ?? 5}/5</span>
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Skill Requerida" thumb={thumb} />;
  }

  if (type === "horario") {
    const dias: string[] = cfg.diasSemana || cfg.dias || [];
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Clock className="w-3 h-3 text-amber-600" />
          <span className="text-[11px] font-semibold">
            {cfg.horarioInicio || "08:00"} → {cfg.horarioFim || "18:00"}
          </span>
        </div>
        <div className="flex gap-1">
          {["seg", "ter", "qua", "qui", "sex", "sab", "dom"].map((d) => {
            const active = dias.includes(d) || dias.length === 0;
            return (
              <div
                key={d}
                className={`w-5 h-5 rounded text-[9px] flex items-center justify-center font-medium ${
                  active ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {DIAS_LABEL[d] || d[0]?.toUpperCase()}
              </div>
            );
          })}
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Horário de Funcionamento" thumb={thumb} />;
  }

  if (type === "webhook") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Webhook className="w-3 h-3 text-cyan-600" />
          <span className="text-[10px] uppercase font-bold text-cyan-700">{cfg.metodo || "POST"}</span>
        </div>
        <div className="font-mono text-[10px] text-foreground bg-muted/50 px-1.5 py-1 rounded truncate">
          {cfg.url || "https://api.exemplo.com/webhook"}
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Webhook" thumb={thumb} />;
  }

  if (type === "aguardar") {
    const segs = cfg.tempoSegundos || cfg.tempo || 5;
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5 flex items-center justify-center gap-2">
        <Timer className="w-4 h-4 text-orange-500 animate-pulse" />
        <span className="text-sm font-bold">{segs}s</span>
        <span className="text-[10px] text-muted-foreground">de espera</span>
      </div>
    );
    return <WorkflowPreviewZoom title="Aguardar" thumb={thumb} />;
  }

  if (type === "analytics") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <BarChart3 className="w-3 h-3 text-indigo-600" />
          <span className="text-[11px] font-semibold">{cfg.metrica || cfg.evento || "Evento"}</span>
        </div>
        <div className="flex items-end gap-1 h-8">
          {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-indigo-500 to-violet-400" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Analytics" thumb={thumb} />;
  }

  if (type === "regra_roteamento") {
    const regras: any[] = cfg.regras || cfg.condicoes || [];
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <GitBranch className="w-3 h-3 text-pink-600" />
          <span className="text-[11px] font-semibold">{regras.length || 0} regra{regras.length === 1 ? "" : "s"}</span>
        </div>
        <div className="space-y-0.5">
          {(regras.slice(0, 3)).map((r, i) => (
            <div key={i} className="text-[10px] text-muted-foreground truncate">
              · {r.campo || r.field || "campo"} {r.operador || "="} {String(r.valor ?? r.value ?? "")}
            </div>
          ))}
          {regras.length === 0 && <div className="text-[10px] text-muted-foreground italic">Sem regras configuradas</div>}
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Regra de Roteamento" thumb={thumb} />;
  }

  return null;
}
