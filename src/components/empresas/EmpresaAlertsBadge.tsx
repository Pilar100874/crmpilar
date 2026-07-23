import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface EmpresaLike {
  id: string;
  nome?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  email?: string | null;
  endereco?: string | null;
  whatsapp?: string | null;
  telefone?: string | null;
  whatsapp_status?: string | null;
  ja_respondeu_whatsapp?: boolean | null;
  ultima_resposta_bot_em?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

interface Props {
  empresa: EmpresaLike;
  diasSemContato?: number; // default 60
}

interface Problema {
  id: string;
  titulo: string;
  detalhe?: string;
  severidade: "alta" | "media" | "baixa";
}

/**
 * Ícone de alerta que agrega problemas do cadastro da empresa.
 * - WhatsApp inválido
 * - Não respondeu ao último bot (busca em bot_response_tracking)
 * - Sem contato há X dias
 * - Dados cadastrais incompletos
 */
export function EmpresaAlertsBadge({ empresa, diasSemContato = 60 }: Props) {
  const [ultimoBotSemResposta, setUltimoBotSemResposta] = useState<{ flow_nome: string | null; enviado_em: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("bot_response_tracking" as any)
          .select("flow_nome, enviado_em, status")
          .eq("empresa_id", empresa.id)
          .order("enviado_em", { ascending: false })
          .limit(1);
        if (cancel) return;
        const last: any = Array.isArray(data) ? data[0] : null;
        if (last && last.status === "sem_resposta") {
          setUltimoBotSemResposta({ flow_nome: last.flow_nome, enviado_em: last.enviado_em });
        } else {
          setUltimoBotSemResposta(null);
        }
      } finally {
        if (!cancel) setLoaded(true);
      }
    })();
    return () => { cancel = true; };
  }, [empresa.id]);

  const problemas: Problema[] = [];

  if (empresa.whatsapp_status === "invalid") {
    problemas.push({
      id: "wa_invalid",
      titulo: "WhatsApp inválido/inexistente",
      detalhe: empresa.whatsapp || empresa.telefone || undefined,
      severidade: "alta",
    });
  }

  if (ultimoBotSemResposta) {
    problemas.push({
      id: "sem_resposta",
      titulo: `Não respondeu ao bot${ultimoBotSemResposta.flow_nome ? ` "${ultimoBotSemResposta.flow_nome}"` : ""}`,
      detalhe: `Enviado em ${new Date(ultimoBotSemResposta.enviado_em).toLocaleString("pt-BR")}`,
      severidade: "media",
    });
  }

  const ultimaAtividade = empresa.ultima_resposta_bot_em || empresa.updated_at || empresa.created_at;
  if (ultimaAtividade) {
    const dias = Math.floor((Date.now() - new Date(ultimaAtividade).getTime()) / (1000 * 60 * 60 * 24));
    if (dias >= diasSemContato) {
      problemas.push({
        id: "sem_contato",
        titulo: `Sem contato há ${dias} dias`,
        severidade: "baixa",
      });
    }
  }

  const camposIncompletos: string[] = [];
  if (!empresa.email) camposIncompletos.push("e-mail");
  if (!empresa.endereco) camposIncompletos.push("endereço");
  if (!empresa.cnpj) camposIncompletos.push("CNPJ/CPF");
  if (!empresa.whatsapp && !empresa.telefone) camposIncompletos.push("WhatsApp");
  if (camposIncompletos.length > 0) {
    problemas.push({
      id: "incompleto",
      titulo: "Dados cadastrais incompletos",
      detalhe: `Faltando: ${camposIncompletos.join(", ")}`,
      severidade: "baixa",
    });
  }

  if (!loaded || problemas.length === 0) return null;

  const cor = problemas.some((p) => p.severidade === "alta")
    ? "text-red-600 bg-red-100 border-red-200"
    : problemas.some((p) => p.severidade === "media")
    ? "text-amber-600 bg-amber-100 border-amber-200"
    : "text-slate-600 bg-slate-100 border-slate-200";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => e.stopPropagation()}
          className={`h-7 w-7 p-0 rounded-full border ${cor}`}
          title={`${problemas.length} alerta(s)`}
        >
          <AlertTriangle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72 p-3 space-y-2">
        <div className="text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          Alertas do cadastro
        </div>
        <ul className="space-y-2">
          {problemas.map((p) => (
            <li key={p.id} className="text-xs border-l-2 pl-2" style={{ borderColor: p.severidade === "alta" ? "#dc2626" : p.severidade === "media" ? "#d97706" : "#94a3b8" }}>
              <div className="font-medium">{p.titulo}</div>
              {p.detalhe && <div className="text-muted-foreground text-[11px]">{p.detalhe}</div>}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export default EmpresaAlertsBadge;
