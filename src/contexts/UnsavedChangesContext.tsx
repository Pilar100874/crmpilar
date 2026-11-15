import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { UNSAFE_NavigationContext, useLocation, useNavigate } from "react-router-dom";
import { instalarProtecaoHistorico, instalarProtecaoNavegacao } from "@/lib/navigationGuard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type GuardEntry = {
  isDirty: boolean;
  onSave?: () => Promise<boolean | void> | boolean | void;
  label?: string;
  onDiscard?: () => void;
  etapas?: boolean;
};

type Ctx = {
  confirmarSaida: (continuar: () => void, ids?: string[]) => boolean;
  registerGuard: (id: string, entry: GuardEntry) => void;
  unregisterGuard: (id: string) => void;
};

const UnsavedChangesContext = createContext<Ctx | null>(null);

export const useUnsavedChanges = (
  id: string,
  isDirty: boolean,
  onSave?: () => Promise<boolean | void> | boolean | void,
  label?: string,
  onDiscard?: () => void,
  etapas = false,
) => {
  const ctx = useContext(UnsavedChangesContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.registerGuard(id, { isDirty, onSave, label, onDiscard, etapas });
    return () => ctx.unregisterGuard(id);
  }, [ctx, id, isDirty, onSave, label, onDiscard, etapas]);
};

export function useEtapasPendentes(id: string, pendente: boolean, label: string, onDiscard?: () => void) {
  useUnsavedChanges(id, pendente, undefined, label, onDiscard, true);
}

export function useConfirmarSaidaEtapas() {
  const ctx = useContext(UnsavedChangesContext);
  return ctx?.confirmarSaida ?? (() => false);
}

export const UnsavedChangesProvider = ({ children }: { children: React.ReactNode }) => {
  const guardsRef = useRef<Map<string, GuardEntry>>(new Map());
  const navigate = useNavigate();
  const location = useLocation();
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const [pending, setPending] = useState<{ continuar: () => void; entry: GuardEntry; ids?: string[] } | null>(null);
  const liberadoRef = useRef(false);
  const locationRef = useRef(location);
  locationRef.current = location;
  const indiceRef = useRef<number>(window.history.state?.idx ?? 0);
  const restaurandoRef = useRef(false);

  const registerGuard = useCallback((id: string, entry: GuardEntry) => {
    guardsRef.current.set(id, entry);
  }, []);
  const unregisterGuard = useCallback((id: string) => {
    guardsRef.current.delete(id);
  }, []);

  const getDirtyEntry = (): GuardEntry | null => {
    for (const entry of guardsRef.current.values()) if (entry.isDirty) return entry;
    return null;
  };

  const confirmarSaida = useCallback((continuar: () => void, ids?: string[]) => {
    if (liberadoRef.current) return false;
    const entry = [...guardsRef.current.entries()].find(([id, guard]) => guard.isDirty && (!ids || ids.includes(id)))?.[1];
    if (!entry) return false;
    setPending({ continuar, entry, ids });
    return true;
  }, []);

  useLayoutEffect(() => instalarProtecaoNavegacao(navigator, (continuar, destino) => {
    if (liberadoRef.current) return false;
    const atual = locationRef.current;
    if (destino && typeof destino === "object") {
      const d = destino as { pathname?: string; search?: string; hash?: string };
      // Query updates inside the current module are not an exit.
      if (d.pathname === atual.pathname) return false;
    }
    const entry = getDirtyEntry();
    if (!entry) return false;
    setPending({ continuar, entry });
    return true;
  }), [navigator]);

  // Browser back/forward bypasses useNavigate: restore the current history entry
  // before asking, then replay the requested movement only after confirmation.
  useEffect(() => {
    const handler = (event: PopStateEvent) => {
      const indice = window.history.state?.idx;
      if (typeof indice !== "number") return;
      if (restaurandoRef.current) { event.stopImmediatePropagation(); restaurandoRef.current = false; return; }
      const delta = indice - indiceRef.current;
      const entry = getDirtyEntry();
      if (delta && entry && !liberadoRef.current) {
        event.stopImmediatePropagation();
        restaurandoRef.current = true;
        window.history.go(-delta);
        setPending({ entry, continuar: () => window.history.go(delta) });
      } else indiceRef.current = indice;
    };
    return instalarProtecaoHistorico(handler);
  }, []);
  useEffect(() => {
    if (!restaurandoRef.current) indiceRef.current = window.history.state?.idx ?? indiceRef.current;
  }, [location]);

  // Intercept anchor clicks (NavLink, Link)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor || !anchor.href) return;
      if (anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const dest = url.pathname + url.search + url.hash;
      const current = location.pathname + location.search + location.hash;
      if (dest === current || url.pathname === location.pathname) return;
      const entry = getDirtyEntry();
      if (!entry) return;
      e.preventDefault();
      e.stopPropagation();
      setPending({ continuar: () => navigate(dest), entry });
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [location.pathname, location.search, location.hash]);

  // Warn on browser unload / reload / close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (getDirtyEntry()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleSaveAndGo = async () => {
    if (!pending) return;
    const { entry, continuar } = pending;
    try {
      const result = entry.onSave ? await entry.onSave() : true;
      if (result === false) return;
      for (const guard of guardsRef.current.values()) guard.isDirty = false;
      setPending(null);
      liberadoRef.current = true;
      continuar();
      liberadoRef.current = false;
    } catch {
      // keep dialog open on error
    }
  };

  const handleDiscardAndGo = () => {
    if (!pending) return;
    const continuar = pending.continuar;
    // Mark all guards as clean to allow navigation without re-prompting
    for (const [id, entry] of guardsRef.current.entries()) {
      if (pending.ids && !pending.ids.includes(id)) continue;
      if (entry.isDirty) entry.onDiscard?.();
      entry.isDirty = false;
    }
    setPending(null);
    liberadoRef.current = true;
    continuar();
    liberadoRef.current = false;
  };

  const value = useMemo(() => ({ registerGuard, unregisterGuard, confirmarSaida }), [registerGuard, unregisterGuard, confirmarSaida]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.entry.etapas
                ? `Ao sair de "${pending.entry.label}", os dados não salvos serão perdidos. Ao voltar, o preenchimento começará na primeira etapa. Deseja sair?`
                : pending?.entry.label
                ? `Você tem alterações não salvas em "${pending.entry.label}". Deseja salvar antes de sair?`
                : "Você tem alterações não salvas. Deseja salvar antes de sair?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDiscardAndGo}>
              Sair sem salvar
            </Button>
            {pending?.entry.onSave && <AlertDialogAction onClick={handleSaveAndGo}>
              Salvar e sair
            </AlertDialogAction>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
};
