import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LifeBuoy } from "lucide-react";
import { SupportTicketDialog } from "./SupportTicketDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SupportTicketFloatingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            onClick={() => setOpen(true)}
            className="fixed bottom-6 left-6 z-50 h-12 w-12 rounded-full shadow-lg"
            variant="default"
            aria-label="Abrir ticket de suporte"
          >
            <LifeBuoy className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Suporte do sistema</TooltipContent>
      </Tooltip>
      <SupportTicketDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
