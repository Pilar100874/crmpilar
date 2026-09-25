import { useCallback, useState } from "react";

export type AtendimentoCanal = "agenda" | "chat" | "tel" | "email" | "orcamento" | "visita";
export type AtendimentoMobileView = "list" | "main" | "details";

interface AtendimentoSessionState {
  contactId: string | null;
  taskId: string | null;
  channel: AtendimentoCanal;
  mobileView: AtendimentoMobileView;
}

export function useAtendimentoSession(initialChannel: AtendimentoCanal = "agenda") {
  const [session, setSession] = useState<AtendimentoSessionState>({
    contactId: null,
    taskId: null,
    channel: initialChannel,
    mobileView: "list",
  });

  const updateSession = useCallback((patch: Partial<AtendimentoSessionState>) => {
    setSession((current) => ({ ...current, ...patch }));
  }, []);

  return { session, updateSession };
}
