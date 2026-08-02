import { useMemo } from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { cronValido, descreverCron, proximaExecucao } from "@/lib/aip/cron";

/**
 * Editor de agendamento em linguagem simples que gera a expressão cron
 * por trás dos panos. O usuário escolhe frequência, horário e dias.
 */

type Frequencia = "minutos" | "horas" | "diaria" | "semanal" | "mensal" | "personalizado";

const FREQUENCIAS: { id: Frequencia; label: string }[] = [
  { id: "minutos", label: "A cada X minutos" },
  { id: "horas", label: "A cada X horas" },
  { id: "diaria", label: "Todos os dias" },
  { id: "semanal", label: "Dias da semana" },
  { id: "mensal", label: "Uma vez por mês" },
  { id: "personalizado", label: "Avançado (cron)" },
];

const DIAS_SEMANA = [
  { valor: "1", curto: "Seg" },
  { valor: "2", curto: "Ter" },
  { valor: "3", curto: "Qua" },
  { valor: "4", curto: "Qui" },
  { valor: "5", curto: "Sex" },
  { valor: "6", curto: "Sáb" },
  { valor: "0", curto: "Dom" },
];

const ATALHOS = [
  { label: "Todo dia 08:00", valor: "0 8 * * *" },
  { label: "Dias úteis 09:00", valor: "0 9 * * 1-5" },
  { label: "A cada hora", valor: "0 * * * *" },
  { label: "Segunda 08:00", valor: "0 8 * * 1" },
  { label: "Dia 1º às 07:00", valor: "0 7 1 * *" },
];

interface Estado {
  frequencia: Frequencia;
  intervalo: string;
  hora: string;
  minuto: string;
  diasSemana: string[];
  diaMes: string;
}

/** Lê uma expressão cron e devolve os campos amigáveis correspondentes. */
function paraEstado(cron: string): Estado {
  const padrao: Estado = {
    frequencia: "diaria",
    intervalo: "15",
    hora: "08",
    minuto: "00",
    diasSemana: ["1", "2", "3", "4", "5"],
    diaMes: "1",
  };
  if (!cronValido(cron)) return { ...padrao, frequencia: "personalizado" };
  const [min, hora, dia, mes, semana] = cron.trim().split(/\s+/);
  if (mes !== "*") return { ...padrao, frequencia: "personalizado" };

  if (min.startsWith("*/") && hora === "*" && dia === "*" && semana === "*") {
    return { ...padrao, frequencia: "minutos", intervalo: min.slice(2) };
  }
  if (hora.startsWith("*/") && /^\d+$/.test(min) && dia === "*" && semana === "*") {
    return {
      ...padrao,
      frequencia: "horas",
      intervalo: hora.slice(2),
      minuto: min.padStart(2, "0"),
    };
  }
  if (hora === "*" && /^\d+$/.test(min) && dia === "*" && semana === "*") {
    return { ...padrao, frequencia: "horas", intervalo: "1", minuto: min.padStart(2, "0") };
  }
  if (/^\d+$/.test(min) && /^\d+$/.test(hora)) {
    const base = { ...padrao, hora: hora.padStart(2, "0"), minuto: min.padStart(2, "0") };
    if (dia === "*" && semana === "*") return { ...base, frequencia: "diaria" };
    if (dia === "*" && /^[0-6](,[0-6])*$/.test(semana)) {
      return { ...base, frequencia: "semanal", diasSemana: semana.split(",") };
    }
    if (dia === "*" && semana === "1-5") {
      return { ...base, frequencia: "semanal", diasSemana: ["1", "2", "3", "4", "5"] };
    }
    if (/^\d+$/.test(dia) && semana === "*") {
      return { ...base, frequencia: "mensal", diaMes: dia };
    }
  }
  return { ...padrao, frequencia: "personalizado" };
}

/** Monta a expressão cron a partir dos campos amigáveis. */
function paraCron(e: Estado, cronAtual: string): string {
  const min = String(Number(e.minuto) || 0);
  const hora = String(Number(e.hora) || 0);
  const intervalo = Math.max(1, Number(e.intervalo) || 1);
  switch (e.frequencia) {
    case "minutos":
      return `*/${Math.min(intervalo, 59)} * * * *`;
    case "horas":
      return `${min} */${Math.min(intervalo, 23)} * * *`;
    case "diaria":
      return `${min} ${hora} * * *`;
    case "semanal": {
      const dias = e.diasSemana.length ? [...e.diasSemana].sort() : ["1"];
      return `${min} ${hora} * * ${dias.join(",")}`;
    }
    case "mensal":
      return `${min} ${hora} ${Math.min(Math.max(Number(e.diaMes) || 1, 1), 28)} * *`;
    default:
      return cronAtual;
  }
}

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS = ["00", "05", "10", "15", "20", "30", "40", "45", "50"];

