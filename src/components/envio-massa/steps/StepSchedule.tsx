import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowRight } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StepScheduleProps {
  proximaDataContato: Date;
  onDateChange: (date: Date) => void;
  onBack: () => void;
  onNext: () => void;
}

const QUICK_DATES = [
  { label: '3 dias', days: 3 },
  { label: '1 semana', days: 7 },
  { label: '15 dias', days: 15 },
  { label: '1 mês', days: 30 },
  { label: '2 meses', days: 60 },
  { label: '3 meses', days: 90 },
];

export function StepSchedule({
  proximaDataContato,
  onDateChange,
  onBack,
  onNext
}: StepScheduleProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleQuickDate = (days: number) => {
    onDateChange(addDays(new Date(), days));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="p-6">
        <h3 className="font-medium text-lg mb-4">Agendar Próximo Contato</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Defina a data para reagendar o próximo contato com todos os destinatários selecionados.
          Uma nova tarefa será criada no calendário para cada contato.
        </p>

        <div className="space-y-4">
          <Label>Atalhos Rápidos</Label>
          <div className="flex flex-wrap gap-2">
            {QUICK_DATES.map(qd => (
              <Button
                key={qd.days}
                variant={
                  format(addDays(new Date(), qd.days), 'yyyy-MM-dd') === 
                  format(proximaDataContato, 'yyyy-MM-dd') ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => handleQuickDate(qd.days)}
              >
                {qd.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Label>Ou escolha uma data específica</Label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(proximaDataContato, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={proximaDataContato}
                onSelect={(date) => {
                  if (date) {
                    onDateChange(date);
                    setIsCalendarOpen(false);
                  }
                }}
                disabled={(date) => date < new Date()}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm">
            <strong>Data selecionada:</strong>{' '}
            {format(proximaDataContato, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Faltam {Math.ceil((proximaDataContato.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
          </p>
        </div>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onNext}>
          Revisar e Confirmar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
