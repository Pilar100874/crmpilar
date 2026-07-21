import { useState, cloneElement, ReactElement } from "react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface Props {
  onConfirm: () => void | Promise<any>;
  title?: string;
  description?: string;
  trigger: ReactElement;
}

export function DeleteConfirmTrigger({ onConfirm, title, description, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <>
      {cloneElement(trigger, { onClick: (e: any) => { e.stopPropagation?.(); setOpen(true); } })}
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        isLoading={loading}
        onConfirm={async () => {
          setLoading(true);
          try { await onConfirm(); } finally { setLoading(false); setOpen(false); }
        }}
      />
    </>
  );
}
