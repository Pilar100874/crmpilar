import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, MessageSquare } from "lucide-react";

type Variant = "success" | "error" | "info" | "warning" | "message";

interface PopupItem {
  id: number;
  variant: Variant;
  message: React.ReactNode;
  description?: React.ReactNode;
}

type Listener = (item: PopupItem) => void;
const listeners = new Set<Listener>();
let seq = 0;

function emit(variant: Variant, message: React.ReactNode, data?: { description?: React.ReactNode }) {
  const item: PopupItem = { id: ++seq, variant, message, description: data?.description };
  listeners.forEach((l) => l(item));
  return item.id;
}

export const toast = {
  success: (m: React.ReactNode, d?: any) => emit("success", m, d),
  error: (m: React.ReactNode, d?: any) => emit("error", m, d),
  info: (m: React.ReactNode, d?: any) => emit("info", m, d),
  warning: (m: React.ReactNode, d?: any) => emit("warning", m, d),
  message: (m: React.ReactNode, d?: any) => emit("message", m, d),
  dismiss: () => {},
  loading: (m: React.ReactNode, d?: any) => emit("info", m, d),
  promise: <T,>(p: Promise<T>) => p,
  custom: (m: React.ReactNode) => emit("message", m as any),
};

const variantConfig: Record<Variant, { title: string; icon: React.ComponentType<any>; color: string }> = {
  success: { title: "Sucesso", icon: CheckCircle2, color: "text-emerald-500" },
  error: { title: "Erro", icon: AlertCircle, color: "text-destructive" },
  info: { title: "Informação", icon: Info, color: "text-blue-500" },
  warning: { title: "Atenção", icon: AlertTriangle, color: "text-amber-500" },
  message: { title: "Aviso", icon: MessageSquare, color: "text-foreground" },
};

export function EditorPopupProvider() {
  const [queue, setQueue] = React.useState<PopupItem[]>([]);
  const current = queue[0];

  React.useEffect(() => {
    const l: Listener = (item) => setQueue((q) => [...q, item]);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const close = () => setQueue((q) => q.slice(1));

  if (!current) return null;
  const cfg = variantConfig[current.variant];
  const Icon = cfg.icon;

  return (
    <AlertDialog open onOpenChange={(o) => !o && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${cfg.color}`} />
            {cfg.title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1">
              <div className="text-foreground">{current.message}</div>
              {current.description && (
                <div className="text-sm text-muted-foreground">{current.description}</div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={close}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
