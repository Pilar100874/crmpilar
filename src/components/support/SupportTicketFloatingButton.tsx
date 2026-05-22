import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LifeBuoy } from "lucide-react";
import { SupportTicketDialog } from "./SupportTicketDialog";

export function SupportTicketFloatingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="fixed top-3 right-4 z-50 shadow-md bg-background/95 backdrop-blur"
        aria-label="Abrir ticket de suporte"
      >
        <LifeBuoy className="h-4 w-4" />
        Suporte
      </Button>
      <SupportTicketDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
