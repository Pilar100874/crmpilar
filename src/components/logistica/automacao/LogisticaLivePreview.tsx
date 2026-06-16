import { MapPin, Gauge, Clock, Navigation, MessageSquare, Bell, Mail, Map } from "lucide-react";
import { WorkflowPreviewZoom } from "@/components/workflow/WorkflowPreviewZoom";

export const LOGISTICA_PREVIEW_SUPPORTED = new Set<string>([
  "condicao_parado",
  "condicao_velocidade",
  "condicao_chegada",
  "condicao_saida_area",
  "condicao_horario",
  "acao_marcar_mapa",
  "acao_whatsapp",
  "acao_notificacao",
  "acao_email",
]);

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const DIAS_LBL = ["D", "S", "T", "Q", "Q", "S", "S"];

export function LogisticaLivePreview({ type, config }: { type: string; config: any }) {
  const cfg = config || {};

  if (type === "condicao_parado") {
    const condicoes: any[] = cfg.condicoes_tempo || [];
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Clock className="w-3 h-3 text-amber-600" />
          <span className="text-[11px] font-semibold">Veículo parado</span>
        </div>
        <div className="space-y-1">
          {condicoes.length === 0 && (
            <div className="text-[10px] text-muted-foreground italic">Sem condições</div>
          )}
          {condicoes.slice(0, 3).map((c, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
              <span>≥ {c.tempo_minutos}min</span>
              <span className="text-muted-foreground">{c.label || ""}</span>
            </div>
          ))}
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Veículo Parado" thumb={thumb} />;
  }

  if (type === "condicao_velocidade") {
    const op = cfg.operador_velocidade === "menor" ? "<" : ">";
    const thumb = (
      <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
        <Gauge className="w-8 h-8 text-blue-600" />
        <div>
          <div className="text-xl font-extrabold">{op} {cfg.velocidade_km ?? 0} km/h</div>
          <div className="text-[10px] text-muted-foreground">Limite de velocidade</div>
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Velocidade" thumb={thumb} />;
  }

  if (type === "condicao_chegada") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Navigation className="w-3 h-3 text-emerald-600" />
          <span className="text-[11px] font-semibold">Chegada</span>
        </div>
        <div className="text-[10px] text-muted-foreground truncate">📍 {cfg.endereco || "(endereço)"}</div>
        <div className="text-[10px] text-muted-foreground">Raio: {cfg.raio_metros ?? 100}m</div>
      </div>
    );
    return <WorkflowPreviewZoom title="Chegada em Local" thumb={thumb} />;
  }

  if (type === "condicao_saida_area") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Map className="w-3 h-3 text-rose-600" />
          <span className="text-[11px] font-semibold">Saída de área</span>
        </div>
        <div className="relative h-16 rounded bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 overflow-hidden">
          <svg viewBox="0 0 100 60" className="w-full h-full">
            <polygon points="15,10 80,15 85,45 25,50" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3,2" />
            <circle cx="50" cy="30" r="3" fill="#f43f5e" />
          </svg>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 truncate">{cfg.area_nome || "Área delimitada"}</div>
      </div>
    );
    return <WorkflowPreviewZoom title="Saída de Área" thumb={thumb} />;
  }

  if (type === "condicao_horario") {
    const dias: string[] = cfg.dias_semana || [];
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Clock className="w-3 h-3 text-indigo-600" />
          <span className="text-[11px] font-semibold">
            {cfg.horario_inicio || "08:00"} → {cfg.horario_fim || "18:00"}
          </span>
        </div>
        <div className="flex gap-1">
          {DIAS.map((d, i) => {
            const active = dias.includes(d) || dias.length === 0;
            return (
              <div
                key={d}
                className={`w-5 h-5 rounded text-[9px] flex items-center justify-center font-medium ${
                  active ? "bg-indigo-500 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {DIAS_LBL[i]}
              </div>
            );
          })}
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Horário" thumb={thumb} />;
  }

  if (type === "acao_marcar_mapa") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <MapPin className="w-3 h-3 text-pink-600" />
          <span className="text-[11px] font-semibold">Marcar no mapa</span>
        </div>
        <div className="relative h-16 rounded bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 overflow-hidden flex items-center justify-center">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: cfg.cor_icone_parada || "#ec4899" }}
          >
            <MapPin className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 truncate">{cfg.legenda_parada || "Parada marcada"}</div>
      </div>
    );
    return <WorkflowPreviewZoom title="Marcar no Mapa" thumb={thumb} />;
  }

  if (type === "acao_whatsapp") {
    const tel = cfg.usar_telefone_cliente ? "📞 Cliente" : cfg.telefone || "—";
    const thumb = (
      <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <MessageSquare className="w-3 h-3 text-emerald-600" />
          <span className="text-[10px] uppercase font-bold text-emerald-700">WhatsApp</span>
          <span className="text-[10px] text-muted-foreground ml-auto truncate">{tel}</span>
        </div>
        <div className="text-xs bg-white dark:bg-card rounded p-1.5 text-foreground line-clamp-3">
          {cfg.mensagem || "Mensagem do WhatsApp..."}
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="WhatsApp" thumb={thumb} />;
  }

  if (type === "acao_notificacao") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5 shadow-sm">
        <div className="flex items-start gap-2">
          <Bell className="w-4 h-4 text-amber-600 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{cfg.titulo_notificacao || "Notificação"}</div>
            <div className="text-[10px] text-muted-foreground line-clamp-2">{cfg.corpo_notificacao || "Corpo da notificação"}</div>
          </div>
        </div>
      </div>
    );
    return <WorkflowPreviewZoom title="Notificação" thumb={thumb} />;
  }

  if (type === "acao_email") {
    const thumb = (
      <div className="rounded-lg border bg-card p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Mail className="w-3 h-3 text-blue-600" />
          <span className="text-[10px] uppercase font-bold text-blue-700">Email</span>
        </div>
        <div className="text-[10px] text-muted-foreground truncate">Para: {cfg.email_destino || "—"}</div>
        <div className="text-xs font-semibold truncate">{cfg.assunto_email || "(sem assunto)"}</div>
        <div className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{cfg.corpo_email || ""}</div>
      </div>
    );
    return <WorkflowPreviewZoom title="Email" thumb={thumb} />;
  }

  return null;
}
