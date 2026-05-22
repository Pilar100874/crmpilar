import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";
import { SupportTicketDialog } from "./SupportTicketDialog";

export function SupportTicketFloatingButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-support-ticket", handler);
    return () => window.removeEventListener("open-support-ticket", handler);
  }, []);

  const hideButton = location.pathname.startsWith("/meus-tickets");

  return (
    <>
      {!hideButton && (
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="fixed top-3 right-4 z-50 shadow-md"
        aria-label="Abrir ticket de suporte"
      >
        <Ticket className="h-4 w-4" />
        Abrir Ticket
      </Button>
      )}
      <SupportTicketDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

