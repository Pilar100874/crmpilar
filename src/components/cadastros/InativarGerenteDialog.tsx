import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TransferenciaCarteira, transferirCarteira, type TransferenciaValor } from "./TransferenciaCarteira";

interface Props {
  gerente: { id: string; nome: string };
  onClose: () => void;
  onDone: () => void;
}

export function InativarGerenteDialog({ gerente, onClose, onDone }: Props) {
  const [valor, setValor] = useState<TransferenciaValor>({ novoGerenteId: null, novoVendedorId: null });
  const [qtd, setQtd] = useState(0);
  const [busy, setBusy] = useState(false);

  const confirmar = async () => {
    if (qtd > 0 && !valor.novoGerenteId) {
      toast.error("Selecione o novo gerente que vai assumir as empresas.");
      return;
    }
    setBusy(true);
    try {
      if (qtd > 0) await transferirCarteira("gerente", gerente.id, valor);
      else if (valor.novoGerenteId) {
        await supabase.from("gerente_vendedores").update({ gerente_usuario_id: valor.novoGerenteId } as any).eq("gerente_usuario_id", gerente.id);
      }
      const { error } = await supabase.rpc("inactivate_entity", { p_entity: "usuario", p_id: gerente.id });
      if (error) throw error;
      toast.success("Gerente inativado");
      onDone();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao inativar gerente");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Inativar gerente — {gerente.nome}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>Gerentes não são excluídos, apenas inativados. O usuário deixa de acessar o sistema e sai das listas de gerentes.</p>
              <TransferenciaCarteira tipo="gerente" id={gerente.id} valor={valor} onChange={setValor} onEmpresasCount={setQtd} />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={confirmar} disabled={busy || (qtd > 0 && !valor.novoGerenteId)}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
            Inativar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