interface Props {
  valor: string;
  onChange: (cron: string) => void;
  fuso: string;
}

export default function AgendamentoAmigavel({ valor, onChange, fuso }: Props) {
  const estado = useMemo(() => paraEstado(valor), [valor]);

  const aplicar = (parcial: Partial<Estado>) =>
    onChange(paraCron({ ...estado, ...parcial }, valor));

  const proxima = useMemo(() => {
    if (!cronValido(valor)) return null;
    return proximaExecucao(valor, fuso);
  }, [valor, fuso]);

  const alternarDia = (d: string) => {
    const atuais = estado.diasSemana;
    const novos = atuais.includes(d) ? atuais.filter((x) => x !== d) : [...atuais, d];
    aplicar({ diasSemana: novos.length ? novos : atuais });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Quando executar?</Label>
          <Select
            value={estado.frequencia}
            onValueChange={(v) => aplicar({ frequencia: v as Frequencia })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIAS.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(estado.frequencia === "minutos" || estado.frequencia === "horas") && (
          <div className="space-y-1">
            <Label>Intervalo ({estado.frequencia === "minutos" ? "minutos" : "horas"})</Label>
            <Input
              type="number"
              min={1}
              max={estado.frequencia === "minutos" ? 59 : 23}
              value={estado.intervalo}
              onChange={(ev) => aplicar({ intervalo: ev.target.value })}
            />
          </div>
        )}

        {estado.frequencia === "mensal" && (
          <div className="space-y-1">
            <Label>Dia do mês</Label>
            <Select value={estado.diaMes} onValueChange={(v) => aplicar({ diaMes: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => (
                  <SelectItem key={d} value={d}>
                    Dia {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {["diaria", "semanal", "mensal"].includes(estado.frequencia) && (
          <div className="space-y-1">
            <Label>Horário</Label>
            <div className="flex items-center gap-2">
              <Select value={estado.hora} onValueChange={(v) => aplicar({ hora: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HORAS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">:</span>
              <Select value={estado.minuto} onValueChange={(v) => aplicar({ minuto: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTOS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {estado.frequencia === "horas" && (
          <div className="space-y-1">
            <Label>No minuto</Label>
            <Select value={estado.minuto} onValueChange={(v) => aplicar({ minuto: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTOS.map((m) => (
                  <SelectItem key={m} value={m}>
                    minuto {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {estado.frequencia === "semanal" && (
        <div className="space-y-1">
          <Label>Em quais dias?</Label>
          <div className="flex flex-wrap gap-1">
            {DIAS_SEMANA.map((d) => (
              <Button
                key={d.valor}
                type="button"
                size="sm"
                variant={estado.diasSemana.includes(d.valor) ? "default" : "outline"}
                className="h-8 w-12 text-xs"
                onClick={() => alternarDia(d.valor)}
              >
                {d.curto}
              </Button>
            ))}
          </div>
        </div>
      )}

      {estado.frequencia === "personalizado" && (
        <div className="space-y-1">
          <Label>Expressão cron</Label>
          <Input
            value={valor}
            onChange={(ev) => onChange(ev.target.value)}
            placeholder="0 8 * * *"
            className={cn(!cronValido(valor) && "border-destructive")}
          />
          <p className="text-xs text-muted-foreground">
            Formato: minuto hora dia-do-mês mês dia-da-semana
          </p>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Atalhos</Label>
        <div className="flex flex-wrap gap-1">
          {ATALHOS.map((a) => (
            <Button
              key={a.valor}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onChange(a.valor)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 p-2 text-xs">
        <Clock className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium">{descreverCron(valor, fuso)}</span>
        {proxima && (
          <span className="text-muted-foreground">
            · Próxima:{" "}
            {proxima.toLocaleString("pt-BR", { timeZone: fuso, dateStyle: "short", timeStyle: "short" })}
          </span>
        )}
      </div>
    </div>
  );
}
