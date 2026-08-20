import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Bell, CheckCircle2, Info, X, XCircle } from 'lucide-react';

/**
 * Fila empilhada de mensagens das automações.
 * - Sempre em coluna (nunca sobrepostas)
 * - Mais recente sempre no topo
 * - Limite de itens visíveis + contador "+N na fila"
 */

type TipoAviso = 'info' | 'alerta' | 'urgente' | 'sucesso' | 'erro';

export interface MensagemAutomacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: TipoAviso;
  created_at: string;
}

const ESTILO_TIPO: Record<TipoAviso, { borda: string; icone: React.ElementType; cor: string }> = {
  info: { borda: 'border-l-primary', icone: Info, cor: 'text-primary' },
  sucesso: { borda: 'border-l-emerald-500', icone: CheckCircle2, cor: 'text-emerald-500' },
  alerta: { borda: 'border-l-amber-500', icone: AlertTriangle, cor: 'text-amber-500' },
  urgente: { borda: 'border-l-destructive', icone: AlertTriangle, cor: 'text-destructive' },
  erro: { borda: 'border-l-destructive', icone: XCircle, cor: 'text-destructive' },
};

interface Props {
  /** Quantos cartões ficam visíveis ao mesmo tempo (o resto vira contador) */
  maxVisiveis?: number;
  /** Tempo em ms até a mensagem sair da fila (0 = não expira) */
  duracaoMs?: number;
  /** Modo TV: cartões maiores e sem botão de fechar */
  tvMode?: boolean;
  /** Posição da fila na tela */
  posicao?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  className?: string;
}

const POSICOES: Record<NonNullable<Props['posicao']>, string> = {
  'top-right': 'top-3 right-3 items-end',
  'bottom-right': 'bottom-3 right-3 items-end flex-col-reverse',
  'top-left': 'top-3 left-3 items-start',
  'bottom-left': 'bottom-3 left-3 items-start flex-col-reverse',
};

export const AutomacaoMensagensFila: React.FC<Props> = ({
  maxVisiveis = 4,
  duracaoMs = 45000,
  tvMode = false,
  posicao = 'top-right',
  className = '',
}) => {
  const [fila, setFila] = useState<MensagemAutomacao[]>([]);
  const vistosRef = useRef<Set<string>>(new Set());

  const empilhar = useCallback((msg: MensagemAutomacao) => {
    if (vistosRef.current.has(msg.id)) return;
    vistosRef.current.add(msg.id);
    // Mais recente sempre primeiro; mantém um teto de itens na memória
    setFila(prev => [msg, ...prev].slice(0, 30));
  }, []);

  const remover = useCallback((id: string) => {
    setFila(prev => prev.filter(m => m.id !== id));
  }, []);

  // Carrega os avisos recentes e escuta novos em tempo real
  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('avisos_sistema')
        .select('id, titulo, mensagem, tipo, created_at')
        .eq('ativo', true)
        .gte('created_at', desde)
        .order('created_at', { ascending: false })
        .limit(maxVisiveis * 3);
      if (!ativo || !data) return;
      data
        .slice()
        .reverse()
        .forEach((a: any) =>
          empilhar({
            id: a.id,
            titulo: a.titulo || 'Automação',
            mensagem: a.mensagem || '',
            tipo: (a.tipo as TipoAviso) || 'info',
            created_at: a.created_at,
          }),
        );
    };

    carregar();

    const canal = supabase
      .channel(`automacao-mensagens-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'avisos_sistema' },
        payload => {
          const a: any = payload.new;
          if (!a || a.ativo === false) return;
          empilhar({
            id: a.id,
            titulo: a.titulo || 'Automação',
            mensagem: a.mensagem || '',
            tipo: (a.tipo as TipoAviso) || 'info',
            created_at: a.created_at,
          });
        },
      )
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [empilhar, maxVisiveis]);

  // Expiração automática (varredura única, sem timers por item)
  useEffect(() => {
    if (!duracaoMs) return;
    const t = setInterval(() => {
      const limite = Date.now() - duracaoMs;
      setFila(prev => prev.filter(m => new Date(m.created_at).getTime() > limite));
    }, 5000);
    return () => clearInterval(t);
  }, [duracaoMs]);

  if (fila.length === 0) return null;

  const visiveis = fila.slice(0, maxVisiveis);
  const restantes = fila.length - visiveis.length;

  return (
    <div
      className={`pointer-events-none fixed z-[1200] flex flex-col gap-2 ${POSICOES[posicao]} ${
        tvMode ? 'max-w-[420px]' : 'max-w-[340px]'
      } ${className}`}
    >
      {visiveis.map((m, idx) => {
        const estilo = ESTILO_TIPO[m.tipo] || ESTILO_TIPO.info;
        const Icone = estilo.icone;
        return (
          <div
            key={m.id}
            style={{ opacity: Math.max(0.55, 1 - idx * 0.12) }}
            className={`pointer-events-auto w-full rounded-lg border border-border border-l-4 ${estilo.borda} bg-card/95 shadow-lg backdrop-blur px-3 py-2 animate-fade-in`}
          >
            <div className="flex items-start gap-2">
              <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${estilo.cor}`} />
              <div className="min-w-0 flex-1">
                <p className={`truncate font-semibold text-foreground ${tvMode ? 'text-base' : 'text-xs'}`}>
                  {m.titulo}
                </p>
                <p
                  className={`text-muted-foreground break-words ${tvMode ? 'text-sm' : 'text-[11px]'}`}
                  style={{ display: '-webkit-box', WebkitLineClamp: tvMode ? 4 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {m.mensagem}
                </p>
              </div>
              {!tvMode && (
                <button
                  onClick={() => remover(m.id)}
                  aria-label="Dispensar mensagem"
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {restantes > 0 && (
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-md backdrop-blur">
          <Bell className="h-3 w-3" />+{restantes} na fila
        </div>
      )}
    </div>
  );
};

export default AutomacaoMensagensFila;
