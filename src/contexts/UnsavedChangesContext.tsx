import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
};

type Ctx = {
  registerGuard: (id: string, entry: GuardEntry) => void;
  unregisterGuard: (id: string) => void;
};

const UnsavedChangesContext = createContext<Ctx | null>(null);

export const useUnsavedChanges = (
  id: string,
  isDirty: boolean,
  onSave?: () => Promise<boolean | void> | boolean | void,
  label?: string,
) => {
  const ctx = useContext(UnsavedChangesContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.registerGuard(id, { isDirty, onSave, label });
    return () => ctx.unregisterGuard(id);
  }, [ctx, id, isDirty, onSave, label]);
};

export const UnsavedChangesProvider = ({ children }: { children: React.ReactNode }) => {
  const guardsRef = useRef<Map<string, GuardEntry>>(new Map());
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState<{ href: string; entry: GuardEntry } | null>(null);

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
      if (dest === current) return;
      const entry = getDirtyEntry();
      if (!entry) return;
      e.preventDefault();
      e.stopPropagation();
      setPending({ href: dest, entry });
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
    const { entry, href } = pending;
    try {
      const result = entry.onSave ? await entry.onSave() : true;
      if (result === false) return;
      setPending(null);
      navigate(href);
    } catch {
      // keep dialog open on error
    }
  };

  const handleDiscardAndGo = () => {
    if (!pending) return;
    const href = pending.href;
    // Mark all guards as clean to allow navigation without re-prompting
    for (const entry of guardsRef.current.values()) entry.isDirty = false;
    setPending(null);
    navigate(href);
  };

  return (
    <UnsavedChangesContext.Provider value={{ registerGuard, unregisterGuard }}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.entry.label
                ? `Você tem alterações não salvas em "${pending.entry.label}". Deseja salvar antes de sair?`
                : "Você tem alterações não salvas. Deseja salvar antes de sair?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDiscardAndGo}>
              Sair sem salvar
            </Button>
            <AlertDialogAction onClick={handleSaveAndGo} disabled={!pending?.entry.onSave}>
              Salvar e sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
};
