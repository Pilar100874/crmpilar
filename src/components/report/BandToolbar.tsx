import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

interface BandToolbarProps {
  onAddBand: (type: "report-header" | "page-header" | "data" | "page-footer" | "report-footer") => void;
}

export function BandToolbar({ onAddBand }: BandToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="default"
            className="h-10 px-4 rounded-xl transition-all hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Band
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onAddBand("report-header")}>
            Report Header
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddBand("page-header")}>
            Page Header
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddBand("data")}>
            Data Band
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddBand("page-footer")}>
            Page Footer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddBand("report-footer")}>
            Report Footer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
