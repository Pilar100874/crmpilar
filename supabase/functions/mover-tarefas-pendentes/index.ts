import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarioRegra {
  tipo: string;
  ativa: boolean;
}

interface Usuario {
  id: string;
  estabelecimento_id: string;
  hora_inicial: string;
  hora_final: string;
}

interface Tarefa {
  id: string;
  user_id: string;
  estabelecimento_id: string;
  date: string;
  time: string;
  title: string;
  description: string;
  contact_id: string;
  contact_name: string;
  type: string;
  status: string;
  is_all_day: boolean;
}

// Verificar se é fim de semana
function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

// Obter próximo dia útil
function getNextBusinessDay(date: Date): Date {
  let nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (isWeekend(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

// Verificar se o horário está dentro do horário comercial
function isWithinBusinessHours(time: string, horaInicial: string, horaFinal: string): boolean {
  const [hour, minute] = time.split(':').map(Number);
  const [startHour, startMinute] = horaInicial.split(':').map(Number);
  const [endHour, endMinute] = horaFinal.split(':').map(Number);
  
  const timeInMinutes = hour * 60 + minute;
  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;
  
  return timeInMinutes >= startTimeInMinutes && timeInMinutes < endTimeInMinutes;
}

// Ajustar horário para dentro do horário comercial
function adjustToBusinessHours(time: string, date: Date, horaInicial: string, horaFinal: string): { adjustedTime: string; adjustedDate: Date } {
  const [hour, minute] = time.split(':').map(Number);
  const [startHour, startMinute] = horaInicial.split(':').map(Number);
  const [endHour, endMinute] = horaFinal.split(':').map(Number);
  
  const timeInMinutes = hour * 60 + minute;
  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;
  
  // Se for antes do horário inicial, ajusta para o horário inicial
  if (timeInMinutes < startTimeInMinutes) {
    return {
      adjustedTime: horaInicial.substring(0, 5),
      adjustedDate: date
    };
  }
  
  // Se for depois do horário final, agenda para o horário inicial do próximo dia útil
  if (timeInMinutes >= endTimeInMinutes) {
    const nextDay = getNextBusinessDay(date);
    return {
      adjustedTime: horaInicial.substring(0, 5),
      adjustedDate: nextDay
    };
  }
  
  return { adjustedTime: time, adjustedDate: date };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🕐 Iniciando rotina de movimentação de tarefas pendentes...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obter data de hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().split('T')[0];

    console.log(`📅 Data de referência: ${hojeStr}`);

    // Buscar todas as tarefas pendentes de datas anteriores a hoje
    const { data: tarefasPendentes, error: tarefasError } = await supabase
      .from('calendario_tarefas')
      .select('*')
      .eq('status', 'pending')
      .lt('date', hojeStr);

    if (tarefasError) {
      console.error('❌ Erro ao buscar tarefas pendentes:', tarefasError);
      throw tarefasError;
    }

    if (!tarefasPendentes || tarefasPendentes.length === 0) {
      console.log('✅ Nenhuma tarefa pendente para mover');
      return new Response(
        JSON.stringify({ message: 'Nenhuma tarefa pendente para mover', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📋 Encontradas ${tarefasPendentes.length} tarefas pendentes para processar`);

    let tarefasMovidas = 0;
    let erros = 0;

    // Processar cada tarefa
    for (const tarefa of tarefasPendentes) {
      try {
        console.log(`\n🔄 Processando tarefa ${tarefa.id} do usuário ${tarefa.user_id}`);

        // Buscar informações do usuário
        const { data: usuario, error: usuarioError } = await supabase
          .from('usuarios')
          .select('id, estabelecimento_id, hora_inicial, hora_final')
          .eq('id', tarefa.user_id)
          .maybeSingle();

        if (usuarioError || !usuario) {
          console.error(`⚠️ Usuário não encontrado para tarefa ${tarefa.id}`);
          continue;
        }

        // Buscar regras do calendário do estabelecimento
        const { data: regras, error: regrasError } = await supabase
          .from('calendario_regras')
          .select('tipo, ativa')
          .eq('estabelecimento_id', usuario.estabelecimento_id);

        const regrasMap: Record<string, boolean> = {};
        if (!regrasError && regras) {
          regras.forEach((regra: CalendarioRegra) => {
            regrasMap[regra.tipo] = regra.ativa;
          });
        }

        // Calcular nova data (próximo dia)
        let novaData = new Date(hoje);
        novaData.setDate(novaData.getDate() + 1);

        // Aplicar regra de fim de semana se ativa
        if (regrasMap.bloqueio_finais_semana && isWeekend(novaData)) {
          novaData = getNextBusinessDay(novaData);
          console.log(`📆 Data ajustada para próximo dia útil: ${novaData.toISOString().split('T')[0]}`);
        }

        let novoHorario = tarefa.time;

        // Aplicar regra de horário comercial se ativa e não for tarefa de dia todo
        if (!tarefa.is_all_day && tarefa.time && regrasMap.horario_comercial) {
          const horaInicial = usuario.hora_inicial || '08:00:00';
          const horaFinal = usuario.hora_final || '18:00:00';

          if (!isWithinBusinessHours(tarefa.time, horaInicial, horaFinal)) {
            const ajuste = adjustToBusinessHours(tarefa.time, novaData, horaInicial, horaFinal);
            novaData = ajuste.adjustedDate;
            novoHorario = ajuste.adjustedTime;
            console.log(`⏰ Horário ajustado: ${tarefa.time} → ${novoHorario}`);
          }
        }

        // Atualizar tarefa com nova data/horário
        const novaDataStr = novaData.toISOString().split('T')[0];
        
        const { error: updateError } = await supabase
          .from('calendario_tarefas')
          .update({
            date: novaDataStr,
            time: novoHorario,
            updated_at: new Date().toISOString()
          })
          .eq('id', tarefa.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar tarefa ${tarefa.id}:`, updateError);
          erros++;
        } else {
          console.log(`✅ Tarefa ${tarefa.id} movida de ${tarefa.date} para ${novaDataStr}`);
          tarefasMovidas++;
        }

      } catch (error) {
        console.error(`❌ Erro ao processar tarefa ${tarefa.id}:`, error);
        erros++;
      }
    }

    const resultado = {
      message: 'Rotina de movimentação de tarefas concluída',
      tarefasProcessadas: tarefasPendentes.length,
      tarefasMovidas,
      erros,
      timestamp: new Date().toISOString()
    };

    console.log('\n📊 Resultado final:', resultado);

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro geral na rotina:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
