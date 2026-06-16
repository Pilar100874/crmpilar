import { ReactNode, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";

/**
 * Wrapper that renders a clickable thumbnail and opens a zoomed dialog
 * showing the larger/full version. Shared across all workflow domains.
 */
export const WorkflowPreviewZoom = ({
  title,
  thumb,
  full,
}: {
  title: string;
  thumb: ReactNode;
  full?: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
            Pré-visualização
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            className="p-0.5 hover:bg-accent rounded transition-colors"
            title="Ampliar"
          >
            <Maximize2 className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        <div
          className="cursor-zoom-in"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          {thumb}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="pt-2">{full ?? thumb}</div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkflowPreviewZoom;
